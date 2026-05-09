# Wedding Planner Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable wedding planners to manage multiple client weddings from a dedicated planner dashboard, while reusing all existing dashboard feature pages unchanged.

**Architecture:** Add `userType` (COUPLE/PLANNER) to User model, remove the `@unique` constraint on `Wedding.userId` so planners can own multiple weddings, add `clientName` to Wedding. Planners get a `/planner` overview route showing all their weddings. When they select a client wedding, we update their JWT `weddingId` — then all existing `/dashboard/*` pages and API routes work unchanged because they read `session.user.weddingId`. A wedding switcher in the sidebar lets planners jump between clients.

**Tech Stack:** Next.js 16 (App Router), Prisma v7, PostgreSQL, NextAuth JWT sessions, Tailwind CSS v4

**Key design reference:** Maida's mockups in `C:\Users\sydal\Downloads\Feedback from Maida\IMG_2533.jpeg` — planner overview with countdown, client list, stats, and client management panel.

---

## File Structure

### Schema & Types
- Modify: `prisma/schema.prisma` — add UserType enum, userType field on User, remove @unique from Wedding.userId, add clientName to Wedding
- Modify: `src/types/next-auth.d.ts` — add `userType` to JWT and Session types

### Auth & Middleware
- Modify: `src/lib/auth.ts` — include `userType` in JWT token and session
- Modify: `src/middleware.ts` — add `/planner` routing, handle planners without weddings
- Modify: `src/lib/plans.ts` — add planner plan tier detection helper

### API Routes
- Create: `src/app/api/planner/clients/route.ts` — GET (list weddings), POST (create client wedding)
- Create: `src/app/api/planner/clients/[id]/route.ts` — DELETE (remove client wedding), PATCH (update client details)
- Create: `src/app/api/planner/switch/route.ts` — POST (switch active wedding, updates JWT)
- Create: `src/app/api/planner/dashboard/route.ts` — GET (aggregated planner stats)

### Planner Pages
- Create: `src/app/planner/layout.tsx` — planner layout with PlannerSidebar
- Create: `src/app/planner/page.tsx` — planner overview dashboard
- Create: `src/app/planner/clients/page.tsx` — client management page (add/edit/delete)

### Components
- Create: `src/components/PlannerSidebar.tsx` — sidebar with wedding switcher + nav
- Modify: `src/components/Sidebar.tsx` — add wedding switcher for planners viewing /dashboard
- Modify: `src/components/TopHeader.tsx` — show active client name for planners

### Onboarding
- Modify: `src/app/onboarding/page.tsx` — save selected role to URL
- Modify: `src/app/onboarding/details/page.tsx` — different form for planners (business name instead of partners)
- Modify: `src/app/api/wedding/route.ts` — support POST without wedding for planner users
- Create: `src/app/api/user/type/route.ts` — PATCH endpoint to set userType during onboarding

---

## Task 1: Schema Changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add UserType enum and update User model**

Add the `UserType` enum and `userType` field to User. Remove `@unique` from `Wedding.userId`. Add `clientName` to Wedding.

```prisma
// Add after the CulturalStyle enum (line ~39)
enum UserType {
  COUPLE
  PLANNER
}
```

On the User model, add:
```prisma
  userType       UserType           @default(COUPLE)
```

On the Wedding model:
- Remove `@unique` from the `userId` field (change `String @unique` to `String`)
- Change the User relation from `wedding Wedding?` to `weddings Wedding[]`
- Add `clientName String?` field (used by planners to label the wedding, e.g. "Jessica & Daniel")

- [ ] **Step 2: Push schema to database**

Run: `npx prisma db push --accept-data-loss`

Expected: Schema synced, no errors. Existing wedding data preserved (all existing users default to COUPLE, clientName defaults to null).

- [ ] **Step 3: Regenerate Prisma client**

Run: `npx prisma generate`

- [ ] **Step 4: Fix compilation errors from schema change**

The relation changed from `wedding Wedding?` (1:1) to `weddings Wedding[]` (1:many). Update all code that references `user.wedding` to `user.weddings[0]` or use `findFirst` instead of relying on the unique relation.

