# KnotBook Email System Design

## Overview

Complete email system for KnotBook using **Resend** as the provider. HTML templates live in code, admin dashboard provides toggle/variable control. Includes supporting features: password reset flow, public RSVP page, and cron-ready reminder endpoints.

## Tech Decisions

- **Provider:** Resend SDK (`resend` npm package)
- **Templates:** TypeScript functions returning HTML strings (inline CSS for email compatibility)
- **Admin control:** Database-stored config (toggles, subject lines, sender name, reply-to) — NOT a WYSIWYG editor
- **Assets in emails:** Floral images hosted on knotbook.co.uk, referenced via absolute URLs
- **Email width:** 600px max (email standard), responsive with media queries

## Branding

All emails use consistent KnotBook branding:

- **Background:** `#fcf9f2` (cream/linen)
- **Primary accent:** `#d4af37` (gold)
- **Dark accent:** `#735c00` (dark gold)
- **Text:** `#1c1c18` (dark brown)
- **Muted text:** `#7f7663`
- **Headings:** Newsreader serif (with fallback: Georgia, Times New Roman, serif)
- **Body text:** Inter (with fallback: Helvetica, Arial, sans-serif)
- **CTA buttons:** Gold gradient (`#d4af37` to `#735c00`), white text, 8px border-radius

### Email Layout Structure

```
┌─────────────────────────────────┐
│  [KnotBook Logo]                │  Header: cream bg, centered logo
│  ═══ floral-divider.png ═══    │  Floral divider image
├─────────────────────────────────┤
│                                 │
│  Heading (Newsreader serif)     │  Body: white bg, 40px padding
│                                 │
│  Body text (Inter sans-serif)   │
│                                 │
│  ┌─────────────────────┐       │
│  │   CTA Button        │       │  Gold gradient button
│  └─────────────────────┘       │
│                                 │
├─────────────────────────────────┤
│  [floral-accent.png]           │  Footer: cream bg
│  KnotBook — Your Wedding,      │  Tagline + address
│  Your Way                       │  Unsubscribe link
│  knotbook.co.uk                 │
└─────────────────────────────────┘
```

## Email Templates (8 total)

### 1. Welcome Email
- **Slug:** `welcome`
- **Trigger:** User registers (after account creation in `/api/auth/register`)
- **Default subject:** `Welcome to KnotBook, {name}!`
- **Variables:** `{name}`, `{loginUrl}`
- **Content:** Welcome message, brief feature highlights (3-4 bullet points), CTA to login

### 2. Password Reset
- **Slug:** `password-reset`
- **Trigger:** User requests password reset via `/api/auth/forgot-password`
- **Default subject:** `Reset your KnotBook password`
- **Variables:** `{name}`, `{resetUrl}`, `{expiryTime}`
- **Content:** Reset instructions, CTA button with reset link, expiry warning (1 hour), "didn't request this?" note
- **Supporting feature needed:** Password reset token generation, `/reset-password/[token]` page

### 3. RSVP Confirmation
- **Slug:** `rsvp-confirmation`
- **Trigger:** Guest submits RSVP via public `/rsvp/[token]` page
- **Default subject:** `RSVP Confirmed — {coupleName}'s Wedding`
- **Variables:** `{guestName}`, `{coupleName}`, `{weddingDate}`, `{venue}`, `{rsvpStatus}`
- **Content:** Confirmation of RSVP status, event details summary, dietary preferences noted
- **Supporting feature needed:** Public RSVP page with unique guest token, guest email field in schema

### 4. Task Reminder
- **Slug:** `task-reminder`
- **Trigger:** Cron endpoint `/api/cron/task-reminders` (checks tasks due within 24/48 hours)
- **Default subject:** `Reminder: {taskName} is due {dueDate}`
- **Variables:** `{name}`, `{taskName}`, `{dueDate}`, `{priority}`, `{dashboardUrl}`
- **Content:** Task name, due date, priority badge, CTA to view in dashboard

### 5. Event Reminder
- **Slug:** `event-reminder`
- **Trigger:** Cron endpoint `/api/cron/event-reminders` (checks events within 7/1 days)
- **Default subject:** `Upcoming: {eventName} on {eventDate}`
- **Variables:** `{name}`, `{eventName}`, `{eventDate}`, `{eventTime}`, `{venue}`, `{dashboardUrl}`
- **Content:** Event details, venue/location, guest count, CTA to view timeline

### 6. Payment Receipt
- **Slug:** `payment-receipt`
- **Trigger:** Stripe webhook (future — template built now, sending wired later)
- **Default subject:** `Payment Confirmed — KnotBook {plan}`
- **Variables:** `{name}`, `{plan}`, `{amount}`, `{date}`, `{nextBillingDate}`
- **Content:** Payment amount, plan name, next billing date, manage subscription link

### 7. Budget Alert
- **Slug:** `budget-alert`
- **Trigger:** After budget item create/update, when total spend crosses 80%, 90%, or 100% of budget
- **Default subject:** `Budget Alert: {percentUsed}% of your wedding budget used`
- **Variables:** `{name}`, `{totalBudget}`, `{totalSpent}`, `{percentUsed}`, `{dashboardUrl}`
- **Content:** Progress bar visualization, spending summary, top categories, CTA to budget page

### 8. Vendor Payment Reminder
- **Slug:** `vendor-reminder`
- **Trigger:** Cron endpoint `/api/cron/vendor-reminders` (checks payments due within 7 days)
- **Default subject:** `Payment Due: {vendorName} — {amount}`
- **Variables:** `{name}`, `{vendorName}`, `{amount}`, `{dueDate}`, `{dashboardUrl}`
- **Content:** Vendor name, amount due, due date, payment status, CTA to vendors page