Files to update:
- `src/lib/auth.ts` lines 29-30: change `include: { wedding: true }` to `include: { weddings: { take: 1 } }` and update `hasWedding: !!user.wedding` to `hasWedding: user.weddings.length > 0`, `weddingId: user.wedding?.id` to `weddingId: user.weddings[0]?.id`
- Same pattern for the JWT update trigger (lines 80-91)
- `src/app/api/wedding/route.ts` line 74: change `findUnique({ where: { userId } })` to `findFirst({ where: { userId } })` since userId is no longer unique on Wedding
- `src/app/api/wedding/route.ts` POST handler: remove the "already exists" check for planner users, or change it to only apply for COUPLE users

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/
git commit -m "feat: schema — add UserType, allow multiple weddings per user, add clientName"
```

---

## Task 2: Auth & Session — Add userType to JWT

**Files:**
- Modify: `src/types/next-auth.d.ts`
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Update NextAuth type declarations**

Add `userType` to both JWT and Session interfaces in `src/types/next-auth.d.ts`:

```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "USER" | "ADMIN";
      userType: "COUPLE" | "PLANNER";
      hasWedding: boolean;
      weddingId: string | null;
      plan: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "USER" | "ADMIN";
    userType: "COUPLE" | "PLANNER";
    hasWedding: boolean;
    weddingId: string | null;
    plan: string | null;
  }
}
```

- [ ] **Step 2: Update auth.ts — authorize callback**

In the `authorize` callback, include `userType` in the returned user object. Change the `include` to use `weddings` (array) instead of `wedding`:

```typescript
const user = await prisma.user.findUnique({
  where: { email },
  include: { subscription: true, weddings: { take: 1 } },
});
```

Return:
```typescript
return {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  userType: user.userType,
  hasWedding: user.weddings.length > 0,
  weddingId: user.weddings[0]?.id ?? null,
  plan: user.subscription?.plan ?? null,
};
```

- [ ] **Step 3: Update auth.ts — JWT callback**

Add `token.userType = u.userType` in the `if (user)` block.

In the `trigger === "update"` block, also refresh userType:
```typescript
token.userType = freshUser.userType as "COUPLE" | "PLANNER";
```

Also update the `weddings` fetch in the update trigger:
```typescript
const freshUser = await prisma.user.findUnique({
  where: { id: token.id },
  include: { subscription: true, weddings: { take: 1, orderBy: { updatedAt: 'desc' } } },
});
if (freshUser) {
  token.hasWedding = freshUser.weddings.length > 0;
  token.weddingId = freshUser.weddings[0]?.id ?? null;
  // ...existing fields...
}
```

- [ ] **Step 4: Update auth.ts — session callback**

Add `session.user.userType = token.userType;` in the session callback.

In the invalidated-user fallback (line 106), add `userType: "COUPLE" as const`.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 6: Commit**

```bash
git add src/types/next-auth.d.ts src/lib/auth.ts
git commit -m "feat: auth — add userType to JWT and session"
```

---

## Task 3: Middleware — Planner Routing

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Add planner route handling**

Update the middleware to:
1. Add `/planner/:path*` to the matcher
2. Planners accessing `/dashboard` without a selected wedding get redirected to `/planner`
3. Planners can access `/planner/*` routes
4. Couples accessing `/planner` get redirected to `/dashboard`

```typescript
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const FREE_PATHS = new Set([
  "/dashboard",
  "/dashboard/budget",
  "/dashboard/checklists",
  "/dashboard/settings",
  "/dashboard/subscription",
  "/dashboard/feedback",
  "/dashboard/coming-soon",
]);

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin routes - require ADMIN role
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Planner routes - only for planner users
    if (path.startsWith("/planner") && token?.userType !== "PLANNER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Dashboard routes for couples - redirect to onboarding if no wedding
    if (path.startsWith("/dashboard") && token?.userType !== "PLANNER" && !token?.hasWedding) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Dashboard routes for planners without a selected wedding - redirect to planner overview
    if (path.startsWith("/dashboard") && token?.userType === "PLANNER" && !token?.weddingId) {
      return NextResponse.redirect(new URL("/planner", req.url));
    }

    // Plan gating — free users can only access FREE_PATHS
    if (path.startsWith("/dashboard") && !FREE_PATHS.has(path) && !token?.plan) {
      return NextResponse.redirect(new URL("/dashboard/subscription", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token && !!token.id,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/onboarding", "/planner/:path*"],
};
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: middleware — add planner routing, handle wedding-less planners"
```

---

## Task 4: Onboarding — Save UserType

**Files:**
- Create: `src/app/api/user/type/route.ts`
- Modify: `src/app/onboarding/page.tsx`
- Modify: `src/app/onboarding/details/page.tsx`

- [ ] **Step 1: Create API endpoint to set userType**

Create `src/app/api/user/type/route.ts`:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/user/type");

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userType } = await req.json();

    if (!["COUPLE", "PLANNER"].includes(userType)) {
      return NextResponse.json({ error: "Invalid userType" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { userType },
    });

    log.info("User type updated", { userId: session.user.id, userType });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Failed to update user type", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to update user type" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update onboarding step 1 — save userType on continue**

In `src/app/onboarding/page.tsx`, update `handleContinue` to call the API before navigating:

```typescript
const handleContinue = async () => {
  if (!selectedRole) return;

  // Save user type to database
  await fetch("/api/user/type", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userType: selectedRole === "planner" ? "PLANNER" : "COUPLE",
    }),
  });

  if (selectedRole === "planner") {
    // Planners skip wedding details — go straight to plan selection
    router.push("/onboarding/plan");
  } else {
    router.push("/onboarding/details?role=couple");
  }
};
```

Update the step indicator: "Step 1 of 3" (already done) but now it's "Step 1 of 2" for planners, "Step 1 of 3" for couples. Simplest: just say "Step 1" without a total.

- [ ] **Step 3: Update onboarding details — redirect planners away**

In `src/app/onboarding/details/page.tsx`, add a check at the top of the component: if `role` query param is not present or is "planner", redirect to `/onboarding/plan`:

```typescript
// At the top of OnboardingDetailsForm, after existing hooks
useEffect(() => {
  if (role === "planner") {
    router.replace("/onboarding/plan");
  }
}, [role, router]);
```

- [ ] **Step 4: Update onboarding plan page — handle planner flow**

In `src/app/onboarding/plan/page.tsx`, update `handleSkip`:
- For planners (check session.user.userType after refreshing): redirect to `/planner`
- For couples: redirect to `/dashboard` (current behavior)

Add session update call before redirect:
```typescript
const handleSkip = async () => {
  await update(); // refresh JWT with new userType
  if (session?.user?.userType === "PLANNER") {
    window.location.href = "/planner";
  } else {
    window.location.href = "/dashboard";
  }
};
```

Same for the checkout success URL — planners should go to `/planner?welcome=true`.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/app/api/user/type/ src/app/onboarding/
git commit -m "feat: onboarding — save userType, planners skip wedding details"
```

---

## Task 5: Planner API Routes

**Files:**
- Create: `src/app/api/planner/clients/route.ts`
- Create: `src/app/api/planner/clients/[id]/route.ts`
- Create: `src/app/api/planner/switch/route.ts`
- Create: `src/app/api/planner/dashboard/route.ts`

- [ ] **Step 1: Create clients list + create endpoint**

Create `src/app/api/planner/clients/route.ts` with:

**GET** — return all weddings owned by this planner, ordered by wedding date:
```typescript
const weddings = await prisma.wedding.findMany({
  where: { userId: session.user.id },
  orderBy: { weddingDate: "asc" },
  include: {
    _count: { select: { guests: true, tasks: true, events: true, vendors: true } },
    budgetItems: { select: { estimatedCost: true, actualCost: true } },
  },
});
```

Return each wedding with: id, clientName, partnerName1, partnerName2, weddingDate, culturalStyle, totalBudget, spent (sum of actualCost), guest/task/event/vendor counts.

**POST** — create a new client wedding for this planner:
```typescript
const { clientName, partnerName1, partnerName2, weddingDate, culturalStyle, totalBudget } = await req.json();

// Validate required fields
if (!partnerName1 || !partnerName2) {
  return NextResponse.json({ error: "Partner names are required" }, { status: 400 });
}

const wedding = await prisma.wedding.create({
  data: {
    userId: session.user.id,
    clientName: clientName?.trim() || `${partnerName1} & ${partnerName2}`,
    partnerName1: partnerName1.trim(),
    partnerName2: partnerName2.trim(),
    weddingDate: weddingDate ? new Date(weddingDate) : null,
    culturalStyle: culturalStyle || "CLASSIC_ASIAN",
    totalBudget: totalBudget ?? 0,
  },
});
```

Both endpoints must verify `session.user.userType === "PLANNER"` (return 403 if not).

- [ ] **Step 2: Create client detail endpoint (PATCH + DELETE)**

Create `src/app/api/planner/clients/[id]/route.ts`:

**PATCH** — update clientName, partnerName1, partnerName2, weddingDate, culturalStyle, totalBudget. Must verify the wedding belongs to this planner (`where: { id, userId: session.user.id }`).

**DELETE** — delete the wedding and all associated data (cascading). Must verify ownership. If the deleted wedding was the planner's active `weddingId`, return a flag so the frontend can clear the selection.

- [ ] **Step 3: Create switch-wedding endpoint**

Create `src/app/api/planner/switch/route.ts`:

**POST** — takes `{ weddingId }`, verifies the wedding belongs to this planner, then returns success. The frontend will call `session.update()` to refresh the JWT. The JWT callback's `trigger === "update"` block needs to support accepting a specific weddingId.

Update `src/lib/auth.ts` JWT callback — in the `trigger === "update"` block, check if the session update includes a `weddingId` override:

```typescript
if (trigger === "update") {
  const freshUser = await prisma.user.findUnique({
    where: { id: token.id as string },
    include: { subscription: true, weddings: { take: 1, orderBy: { updatedAt: 'desc' } } },
  });
  if (freshUser) {
    token.userType = freshUser.userType as "COUPLE" | "PLANNER";
    token.hasWedding = freshUser.weddings.length > 0;
    token.weddingId = freshUser.weddings[0]?.id ?? null;
    token.plan = freshUser.subscription?.plan ?? null;
    token.role = freshUser.role as "USER" | "ADMIN";
    token._lastVerified = Date.now();
  }
}
```

For the wedding switch, the switch API will store the planner's selected wedding in the DB (add a `activeWeddingId` column to User, nullable) and the JWT callback reads it:

Actually, simpler: add `activeWeddingId String?` to the User model. When a planner switches weddings, update this field. The JWT callback reads it for planners:

```typescript
if (freshUser.userType === "PLANNER" && freshUser.activeWeddingId) {
  token.weddingId = freshUser.activeWeddingId;
  token.hasWedding = true;
} else {
  token.weddingId = freshUser.weddings[0]?.id ?? null;
  token.hasWedding = freshUser.weddings.length > 0;
}
```

This requires adding `activeWeddingId String?` to the User model in the schema (do this in Task 1 Step 1).

- [ ] **Step 4: Create planner dashboard stats endpoint**

Create `src/app/api/planner/dashboard/route.ts`:

**GET** — returns aggregated stats across all planner's weddings:
```typescript
const weddings = await prisma.wedding.findMany({
  where: { userId: session.user.id },
  include: {
    _count: { select: { guests: true, tasks: true } },
    tasks: { where: { status: { not: "DONE" } }, select: { id: true, title: true, dueDate: true, priority: true } },
    events: { where: { date: { gte: now } }, orderBy: { date: "asc" }, take: 3 },
  },
});
```

Return: totalClients, weddingsThisMonth, totalTasksDue (pending tasks), upcomingWeddings (sorted by date), recentTasks (across all weddings).

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/app/api/planner/ src/lib/auth.ts prisma/schema.prisma
git commit -m "feat: planner API routes — clients CRUD, switch wedding, dashboard stats"
```

---

## Task 6: Planner Sidebar Component

**Files:**
- Create: `src/components/PlannerSidebar.tsx`

- [ ] **Step 1: Create PlannerSidebar component**

Build the planner sidebar with:
- KnotBook logo at top
- User info (name, plan label)
- **Wedding Switcher**: dropdown showing all client weddings, with the active one highlighted. Selecting one calls the switch API then does `session.update()` + router refresh
- Nav items: Dashboard (→ /planner), Clients (→ /planner/clients), then a divider, then the standard dashboard nav items (but only shown when a wedding is selected)
- "Back to Overview" link when viewing a specific wedding's dashboard
- Logout button

The wedding switcher should show:
- Client name (or "Partner1 & Partner2")
- Wedding date (if set)
- A colored dot for status

Style: same classes and patterns as existing `Sidebar.tsx` — gold gradient icons, ghost-border cards, font-headline typography. Match the KnotBook aesthetic.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/PlannerSidebar.tsx
git commit -m "feat: PlannerSidebar component with wedding switcher"
```

---

## Task 7: Planner Layout & Overview Page

**Files:**
- Create: `src/app/planner/layout.tsx`
- Create: `src/app/planner/page.tsx`

- [ ] **Step 1: Create planner layout**

Create `src/app/planner/layout.tsx` — same structure as the dashboard layout but uses `PlannerSidebar` instead of `Sidebar`. Include the same floral decorations and TopHeader.

- [ ] **Step 2: Create planner overview page**

Create `src/app/planner/page.tsx` matching Maida's design (IMG_2533). Sections:

**Top row — Next Wedding Countdown:**
- Shows the nearest upcoming wedding date with a countdown (Days, Hours, Minutes, Seconds)
- Client name and "View Details" button
- Falls back to "No upcoming weddings" if none exist

**Stats Row — Quick Cards:**
- Total Clients
- Weddings This Month
- Tasks Due Soon
- Each card with gold-gradient icon, label, count

**Two-column layout below:**

Left column:
- **Tasks Due Soon** — list of upcoming tasks across all weddings with client name tags
- **Upcoming Weddings** — list of weddings with client photos/initials, date, budget, and status badge

Right column:
- **Client List** — compact cards for each client with status badge (Planning / Finalizing / Completed), clicking navigates to that wedding
- **Quick Actions** — "Add New Client" button

Fetch data from `GET /api/planner/dashboard`.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/app/planner/
git commit -m "feat: planner overview dashboard page with stats and client list"
```

---

## Task 8: Client Management Page

**Files:**
- Create: `src/app/planner/clients/page.tsx`

- [ ] **Step 1: Create client management page**

Build `/planner/clients` page with:

**Header:** "Client Management" title with "Add Client" button

**Add/Edit Client Modal:**
- Client Name (auto-generated from partner names)
- Partner 1 Name, Partner 2 Name
- Wedding Date
- Cultural Style (Classic British / Classic Asian / Arab)
- Estimated Budget
- Save / Cancel buttons

**Client Cards Grid:**
- Each card shows: client name, partner names, wedding date, budget, guest count, task count
- Status badge: Planning (amber), Finalizing (blue), Completed (green) — derived from wedding date proximity
- Actions: "Manage Wedding" (switches to this wedding + navigates to /dashboard), "Edit", "Delete"
- Delete requires a confirmation modal

Fetch data from `GET /api/planner/clients`.
Create via `POST /api/planner/clients`.
Update via `PATCH /api/planner/clients/[id]`.
Delete via `DELETE /api/planner/clients/[id]`.

"Manage Wedding" calls `POST /api/planner/switch` then `session.update()` then `router.push("/dashboard")`.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/planner/clients/
git commit -m "feat: client management page with add/edit/delete"
```

---

## Task 9: Sidebar Integration — Wedding Switcher for /dashboard

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/TopHeader.tsx`

- [ ] **Step 1: Add wedding switcher to existing Sidebar**

When a planner is viewing `/dashboard/*` pages, the existing Sidebar should show:
- A "Back to Planner" link at the very top (before the logo) that navigates to `/planner`
- The active client name below the logo
- The standard nav items (they already work because weddingId is set)

Check `session.user.userType === "PLANNER"` to conditionally render these elements.

- [ ] **Step 2: Update TopHeader to show active client**

In TopHeader, when `session.user.userType === "PLANNER"` and there's an active wedding, show the client name in the header bar: "Managing: Jessica & Daniel" with a breadcrumb-style indicator.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx src/components/TopHeader.tsx
git commit -m "feat: sidebar shows client context + back-to-planner link for planners"
```

---

## Task 10: Fix Wedding API for Multi-Wedding Support

**Files:**
- Modify: `src/app/api/wedding/route.ts`

- [ ] **Step 1: Update wedding API for multi-wedding users**

The existing `GET /api/wedding` uses `findUnique({ where: { userId } })` which won't work now that userId isn't unique on Wedding. Change to:

```typescript
// For the GET handler, use the weddingId from session
const weddingId = session.user.weddingId;
if (!weddingId) {
  return NextResponse.json({ error: "No wedding selected" }, { status: 404 });
}

const wedding = await prisma.wedding.findUnique({
  where: { id: weddingId },
  // ...existing include
});
```

Update the POST handler: for couples, keep the existing duplicate check (one wedding per couple). For planners, always allow creation (they use `/api/planner/clients` instead).

Update the PATCH handler: already uses `weddingId` from session — should work unchanged.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/wedding/route.ts
git commit -m "fix: wedding API uses weddingId from session instead of userId lookup"
```

---

## Task 11: Full Build & Integration Test

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: zero errors

- [ ] **Step 2: Run full build**

Run: `npm run build`
Expected: clean build, new `/planner` and `/planner/clients` routes appear in output

- [ ] **Step 3: Manual smoke test**

Test the following flows:
1. Sign up as couple → onboarding step 1 (select couple) → step 2 (wedding details) → step 3 (plan) → dashboard works as before
2. Sign up as planner → onboarding step 1 (select planner) → step 3 (plan, skips step 2) → planner dashboard
3. Planner creates a client wedding from /planner/clients
4. Planner switches to that wedding → /dashboard loads with all features
5. Planner clicks "Back to Planner" → returns to /planner overview
6. Existing couple users still work unchanged (regression check)

- [ ] **Step 4: Push to git**

```bash
git add -A
git commit -m "feat: planner dashboard — complete multi-wedding management system"
git push
```