## Database Schema Changes

### New Models

```prisma
model EmailTemplate {
  id          String   @id @default(cuid())
  slug        String   @unique  // e.g. "welcome", "password-reset"
  name        String             // Display name: "Welcome Email"
  description String             // What this email does
  subjectLine String             // Subject with {variable} placeholders
  senderName  String   @default("KnotBook")
  replyTo     String   @default("")
  enabled     Boolean  @default(true)
  variables   Json     @default("[]")  // Available placeholder names
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  logs        EmailLog[]
}

model EmailLog {
  id             String   @id @default(cuid())
  templateSlug   String
  template       EmailTemplate @relation(fields: [templateSlug], references: [slug])
  recipientEmail String
  recipientName  String   @default("")
  subject        String
  status         EmailStatus @default(SENT)
  error          String?
  metadata       Json     @default("{}")
  sentAt         DateTime @default(now())
}

enum EmailStatus {
  SENT
  FAILED
  BOUNCED
}
```

### Schema Modifications

```prisma
// Add to User model:
  resetToken       String?   @unique
  resetTokenExpiry DateTime?

// Add to Guest model:
  email     String?
  rsvpToken String?  @unique
```

## Supporting Features

### 1. Password Reset Flow

**New API routes:**
- `POST /api/auth/forgot-password` — accepts email, generates reset token (crypto.randomUUID), stores hashed token + 1hr expiry on User, sends password-reset email
- `POST /api/auth/reset-password` — accepts token + new password, validates token not expired, updates password, clears token

**New page:**
- `/reset-password/[token]` — form with new password + confirm password fields, calls reset-password API

**Login page update:**
- Add "Forgot password?" link below login form

### 2. Public RSVP Page

**New API routes:**
- `GET /api/rsvp/[token]` — returns guest details + wedding/event info (no auth required)
- `POST /api/rsvp/[token]` — updates guest RSVP status, dietary info, plus ones; sends confirmation email

**New page:**
- `/rsvp/[token]` — public page (no login), shows wedding details, RSVP form with:
  - Attendance confirmation (Accept/Decline)
  - Dietary requirements
  - Plus one details
  - Special requests/notes
- Branded with KnotBook styling (floral decorations, gold accents)

**Guest management update:**
- Generate unique rsvpToken when guest is created
- Show "Copy RSVP Link" button on guest list page
- Add email field to guest creation form

### 3. Cron-Ready Reminder Endpoints

**New API routes (secured with API key header):**
- `GET /api/cron/task-reminders` — finds tasks due within 24hrs, sends reminders to task owners
- `GET /api/cron/event-reminders` — finds events within 7 days and 1 day, sends reminders
- `GET /api/cron/vendor-reminders` — finds vendor payments due within 7 days, sends reminders

**Security:** These endpoints check for `Authorization: Bearer {CRON_SECRET}` header to prevent unauthorized triggering.

### 4. Budget Alert Integration

- After budget item create/update in `/api/budget`, calculate total spend vs wedding budget
- If crosses 80%, 90%, or 100% threshold, send budget-alert email
- Track which thresholds have been alerted (prevent duplicate alerts) via metadata on Wedding model

## Admin Panel — `/admin/emails`

### Template List View
- Table with columns: Name, Subject Line, Status (Enabled/Disabled toggle), Last Sent, Total Sent
- Each row has "Configure" and "Preview" buttons
- Top stats: Total emails sent, delivery rate, active templates count

### Configure Modal (per template)
- **Subject Line** — text input with variable chips shown below (clickable to insert)
- **Sender Name** — text input (default: "KnotBook")
- **Reply-To** — email input
- **Enabled/Disabled** — toggle switch
- **Available Variables** — read-only list showing what placeholders work in this template
- Save / Cancel buttons

### Preview Panel
- Renders the email template with sample data
- Shows both desktop (600px) and mobile preview
- "Send Test Email" button — sends to logged-in admin's email address

### Email Log View
- Filterable table: template, recipient, status, date
- Status badges: SENT (green), FAILED (red), BOUNCED (orange)
- Pagination (20 per page)
- Quick stats per template

## Email Service Architecture

```
src/lib/email/
  ├── resend.ts          # Resend client initialization
  ├── send.ts            # Main sendEmail() function (checks template enabled, logs, sends)
  ├── templates/
  │   ├── base.ts        # Shared layout (header, footer, styles)
  │   ├── welcome.ts
  │   ├── password-reset.ts
  │   ├── rsvp-confirmation.ts
  │   ├── task-reminder.ts
  │   ├── event-reminder.ts
  │   ├── payment-receipt.ts
  │   ├── budget-alert.ts
  │   └── vendor-reminder.ts
  └── types.ts           # TypeScript types for template variables
```

### sendEmail() Flow

1. Look up EmailTemplate config by slug
2. If `enabled === false`, return early (no-op)
3. Render HTML using template function + variables
4. Replace `{variable}` placeholders in subject line
5. Call Resend API with rendered HTML, configured subject/sender/replyTo
6. Create EmailLog entry (SENT or FAILED)
7. Return result

## Environment Variables

```
RESEND_API_KEY=re_xxxx          # Resend API key
EMAIL_FROM=hello@knotbook.co.uk # Default from address
CRON_SECRET=xxxx                # Secret for cron endpoint auth
NEXT_PUBLIC_APP_URL=https://knotbook.co.uk  # For absolute URLs in emails
```

## What Gets Deferred

- **Payment Receipt sending** — template built, wired up when Stripe is integrated
- **Render cron job config** — endpoints built and tested, cron scheduling is a Render dashboard config step
- **Bounce/delivery webhooks** — Resend can POST delivery status; can add later for EmailLog updates
