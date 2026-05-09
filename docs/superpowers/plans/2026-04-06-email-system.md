# KnotBook Email System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete email system with 8 branded templates, admin management panel, password reset flow, public RSVP page, and cron-ready reminder endpoints.

**Architecture:** Resend SDK sends emails via TypeScript template functions that produce inline-CSS HTML strings. Admin controls (toggles, subject lines, sender name) are stored in PostgreSQL via Prisma. A central `sendEmail()` function checks the template's enabled state, renders HTML, sends via Resend, and logs the result.

**Tech Stack:** Resend SDK, Next.js 16 API routes, Prisma 7, TypeScript, Tailwind CSS v4, inline CSS for email HTML

---

## File Structure

```
src/lib/email/
  resend.ts              — Resend client singleton
  send.ts                — sendEmail() orchestrator
  types.ts               — TypeScript types for all template variables
  templates/
    base.ts              — Shared email layout (header, footer, styles)
    welcome.ts           — Welcome email
    password-reset.ts    — Password reset email
    rsvp-confirmation.ts — RSVP confirmation email
    task-reminder.ts     — Task due reminder
    event-reminder.ts    — Event reminder
    payment-receipt.ts   — Payment receipt (Stripe future)
    budget-alert.ts      — Budget threshold alert
    vendor-reminder.ts   — Vendor payment reminder

src/app/api/auth/forgot-password/route.ts   — Generate reset token + send email
src/app/api/auth/reset-password/route.ts    — Validate token + update password
src/app/api/rsvp/[token]/route.ts           — Public RSVP GET + POST
src/app/api/admin/emails/route.ts           — List + seed templates
src/app/api/admin/emails/[slug]/route.ts    — Update template config
src/app/api/admin/emails/[slug]/test/route.ts — Send test email
src/app/api/admin/emails/logs/route.ts      — Email log listing
src/app/api/cron/task-reminders/route.ts    — Task reminder cron
src/app/api/cron/event-reminders/route.ts   — Event reminder cron
src/app/api/cron/vendor-reminders/route.ts  — Vendor payment reminder cron

src/app/reset-password/[token]/page.tsx     — Password reset form
src/app/rsvp/[token]/page.tsx               — Public RSVP page

src/app/admin/emails/page.tsx               — Admin email management
```

---

### Task 1: Install Resend + Update Prisma Schema

**Files:**
- Modify: `package.json`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Install Resend SDK**

```bash
cd "/c/Users/sydal/Desktop/Custom Projects/knotbook"
npm install resend
```

- [ ] **Step 2: Add EmailTemplate, EmailLog models and schema updates to `prisma/schema.prisma`**

Add after the existing `ExportType` enum:

```prisma
enum EmailStatus {
  SENT
  FAILED
  BOUNCED
}
```

Add after the `Export` model at the end of the file:

```prisma
// ─── Email System ────────────────────────────────────────

model EmailTemplate {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String
  subjectLine String
  senderName  String   @default("KnotBook")
  replyTo     String   @default("")
  enabled     Boolean  @default(true)
  variables   Json     @default("[]")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  logs        EmailLog[]

  @@index([slug])
}

model EmailLog {
  id             String        @id @default(cuid())
  templateSlug   String
  template       EmailTemplate @relation(fields: [templateSlug], references: [slug])
  recipientEmail String
  recipientName  String        @default("")
  subject        String
  status         EmailStatus   @default(SENT)
  error          String?
  metadata       Json          @default("{}")
  sentAt         DateTime      @default(now())

  @@index([templateSlug])
  @@index([sentAt])
}
```

Add these fields to the existing `User` model (after `updatedAt`):

```prisma
  resetToken       String?   @unique
  resetTokenExpiry DateTime?
```

Add this field to the existing `Guest` model (after `email`):

```prisma
  rsvpToken String? @unique
```

Add this field to the existing `Wedding` model (after `notes`):

```prisma
  budgetAlertsSent Json @default("[]")
```

- [ ] **Step 3: Push schema changes to database**

```bash
npx prisma db push
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 5: Verify build still works**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json prisma/schema.prisma
git commit -m "feat: add Resend SDK + email system schema (EmailTemplate, EmailLog, reset tokens, RSVP tokens)"
```

---

### Task 2: Email Service Core — Resend Client, Types, Base Template

**Files:**
- Create: `src/lib/email/resend.ts`
- Create: `src/lib/email/types.ts`
- Create: `src/lib/email/templates/base.ts`
- Create: `src/lib/email/send.ts`

- [ ] **Step 1: Create Resend client singleton at `src/lib/email/resend.ts`**

```typescript
import { Resend } from "resend";

const globalForResend = globalThis as unknown as {
  resend: Resend | undefined;
};

export const resend =
  globalForResend.resend ?? new Resend(process.env.RESEND_API_KEY);

if (process.env.NODE_ENV !== "production") globalForResend.resend = resend;
```

- [ ] **Step 2: Create type definitions at `src/lib/email/types.ts`**

```typescript
export interface WelcomeVars {
  name: string;
  loginUrl: string;
}

export interface PasswordResetVars {
  name: string;
  resetUrl: string;
  expiryTime: string;
}

export interface RsvpConfirmationVars {
  guestName: string;
  coupleName: string;
  weddingDate: string;
  venue: string;
  rsvpStatus: string;
}

export interface TaskReminderVars {
  name: string;
  taskName: string;
  dueDate: string;
  priority: string;
  dashboardUrl: string;
}

export interface EventReminderVars {
  name: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  dashboardUrl: string;
}

export interface PaymentReceiptVars {
  name: string;
  plan: string;
  amount: string;
  date: string;
  nextBillingDate: string;
}

export interface BudgetAlertVars {
  name: string;
  totalBudget: string;
  totalSpent: string;
  percentUsed: string;
  dashboardUrl: string;
}

export interface VendorReminderVars {
  name: string;
  vendorName: string;
  amount: string;
  dueDate: string;
  dashboardUrl: string;
}

export type TemplateVars =
  | WelcomeVars
  | PasswordResetVars
  | RsvpConfirmationVars
  | TaskReminderVars
  | EventReminderVars
  | PaymentReceiptVars
  | BudgetAlertVars
  | VendorReminderVars;

export type TemplateSlug =
  | "welcome"
  | "password-reset"
  | "rsvp-confirmation"
  | "task-reminder"
  | "event-reminder"
  | "payment-receipt"
  | "budget-alert"
  | "vendor-reminder";

export interface SendEmailOptions {
  to: string;
  slug: TemplateSlug;
  variables: Record<string, string>;
  recipientName?: string;
}
```

- [ ] **Step 3: Create shared email layout at `src/lib/email/templates/base.ts`**

This is the branded wrapper used by all templates. Uses inline CSS only (email client compatibility). References floral assets via absolute URLs on knotbook.co.uk.

```typescript
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk";

export function emailLayout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KnotBook</title>
</head>
<body style="margin:0;padding:0;background-color:#fcf9f2;font-family:Inter,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fcf9f2;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:30px 40px 10px;">
              <img src="${APP_URL}/images/knotbook-logo-full.png" alt="KnotBook" width="180" style="display:block;height:auto;" />
            </td>
          </tr>

          <!-- Floral Divider -->
          <tr>
            <td align="center" style="padding:10px 60px 20px;">
              <img src="${APP_URL}/images/floral-divider.png" alt="" width="300" style="display:block;height:auto;opacity:0.6;" />
            </td>
          </tr>

          <!-- Body Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;border:1px solid rgba(127,118,99,0.15);">
                <tr>
                  <td style="padding:40px;">
                    ${bodyContent}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:30px 40px 10px;">
              <img src="${APP_URL}/images/floral-accent.png" alt="" width="50" style="display:block;height:auto;opacity:0.5;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 40px 30px;">
              <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:#735c00;">
                KnotBook &mdash; Your Wedding, Your Way
              </p>
              <p style="margin:0;font-size:12px;color:#7f7663;">
                <a href="${APP_URL}" style="color:#7f7663;text-decoration:underline;">knotbook.co.uk</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#1c1c18;line-height:1.3;">${text}</h1>`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1c1c18;">${text}</p>`;
}

export function mutedText(text: string): string {
  return `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#7f7663;">${text}</p>`;
}

export function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center" style="background:linear-gradient(135deg,#d4af37 0%,#735c00 100%);border-radius:8px;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.5px;text-transform:uppercase;">${text}</a>
    </td>
  </tr>
</table>`;
}

export function dividerLine(): string {
  return `<hr style="border:none;border-top:1px solid rgba(127,118,99,0.15);margin:24px 0;" />`;
}

export function infoRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:6px 0;font-size:13px;color:#7f7663;width:140px;vertical-align:top;">${label}</td>
  <td style="padding:6px 0;font-size:14px;color:#1c1c18;font-weight:500;">${value}</td>
</tr>`;
}

export function infoTable(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}</table>`;
}

export function priorityBadge(priority: string): string {
  const colors: Record<string, { bg: string; text: string }> = {
    HIGH: { bg: "#ffdad6", text: "#ba1a1a" },
    MEDIUM: { bg: "#fff3cd", text: "#735c00" },
    LOW: { bg: "#d6f5d6", text: "#2c5f2d" },
  };
  const c = colors[priority] || colors.MEDIUM;
  return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${c.bg};color:${c.text};text-transform:uppercase;letter-spacing:0.5px;">${priority}</span>`;
}
```

- [ ] **Step 4: Create the main sendEmail orchestrator at `src/lib/email/send.ts`**

```typescript
import { resend } from "./resend";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import type { SendEmailOptions, TemplateSlug } from "./types";

// Template renderer imports
import { renderWelcome } from "./templates/welcome";
import { renderPasswordReset } from "./templates/password-reset";
import { renderRsvpConfirmation } from "./templates/rsvp-confirmation";
import { renderTaskReminder } from "./templates/task-reminder";
import { renderEventReminder } from "./templates/event-reminder";
import { renderPaymentReceipt } from "./templates/payment-receipt";
import { renderBudgetAlert } from "./templates/budget-alert";
import { renderVendorReminder } from "./templates/vendor-reminder";

const log = createLogger("email");

const renderers: Record<TemplateSlug, (vars: Record<string, string>) => string> = {
  "welcome": renderWelcome,
  "password-reset": renderPasswordReset,
  "rsvp-confirmation": renderRsvpConfirmation,
  "task-reminder": renderTaskReminder,
  "event-reminder": renderEventReminder,
  "payment-receipt": renderPaymentReceipt,
  "budget-alert": renderBudgetAlert,
  "vendor-reminder": renderVendorReminder,
};

function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

const EMAIL_FROM = process.env.EMAIL_FROM || "hello@knotbook.co.uk";

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const { to, slug, variables, recipientName } = options;

  try {
    // 1. Look up template config
    const template = await prisma.emailTemplate.findUnique({
      where: { slug },
    });

    if (!template) {
      log.error("Email template not found", { slug });
      return { success: false, error: `Template "${slug}" not found` };
    }

    // 2. Check if enabled
    if (!template.enabled) {
      log.info("Email template disabled, skipping", { slug, to });
      return { success: true }; // Silent skip, not an error
    }

    // 3. Render HTML
    const renderer = renderers[slug];
    if (!renderer) {
      log.error("No renderer for template", { slug });
      return { success: false, error: `No renderer for "${slug}"` };
    }
    const html = renderer(variables);

    // 4. Build subject with variable replacement
    const subject = replaceVariables(template.subjectLine, variables);

    // 5. Send via Resend
    const fromAddress = template.senderName
      ? `${template.senderName} <${EMAIL_FROM}>`
      : EMAIL_FROM;

    const { error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      replyTo: template.replyTo || undefined,
    });

    if (error) {
      log.error("Resend API error", { slug, to, error: error.message });

      await prisma.emailLog.create({
        data: {
          templateSlug: slug,
          recipientEmail: to,
          recipientName: recipientName || "",
          subject,
          status: "FAILED",
          error: error.message,
        },
      });

      return { success: false, error: error.message };
    }

    // 6. Log success
    await prisma.emailLog.create({
      data: {
        templateSlug: slug,
        recipientEmail: to,
        recipientName: recipientName || "",
        subject,
        status: "SENT",
      },
    });

    log.info("Email sent successfully", { slug, to });
    return { success: true };
  } catch (err) {
    const message = (err as Error).message;
    log.error("Failed to send email", { slug, to, error: message });

    try {
      await prisma.emailLog.create({
        data: {
          templateSlug: slug,
          recipientEmail: to,
          recipientName: recipientName || "",
          subject: slug,
          status: "FAILED",
          error: message,
        },
      });
    } catch {
      // Don't fail if logging fails
    }

    return { success: false, error: message };
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/
git commit -m "feat: email service core — Resend client, types, base template, send orchestrator"
```

---

### Task 3: Email Templates (All 8)

**Files:**
- Create: `src/lib/email/templates/welcome.ts`
- Create: `src/lib/email/templates/password-reset.ts`
- Create: `src/lib/email/templates/rsvp-confirmation.ts`
- Create: `src/lib/email/templates/task-reminder.ts`
- Create: `src/lib/email/templates/event-reminder.ts`
- Create: `src/lib/email/templates/payment-receipt.ts`
- Create: `src/lib/email/templates/budget-alert.ts`
- Create: `src/lib/email/templates/vendor-reminder.ts`

- [ ] **Step 1: Create `src/lib/email/templates/welcome.ts`**

```typescript
import { emailLayout, heading, paragraph, ctaButton, mutedText } from "./base";

export function renderWelcome(vars: Record<string, string>): string {
  const body = `
    ${heading(`Welcome to KnotBook, ${vars.name}!`)}
    ${paragraph("We're thrilled to have you join KnotBook — your personal wedding planning sanctuary. Everything you need to plan your perfect day is right at your fingertips.")}
    ${paragraph("Here's what you can do:")}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr><td style="padding:4px 0 4px 8px;font-size:14px;color:#1c1c18;">&#10024; Manage your guest list &amp; RSVPs</td></tr>
      <tr><td style="padding:4px 0 4px 8px;font-size:14px;color:#1c1c18;">&#128176; Track your wedding budget</td></tr>
      <tr><td style="padding:4px 0 4px 8px;font-size:14px;color:#1c1c18;">&#128197; Plan your timeline &amp; events</td></tr>
      <tr><td style="padding:4px 0 4px 8px;font-size:14px;color:#1c1c18;">&#127860; Coordinate vendors &amp; seating</td></tr>
    </table>
    ${ctaButton("Start Planning", vars.loginUrl)}
    ${mutedText("If you didn't create this account, you can safely ignore this email.")}
  `;
  return emailLayout(body);
}
```

- [ ] **Step 2: Create `src/lib/email/templates/password-reset.ts`**

```typescript
import { emailLayout, heading, paragraph, ctaButton, mutedText, dividerLine } from "./base";

export function renderPasswordReset(vars: Record<string, string>): string {
  const body = `
    ${heading("Reset Your Password")}
    ${paragraph(`Hi ${vars.name}, we received a request to reset your KnotBook password. Click the button below to create a new password.`)}
    ${ctaButton("Reset Password", vars.resetUrl)}
    ${mutedText(`This link will expire in ${vars.expiryTime}. After that, you'll need to request a new one.`)}
    ${dividerLine()}
    ${mutedText("If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.")}
  `;
  return emailLayout(body);
}
```

- [ ] **Step 3: Create `src/lib/email/templates/rsvp-confirmation.ts`**

```typescript
import { emailLayout, heading, paragraph, mutedText, dividerLine, infoTable, infoRow } from "./base";

export function renderRsvpConfirmation(vars: Record<string, string>): string {
  const statusText = vars.rsvpStatus === "ATTENDING"
    ? "We're delighted to confirm your attendance!"
    : "We've noted that you won't be able to attend.";

  const statusColor = vars.rsvpStatus === "ATTENDING" ? "#2c5f2d" : "#ba1a1a";
  const statusLabel = vars.rsvpStatus === "ATTENDING" ? "Attending" : "Unable to Attend";

  const body = `
    ${heading("RSVP Confirmed")}
    ${paragraph(`Dear ${vars.guestName}, thank you for responding to ${vars.coupleName}'s wedding invitation.`)}
    <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:${statusColor};">${statusText}</p>
    ${dividerLine()}
    ${infoTable(
      infoRow("Your Response", `<span style="color:${statusColor};font-weight:600;">${statusLabel}</span>`) +
      infoRow("Wedding", vars.coupleName) +
      infoRow("Date", vars.weddingDate) +
      infoRow("Venue", vars.venue)
    )}
    ${dividerLine()}
    ${mutedText("If you need to change your response, please use the same RSVP link you received or contact the couple directly.")}
  `;
  return emailLayout(body);
}
```

- [ ] **Step 4: Create `src/lib/email/templates/task-reminder.ts`**

```typescript
import { emailLayout, heading, paragraph, ctaButton, dividerLine, infoTable, infoRow, priorityBadge } from "./base";

export function renderTaskReminder(vars: Record<string, string>): string {
  const body = `
    ${heading("Task Reminder")}
    ${paragraph(`Hi ${vars.name}, you have an upcoming task that needs your attention.`)}
    ${infoTable(
      infoRow("Task", `<strong>${vars.taskName}</strong>`) +
      infoRow("Due Date", vars.dueDate) +
      infoRow("Priority", priorityBadge(vars.priority))
    )}
    ${dividerLine()}
    ${ctaButton("View in Dashboard", vars.dashboardUrl)}
  `;
  return emailLayout(body);
}
```

- [ ] **Step 5: Create `src/lib/email/templates/event-reminder.ts`**

```typescript
import { emailLayout, heading, paragraph, ctaButton, dividerLine, infoTable, infoRow } from "./base";

export function renderEventReminder(vars: Record<string, string>): string {
  const body = `
    ${heading("Upcoming Event")}
    ${paragraph(`Hi ${vars.name}, just a reminder about an upcoming event in your wedding timeline.`)}
    ${infoTable(
      infoRow("Event", `<strong>${vars.eventName}</strong>`) +
      infoRow("Date", vars.eventDate) +
      infoRow("Time", vars.eventTime) +
      infoRow("Venue", vars.venue)
    )}
    ${dividerLine()}
    ${ctaButton("View Timeline", vars.dashboardUrl)}
  `;
  return emailLayout(body);
}
```

- [ ] **Step 6: Create `src/lib/email/templates/payment-receipt.ts`**

```typescript
import { emailLayout, heading, paragraph, mutedText, dividerLine, infoTable, infoRow } from "./base";

export function renderPaymentReceipt(vars: Record<string, string>): string {
  const body = `
    ${heading("Payment Confirmed")}
    ${paragraph(`Hi ${vars.name}, thank you for your payment. Here's your receipt.`)}
    ${infoTable(
      infoRow("Plan", `<strong>KnotBook ${vars.plan}</strong>`) +
      infoRow("Amount", `<strong>${vars.amount}</strong>`) +
      infoRow("Date", vars.date) +
      infoRow("Next Billing", vars.nextBillingDate)
    )}
    ${dividerLine()}
    ${mutedText("You can manage your subscription from the Settings page in your dashboard.")}
  `;
  return emailLayout(body);
}
```

- [ ] **Step 7: Create `src/lib/email/templates/budget-alert.ts`**

```typescript
import { emailLayout, heading, paragraph, ctaButton, dividerLine } from "./base";

export function renderBudgetAlert(vars: Record<string, string>): string {
  const percent = parseInt(vars.percentUsed) || 0;
  const barColor = percent >= 100 ? "#ba1a1a" : percent >= 90 ? "#e65100" : "#d4af37";

  const body = `
    ${heading("Budget Alert")}
    ${paragraph(`Hi ${vars.name}, your wedding spending has reached <strong>${vars.percentUsed}%</strong> of your total budget.`)}

    <!-- Progress Bar -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 24px;">
      <tr>
        <td>
          <div style="background:#f0ece4;border-radius:8px;height:24px;overflow:hidden;">
            <div style="background:${barColor};height:24px;border-radius:8px;width:${Math.min(percent, 100)}%;text-align:center;line-height:24px;font-size:11px;color:#fff;font-weight:700;">${vars.percentUsed}%</div>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#7f7663;">Spent: <strong style="color:#1c1c18;">${vars.totalSpent}</strong></td>
              <td align="right" style="font-size:13px;color:#7f7663;">Budget: <strong style="color:#1c1c18;">${vars.totalBudget}</strong></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${dividerLine()}
    ${ctaButton("Review Budget", vars.dashboardUrl)}
  `;
  return emailLayout(body);
}
```

- [ ] **Step 8: Create `src/lib/email/templates/vendor-reminder.ts`**

```typescript
import { emailLayout, heading, paragraph, ctaButton, dividerLine, infoTable, infoRow } from "./base";

export function renderVendorReminder(vars: Record<string, string>): string {
  const body = `
    ${heading("Vendor Payment Reminder")}
    ${paragraph(`Hi ${vars.name}, you have an upcoming vendor payment due soon.`)}
    ${infoTable(
      infoRow("Vendor", `<strong>${vars.vendorName}</strong>`) +
      infoRow("Amount Due", `<strong>${vars.amount}</strong>`) +
      infoRow("Due Date", vars.dueDate)
    )}
    ${dividerLine()}
    ${ctaButton("View Vendors", vars.dashboardUrl)}
  `;
  return emailLayout(body);
}
```

- [ ] **Step 9: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/lib/email/templates/
git commit -m "feat: add all 8 branded email templates with floral design"
```

---

### Task 4: Admin Email API Routes + Template Seeding

**Files:**
- Create: `src/app/api/admin/emails/route.ts`
- Create: `src/app/api/admin/emails/[slug]/route.ts`
- Create: `src/app/api/admin/emails/[slug]/test/route.ts`
- Create: `src/app/api/admin/emails/logs/route.ts`

- [ ] **Step 1: Create `src/app/api/admin/emails/route.ts`** — Lists all templates, auto-seeds if empty

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/emails");

const DEFAULT_TEMPLATES = [
  {
    slug: "welcome",
    name: "Welcome Email",
    description: "Sent when a new user registers",
    subjectLine: "Welcome to KnotBook, {name}!",
    variables: ["name", "loginUrl"],
  },
  {
    slug: "password-reset",
    name: "Password Reset",
    description: "Sent when a user requests a password reset",
    subjectLine: "Reset your KnotBook password",
    variables: ["name", "resetUrl", "expiryTime"],
  },
  {
    slug: "rsvp-confirmation",
    name: "RSVP Confirmation",
    description: "Sent when a guest submits their RSVP",
    subjectLine: "RSVP Confirmed — {coupleName}'s Wedding",
    variables: ["guestName", "coupleName", "weddingDate", "venue", "rsvpStatus"],
  },
  {
    slug: "task-reminder",
    name: "Task Reminder",
    description: "Sent when a task is due within 24 hours",
    subjectLine: "Reminder: {taskName} is due {dueDate}",
    variables: ["name", "taskName", "dueDate", "priority", "dashboardUrl"],
  },
  {
    slug: "event-reminder",
    name: "Event Reminder",
    description: "Sent before upcoming wedding events",
    subjectLine: "Upcoming: {eventName} on {eventDate}",
    variables: ["name", "eventName", "eventDate", "eventTime", "venue", "dashboardUrl"],
  },
  {
    slug: "payment-receipt",
    name: "Payment Receipt",
    description: "Sent after a subscription payment is confirmed",
    subjectLine: "Payment Confirmed — KnotBook {plan}",
    variables: ["name", "plan", "amount", "date", "nextBillingDate"],
  },
  {
    slug: "budget-alert",
    name: "Budget Alert",
    description: "Sent when wedding spending crosses threshold (80%, 90%, 100%)",
    subjectLine: "Budget Alert: {percentUsed}% of your wedding budget used",
    variables: ["name", "totalBudget", "totalSpent", "percentUsed", "dashboardUrl"],
  },
  {
    slug: "vendor-reminder",
    name: "Vendor Payment Reminder",
    description: "Sent when a vendor payment is due within 7 days",
    subjectLine: "Payment Due: {vendorName} — {amount}",
    variables: ["name", "vendorName", "amount", "dueDate", "dashboardUrl"],
  },
];

async function seedTemplates() {
  const existing = await prisma.emailTemplate.count();
  if (existing > 0) return;

  log.info("Seeding email templates");
  for (const t of DEFAULT_TEMPLATES) {
    await prisma.emailTemplate.create({
      data: {
        slug: t.slug,
        name: t.name,
        description: t.description,
        subjectLine: t.subjectLine,
        variables: t.variables,
      },
    });
  }
  log.info("Email templates seeded", { count: DEFAULT_TEMPLATES.length });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-seed templates on first load
    await seedTemplates();

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { slug: "asc" },
      include: {
        _count: { select: { logs: true } },
      },
    });

    // Get total stats
    const totalSent = await prisma.emailLog.count({ where: { status: "SENT" } });
    const totalFailed = await prisma.emailLog.count({ where: { status: "FAILED" } });

    // Get last sent date per template
    const templatesWithStats = await Promise.all(
      templates.map(async (t) => {
        const lastLog = await prisma.emailLog.findFirst({
          where: { templateSlug: t.slug, status: "SENT" },
          orderBy: { sentAt: "desc" },
          select: { sentAt: true },
        });
        return {
          ...t,
          totalSent: t._count.logs,
          lastSentAt: lastLog?.sentAt || null,
        };
      })
    );

    log.info("Fetched email templates", { count: templates.length });

    return NextResponse.json({
      templates: templatesWithStats,
      stats: { totalSent, totalFailed, deliveryRate: totalSent + totalFailed > 0 ? Math.round((totalSent / (totalSent + totalFailed)) * 100) : 100 },
    });
  } catch (err) {
    log.error("Failed to fetch email templates", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to fetch email templates" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `src/app/api/admin/emails/[slug]/route.ts`** — PATCH to update template config

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/emails/[slug]");

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const template = await prisma.emailTemplate.findUnique({ where: { slug } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (err) {
    log.error("Failed to fetch template", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const body = await req.json();
    const { subjectLine, senderName, replyTo, enabled } = body;

    const template = await prisma.emailTemplate.findUnique({ where: { slug } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const updated = await prisma.emailTemplate.update({
      where: { slug },
      data: {
        ...(subjectLine !== undefined && { subjectLine }),
        ...(senderName !== undefined && { senderName }),
        ...(replyTo !== undefined && { replyTo }),
        ...(enabled !== undefined && { enabled }),
      },
    });

    log.info("Email template updated", { slug, changes: Object.keys(body) });
    return NextResponse.json(updated);
  } catch (err) {
    log.error("Failed to update template", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create `src/app/api/admin/emails/[slug]/test/route.ts`** — Send test email to admin

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import type { TemplateSlug } from "@/lib/email/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/emails/test");

const SAMPLE_DATA: Record<string, Record<string, string>> = {
  "welcome": { name: "Sarah", loginUrl: "https://knotbook.co.uk/login" },
  "password-reset": { name: "Sarah", resetUrl: "https://knotbook.co.uk/reset-password/sample-token", expiryTime: "1 hour" },
  "rsvp-confirmation": { guestName: "James Smith", coupleName: "Sarah & Ahmed", weddingDate: "15 August 2026", venue: "The Grand Ballroom, London", rsvpStatus: "ATTENDING" },
  "task-reminder": { name: "Sarah", taskName: "Finalise seating chart", dueDate: "10 April 2026", priority: "HIGH", dashboardUrl: "https://knotbook.co.uk/dashboard/tasks" },
  "event-reminder": { name: "Sarah", eventName: "Mehndi Night", eventDate: "12 August 2026", eventTime: "6:00 PM", venue: "Rose Garden Marquee", dashboardUrl: "https://knotbook.co.uk/dashboard/timeline" },
  "payment-receipt": { name: "Sarah", plan: "Lifetime", amount: "£49.99", date: "6 April 2026", nextBillingDate: "N/A — Lifetime plan" },
  "budget-alert": { name: "Sarah", totalBudget: "£25,000", totalSpent: "£22,500", percentUsed: "90", dashboardUrl: "https://knotbook.co.uk/dashboard/budget" },
  "vendor-reminder": { name: "Sarah", vendorName: "Elegance Catering", amount: "£3,500", dueDate: "15 April 2026", dashboardUrl: "https://knotbook.co.uk/dashboard/vendors" },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const sampleVars = SAMPLE_DATA[slug];
    if (!sampleVars) {
      return NextResponse.json({ error: "Unknown template slug" }, { status: 400 });
    }

    const result = await sendEmail({
      to: session.user.email!,
      slug: slug as TemplateSlug,
      variables: sampleVars,
      recipientName: session.user.name || "Admin",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    log.info("Test email sent", { slug, to: session.user.email });
    return NextResponse.json({ message: "Test email sent to " + session.user.email });
  } catch (err) {
    log.error("Failed to send test email", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create `src/app/api/admin/emails/logs/route.ts`** — Email log listing with filters

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/emails/logs");

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const templateSlug = searchParams.get("template") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (templateSlug) where.templateSlug = templateSlug;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip,
        take: limit,
        include: {
          template: { select: { name: true } },
        },
      }),
      prisma.emailLog.count({ where }),
    ]);

    log.info("Fetched email logs", { count: logs.length, page });

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    log.error("Failed to fetch email logs", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to fetch email logs" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/emails/
git commit -m "feat: admin email API routes — list, update, test send, logs"
```

---

### Task 5: Admin Emails Page + Sidebar Link

**Files:**
- Create: `src/app/admin/emails/page.tsx`
- Modify: `src/components/AdminSidebar.tsx`

- [ ] **Step 1: Add "Emails" to AdminSidebar nav items**

In `src/components/AdminSidebar.tsx`, change the `navItems` array from:

```typescript
const navItems = [
  { icon: "dashboard", label: "Dashboard", href: "/admin" },
  { icon: "group", label: "Users", href: "/admin/users" },
];
```

to:

```typescript
const navItems = [
  { icon: "dashboard", label: "Dashboard", href: "/admin" },
  { icon: "group", label: "Users", href: "/admin/users" },
  { icon: "mail", label: "Emails", href: "/admin/emails" },
];
```

- [ ] **Step 2: Create `src/app/admin/emails/page.tsx`**

This is the full admin email management page with template list, configure modal, preview, and email log tab. The complete code follows the admin page pattern from `src/app/admin/page.tsx`.

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/* ─── Types ─── */

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  description: string;
  subjectLine: string;
  senderName: string;
  replyTo: string;
  enabled: boolean;
  variables: string[];
  totalSent: number;
  lastSentAt: string | null;
}

interface EmailLog {
  id: string;
  templateSlug: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  status: "SENT" | "FAILED" | "BOUNCED";
  error: string | null;
  sentAt: string;
  template: { name: string };
}

interface Stats {
  totalSent: number;
  totalFailed: number;
  deliveryRate: number;
}

/* ─── Helpers ─── */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ICON_MAP: Record<string, string> = {
  "welcome": "waving_hand",
  "password-reset": "lock_reset",
  "rsvp-confirmation": "how_to_reg",
  "task-reminder": "task_alt",
  "event-reminder": "event",
  "payment-receipt": "receipt_long",
  "budget-alert": "account_balance_wallet",
  "vendor-reminder": "storefront",
};

/* ─── Skeleton ─── */

function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center px-6">
        <div className="w-32 h-6 bg-surface-container rounded animate-pulse" />
      </header>
      <main className="flex-1 p-6 bg-background">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-container-lowest rounded-2xl p-5 ghost-border h-28 animate-pulse" />
            ))}
          </div>
          <div className="bg-surface-container-lowest rounded-2xl ghost-border h-96 animate-pulse" />
        </div>
      </main>
    </div>
  );
}

/* ─── Component ─── */

export default function AdminEmailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [stats, setStats] = useState<Stats>({ totalSent: 0, totalFailed: 0, deliveryRate: 100 });
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logPagination, setLogPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"templates" | "logs">("templates");
  const [configModal, setConfigModal] = useState<EmailTemplate | null>(null);
  const [editForm, setEditForm] = useState({ subjectLine: "", senderName: "", replyTo: "" });
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });

  const [logFilter, setLogFilter] = useState<string>("");
  const [logStatusFilter, setLogStatusFilter] = useState<string>("");

  // Redirect non-admin
  useEffect(() => {
    if (session && session.user.role !== "ADMIN") router.push("/dashboard");
  }, [session, router]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/emails");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTemplates(data.templates);
      setStats(data.stats);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (logFilter) params.set("template", logFilter);
      if (logStatusFilter) params.set("status", logStatusFilter);
      const res = await fetch(`/api/admin/emails/logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data.logs);
      setLogPagination(data.pagination);
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }, [logFilter, logStatusFilter, showToast]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchTemplates();
    }
  }, [status, session, fetchTemplates]);

  useEffect(() => {
    if (activeTab === "logs") fetchLogs();
  }, [activeTab, fetchLogs]);

  // Toggle template enabled/disabled
  async function handleToggle(slug: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/admin/emails/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setTemplates((prev) => prev.map((t) => (t.slug === slug ? { ...t, enabled } : t)));
      showToast(`${enabled ? "Enabled" : "Disabled"} template`, "success");
    } catch {
      showToast("Failed to update template", "error");
    }
  }

  // Open config modal
  function openConfig(template: EmailTemplate) {
    setEditForm({
      subjectLine: template.subjectLine,
      senderName: template.senderName,
      replyTo: template.replyTo,
    });
    setConfigModal(template);
  }

  // Save config
  async function handleSaveConfig() {
    if (!configModal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/emails/${configModal.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setTemplates((prev) => prev.map((t) => (t.slug === configModal.slug ? { ...t, ...updated } : t)));
      setConfigModal(null);
      showToast("Template updated", "success");
    } catch {
      showToast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  }

  // Send test email
  async function handleSendTest(slug: string) {
    setSendingTest(slug);
    try {
      const res = await fetch(`/api/admin/emails/${slug}/test`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      showToast(data.message, "success");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSendingTest(null);
    }
  }

  if (status === "loading" || loading) return <LoadingSkeleton />;
  if (!session || session.user.role !== "ADMIN") return null;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-surface-container-lowest rounded-2xl p-8 ghost-border text-center max-w-md">
          <span className="material-symbols-outlined text-error text-4xl mb-3">error</span>
          <h2 className="font-headline text-lg text-on-surface mb-2">Failed to load email data</h2>
          <p className="text-sm font-label text-on-surface-variant mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors cursor-pointer">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 page-enter">
      {/* Header */}
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center justify-between px-6 sticky top-0 z-30">
        <h1 className="font-headline text-xl text-on-surface">Email Templates</h1>
        <div className="flex gap-2">
          {(["templates", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-label font-medium transition-colors cursor-pointer ${activeTab === tab ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}
            >
              {tab === "templates" ? "Templates" : "Email Log"}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 p-6 bg-background overflow-y-auto">
        <div className="max-w-[1400px] mx-auto space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Emails Sent", value: stats.totalSent.toLocaleString(), icon: "send" },
              { label: "Delivery Rate", value: `${stats.deliveryRate}%`, icon: "verified" },
              { label: "Active Templates", value: templates.filter((t) => t.enabled).length + "/" + templates.length, icon: "toggle_on" },
            ].map((m) => (
              <div key={m.label} className="bg-surface-container-lowest rounded-2xl p-5 ghost-border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="material-symbols-outlined text-primary/50 text-2xl">{m.icon}</span>
                </div>
                <p className="font-headline text-3xl text-on-surface">{m.value}</p>
                <p className="text-xs font-label text-on-surface-variant mt-1 uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/20">
                <h2 className="font-headline text-lg text-on-surface">All Templates</h2>
                <p className="text-xs font-label text-on-surface-variant mt-0.5">Manage email templates, toggle them on/off, and customise subject lines</p>
              </div>

              <div className="divide-y divide-outline-variant/10">
                {templates.map((t) => (
                  <div key={t.slug} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-container-low/30 transition-colors">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-xl">{ICON_MAP[t.slug] || "mail"}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-label font-medium text-on-surface">{t.name}</p>
                      <p className="text-xs font-label text-on-surface-variant truncate">{t.description}</p>
                      <p className="text-[11px] font-label text-on-surface-variant/70 mt-0.5">
                        Subject: <span className="text-on-surface-variant">{t.subjectLine}</span>
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:block text-right shrink-0 w-24">
                      <p className="text-sm font-label font-medium text-on-surface">{t.totalSent}</p>
                      <p className="text-[11px] font-label text-on-surface-variant">sent</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(t.slug, !t.enabled)}
                        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${t.enabled ? "bg-primary" : "bg-surface-container"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${t.enabled ? "left-[22px]" : "left-0.5"}`} />
                      </button>

                      {/* Configure */}
                      <button onClick={() => openConfig(t)} className="p-2 rounded-lg hover:bg-surface-container transition-colors cursor-pointer" title="Configure">
                        <span className="material-symbols-outlined text-on-surface-variant text-xl">settings</span>
                      </button>

                      {/* Send Test */}
                      <button
                        onClick={() => handleSendTest(t.slug)}
                        disabled={sendingTest === t.slug}
                        className="p-2 rounded-lg hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
                        title="Send test email"
                      >
                        <span className={`material-symbols-outlined text-on-surface-variant text-xl ${sendingTest === t.slug ? "animate-spin" : ""}`}>
                          {sendingTest === t.slug ? "progress_activity" : "send"}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === "logs" && (
            <div className="bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-headline text-lg text-on-surface">Email Log</h2>
                  <p className="text-xs font-label text-on-surface-variant mt-0.5">Recent email activity</p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="text-sm font-label bg-surface-container border-0 rounded-lg px-3 py-1.5 text-on-surface cursor-pointer"
                  >
                    <option value="">All templates</option>
                    {templates.map((t) => (
                      <option key={t.slug} value={t.slug}>{t.name}</option>
                    ))}
                  </select>
                  <select
                    value={logStatusFilter}
                    onChange={(e) => setLogStatusFilter(e.target.value)}
                    className="text-sm font-label bg-surface-container border-0 rounded-lg px-3 py-1.5 text-on-surface cursor-pointer"
                  >
                    <option value="">All statuses</option>
                    <option value="SENT">Sent</option>
                    <option value="FAILED">Failed</option>
                    <option value="BOUNCED">Bounced</option>
                  </select>
                </div>
              </div>

              {logs.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <span className="material-symbols-outlined text-on-surface-variant/30 text-5xl mb-3 block">inbox</span>
                  <p className="text-sm font-label text-on-surface-variant">No emails sent yet</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-outline-variant/15">
                          {["Template", "Recipient", "Subject", "Status", "Date"].map((h) => (
                            <th key={h} className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors">
                            <td className="px-6 py-3 text-sm font-label text-on-surface">{log.template.name}</td>
                            <td className="px-6 py-3">
                              <p className="text-sm font-label text-on-surface">{log.recipientName || "—"}</p>
                              <p className="text-xs font-label text-on-surface-variant">{log.recipientEmail}</p>
                            </td>
                            <td className="px-6 py-3 text-sm font-label text-on-surface-variant max-w-[200px] truncate">{log.subject}</td>
                            <td className="px-6 py-3">
                              <span className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${
                                log.status === "SENT" ? "bg-green-100 text-green-700" :
                                log.status === "FAILED" ? "bg-red-100 text-red-700" :
                                "bg-orange-100 text-orange-700"
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm font-label text-on-surface-variant">{formatDate(log.sentAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {logPagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-outline-variant/20 flex items-center justify-between">
                      <p className="text-xs font-label text-on-surface-variant">
                        Page {logPagination.page} of {logPagination.totalPages} ({logPagination.total} total)
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => fetchLogs(logPagination.page - 1)}
                          disabled={logPagination.page <= 1}
                          className="px-3 py-1.5 rounded-lg text-sm font-label bg-surface-container hover:bg-surface-container-high transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => fetchLogs(logPagination.page + 1)}
                          disabled={logPagination.page >= logPagination.totalPages}
                          className="px-3 py-1.5 rounded-lg text-sm font-label bg-surface-container hover:bg-surface-container-high transition-colors disabled:opacity-30 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Configure Modal */}
      {configModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setConfigModal(null)}>
          <div className="bg-surface-container-lowest rounded-2xl ghost-border w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <div>
                <h3 className="font-headline text-lg text-on-surface">{configModal.name}</h3>
                <p className="text-xs font-label text-on-surface-variant">{configModal.description}</p>
              </div>
              <button onClick={() => setConfigModal(null)} className="p-1 rounded-lg hover:bg-surface-container transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Subject Line */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Subject Line</label>
                <input
                  type="text"
                  value={editForm.subjectLine}
                  onChange={(e) => setEditForm({ ...editForm, subjectLine: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(configModal.variables as string[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setEditForm({ ...editForm, subjectLine: editForm.subjectLine + `{${v}}` })}
                      className="text-[11px] font-label px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      {`{${v}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sender Name */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Sender Name</label>
                <input
                  type="text"
                  value={editForm.senderName}
                  onChange={(e) => setEditForm({ ...editForm, senderName: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="KnotBook"
                />
              </div>

              {/* Reply-To */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Reply-To Address</label>
                <input
                  type="email"
                  value={editForm.replyTo}
                  onChange={(e) => setEditForm({ ...editForm, replyTo: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="Optional"
                />
              </div>

              {/* Available Variables */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Available Variables</label>
                <div className="flex flex-wrap gap-2">
                  {(configModal.variables as string[]).map((v) => (
                    <span key={v} className="text-xs font-label px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
                      {`{${v}}`}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/20">
              <button onClick={() => setConfigModal(null)} className="px-4 py-2 rounded-xl text-sm font-label font-medium text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {saving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.visible && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-label font-medium animate-fade-in-up ${
          toast.type === "success" ? "bg-green-800 text-white" : "bg-red-800 text-white"
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/emails/ src/components/AdminSidebar.tsx
git commit -m "feat: admin email management page with template controls, preview, and log"
```

---

### Task 6: Password Reset Flow

**Files:**
- Create: `src/app/api/auth/forgot-password/route.ts`
- Create: `src/app/api/auth/reset-password/route.ts`
- Create: `src/app/reset-password/[token]/page.tsx`
- Modify: `src/app/login/page.tsx` (wire up forgot password button)

- [ ] **Step 1: Create `src/app/api/auth/forgot-password/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/auth/forgot-password");

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Always return success to prevent email enumeration
    if (!user) {
      log.info("Password reset requested for non-existent email", { email: normalizedEmail });
      return NextResponse.json({ message: "If an account exists with that email, we've sent a reset link." });
    }

    // Generate reset token
    const resetToken = randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // Send reset email
    await sendEmail({
      to: user.email,
      slug: "password-reset",
      variables: {
        name: user.name,
        resetUrl: `${APP_URL}/reset-password/${resetToken}`,
        expiryTime: "1 hour",
      },
      recipientName: user.name,
    });

    log.info("Password reset email sent", { userId: user.id });

    return NextResponse.json({ message: "If an account exists with that email, we've sent a reset link." });
  } catch (err) {
    log.error("Forgot password failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `src/app/api/auth/reset-password/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/auth/reset-password");

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset link. Please request a new one." }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    log.info("Password reset successfully", { userId: user.id });

    return NextResponse.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    log.error("Password reset failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create `src/app/reset-password/[token]/page.tsx`**

```typescript
"use client";

import { useState, FormEvent, use } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const passwordsMatch = !confirmPassword || !password || password === confirmPassword;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen linen-texture flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/knotbook-logo-hq.png" alt="KnotBook" className="h-28 w-auto mx-auto mb-4" />
        </div>

        <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-8 animate-fade-in-up">
          {success ? (
            <div className="text-center">
              <span className="material-symbols-outlined text-green-600 text-5xl mb-4 block">check_circle</span>
              <h2 className="font-headline text-2xl text-on-surface mb-2">Password Reset!</h2>
              <p className="text-on-surface-variant text-sm">Your password has been changed successfully. Redirecting to login...</p>
            </div>
          ) : (
            <>
              <h2 className="font-headline text-2xl text-on-surface text-center mb-1">Reset Password</h2>
              <p className="text-on-surface-variant text-sm text-center mb-8">Enter your new password below</p>

              {error && (
                <div className="mb-6 p-3 rounded-xl bg-error-container/20 border border-error/20 text-error text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="password" className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      minLength={8}
                      disabled={loading}
                      className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 pr-10 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 bottom-2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    minLength={8}
                    disabled={loading}
                    className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                  />
                  {!passwordsMatch && (
                    <p className="text-error text-xs mt-1.5 font-label">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!passwordsMatch || loading}
                  className="w-full gold-gradient text-on-primary font-label text-sm uppercase tracking-widest py-3.5 rounded-xl hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover-glow flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading && <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>}
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire up "Forgot password?" button in `src/app/login/page.tsx`**

Change the existing placeholder button (lines 221-226) from:

```typescript
              {!isSignUp && (
                <div className="flex justify-end">
                  <button type="button" className="text-primary text-xs font-label hover:underline cursor-pointer">
                    Forgot password?
                  </button>
                </div>
              )}
```

to a working forgot-password flow with a small inline form:

```typescript
              {!isSignUp && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        setError("Enter your email address first, then click Forgot password");
                        return;
                      }
                      setError("");
                      setLoading(true);
                      try {
                        const res = await fetch("/api/auth/forgot-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email }),
                        });
                        const data = await res.json();
                        setError(data.message || "Check your email for a reset link.");
                      } catch {
                        setError("Something went wrong. Please try again.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-primary text-xs font-label hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/auth/forgot-password/ src/app/api/auth/reset-password/ src/app/reset-password/ src/app/login/page.tsx
git commit -m "feat: password reset flow — forgot password, reset page, email integration"
```

---

### Task 7: Public RSVP Page + Guest Token Generation

**Files:**
- Create: `src/app/api/rsvp/[token]/route.ts`
- Create: `src/app/rsvp/[token]/page.tsx`
- Modify: `src/app/api/guests/route.ts` (generate rsvpToken on create)
- Modify: `src/app/dashboard/guests/page.tsx` (add "Copy RSVP Link" button)

- [ ] **Step 1: Create `src/app/api/rsvp/[token]/route.ts`** — Public API, no auth required

```typescript
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/rsvp");

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const guest = await prisma.guest.findUnique({
      where: { rsvpToken: token },
      include: {
        wedding: {
          select: {
            partnerName1: true,
            partnerName2: true,
            weddingDate: true,
            venue: true,
            culturalStyle: true,
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Invalid RSVP link" }, { status: 404 });
    }

    return NextResponse.json({
      guestName: guest.name,
      rsvpStatus: guest.rsvpStatus,
      dietaryType: guest.dietaryType,
      allergies: guest.allergies,
      mealPreference: guest.mealPreference,
      plusOne: guest.plusOne,
      plusOneName: guest.plusOneName,
      notes: guest.notes,
      wedding: {
        coupleName: `${guest.wedding.partnerName1} & ${guest.wedding.partnerName2}`,
        weddingDate: guest.wedding.weddingDate,
        venue: guest.wedding.venue,
        culturalStyle: guest.wedding.culturalStyle,
      },
    });
  } catch (err) {
    log.error("Failed to fetch RSVP data", { error: (err as Error).message });
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { rsvpStatus, dietaryType, allergies, mealPreference, plusOneName, notes } = body;

    const guest = await prisma.guest.findUnique({
      where: { rsvpToken: token },
      include: {
        wedding: {
          select: {
            partnerName1: true,
            partnerName2: true,
            weddingDate: true,
            venue: true,
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Invalid RSVP link" }, { status: 404 });
    }

    const updated = await prisma.guest.update({
      where: { rsvpToken: token },
      data: {
        rsvpStatus: rsvpStatus || guest.rsvpStatus,
        dietaryType: dietaryType ?? guest.dietaryType,
        allergies: allergies ?? guest.allergies,
        mealPreference: mealPreference ?? guest.mealPreference,
        plusOneName: plusOneName ?? guest.plusOneName,
        notes: notes ?? guest.notes,
      },
    });

    // Send confirmation email if guest has an email
    if (guest.email) {
      const coupleName = `${guest.wedding.partnerName1} & ${guest.wedding.partnerName2}`;
      const weddingDate = guest.wedding.weddingDate
        ? new Date(guest.wedding.weddingDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : "Date TBC";

      await sendEmail({
        to: guest.email,
        slug: "rsvp-confirmation",
        variables: {
          guestName: guest.name,
          coupleName,
          weddingDate,
          venue: guest.wedding.venue || "Venue TBC",
          rsvpStatus: rsvpStatus || guest.rsvpStatus,
        },
        recipientName: guest.name,
      });
    }

    log.info("RSVP submitted", { guestId: guest.id, rsvpStatus: updated.rsvpStatus });

    return NextResponse.json({ message: "RSVP submitted successfully", rsvpStatus: updated.rsvpStatus });
  } catch (err) {
    log.error("RSVP submission failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `src/app/rsvp/[token]/page.tsx`** — Branded public RSVP page

```typescript
"use client";

import { useState, useEffect, use, FormEvent } from "react";

interface RsvpData {
  guestName: string;
  rsvpStatus: string;
  dietaryType: string | null;
  allergies: string | null;
  mealPreference: string | null;
  plusOne: boolean;
  plusOneName: string | null;
  notes: string | null;
  wedding: {
    coupleName: string;
    weddingDate: string | null;
    venue: string | null;
    culturalStyle: string;
  };
}

export default function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [data, setData] = useState<RsvpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [rsvpStatus, setRsvpStatus] = useState("ATTENDING");
  const [dietaryType, setDietaryType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [mealPreference, setMealPreference] = useState("");
  const [plusOneName, setPlusOneName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function fetchRsvp() {
      try {
        const res = await fetch(`/api/rsvp/${token}`);
        if (!res.ok) {
          setError(res.status === 404 ? "This RSVP link is not valid." : "Something went wrong.");
          setLoading(false);
          return;
        }
        const json = await res.json();
        setData(json);
        setRsvpStatus(json.rsvpStatus === "NO_RESPONSE" ? "ATTENDING" : json.rsvpStatus);
        setDietaryType(json.dietaryType || "");
        setAllergies(json.allergies || "");
        setMealPreference(json.mealPreference || "");
        setPlusOneName(json.plusOneName || "");
        setNotes(json.notes || "");
      } catch {
        setError("Failed to load RSVP details.");
      } finally {
        setLoading(false);
      }
    }
    fetchRsvp();
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/rsvp/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpStatus, dietaryType, allergies, mealPreference, plusOneName, notes }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to submit RSVP");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const weddingDate = data?.wedding.weddingDate
    ? new Date(data.wedding.weddingDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : null;

  if (loading) {
    return (
      <div className="min-h-screen linen-texture flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen linen-texture flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/knotbook-logo-hq.png" alt="KnotBook" className="h-20 w-auto mx-auto mb-6" />
          <span className="material-symbols-outlined text-error text-5xl mb-3 block">link_off</span>
          <h1 className="font-headline text-2xl text-on-surface mb-2">Invalid RSVP Link</h1>
          <p className="text-on-surface-variant text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen linen-texture relative overflow-hidden">
      {/* Floral decorations */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/floral-corner.png" alt="" className="absolute top-0 left-0 w-40 opacity-20 pointer-events-none" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/floral-corner.png" alt="" className="absolute top-0 right-0 w-40 opacity-20 pointer-events-none" style={{ transform: "scaleX(-1)" }} />

      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/knotbook-logo-hq.png" alt="KnotBook" className="h-16 w-auto mx-auto mb-4" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/floral-divider.png" alt="" className="w-64 mx-auto opacity-50 mb-6" />
          <p className="text-[10px] uppercase tracking-[0.3em] font-label text-on-surface-variant mb-2">You&apos;re Invited</p>
          <h1 className="font-headline text-3xl text-on-surface">{data.wedding.coupleName}</h1>
          {weddingDate && <p className="font-headline italic text-primary mt-2 text-lg">{weddingDate}</p>}
          {data.wedding.venue && <p className="text-on-surface-variant text-sm mt-1">{data.wedding.venue}</p>}
        </div>

        {submitted ? (
          <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-8 text-center animate-fade-in-up">
            <span className="material-symbols-outlined text-green-600 text-5xl mb-4 block">celebration</span>
            <h2 className="font-headline text-2xl text-on-surface mb-2">
              {rsvpStatus === "ATTENDING" ? "See You There!" : "Response Recorded"}
            </h2>
            <p className="text-on-surface-variant text-sm">
              {rsvpStatus === "ATTENDING"
                ? `Thank you, ${data.guestName}! We can't wait to celebrate with you.`
                : `Thank you for letting us know, ${data.guestName}. We'll miss you!`}
            </p>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-8 animate-fade-in-up">
            <h2 className="font-headline text-xl text-on-surface text-center mb-1">
              Dear {data.guestName}
            </h2>
            <p className="text-on-surface-variant text-sm text-center mb-8">
              Please let us know if you can attend
            </p>

            {error && (
              <div className="mb-6 p-3 rounded-xl bg-error-container/20 border border-error/20 text-error text-sm text-center">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* RSVP Status */}
              <div className="flex gap-3">
                {[
                  { value: "ATTENDING", label: "Joyfully Accept", icon: "favorite" },
                  { value: "NOT_COMING", label: "Regretfully Decline", icon: "heart_broken" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRsvpStatus(opt.value)}
                    className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      rsvpStatus === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-outline-variant/30 hover:border-outline-variant/60"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${rsvpStatus === opt.value ? "text-primary" : "text-on-surface-variant"}`}>
                      {opt.icon}
                    </span>
                    <span className={`text-sm font-label font-medium ${rsvpStatus === opt.value ? "text-primary" : "text-on-surface-variant"}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>

              {rsvpStatus === "ATTENDING" && (
                <>
                  {/* Dietary */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Dietary Requirements</label>
                    <select
                      value={dietaryType}
                      onChange={(e) => setDietaryType(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm focus:outline-none focus:border-primary transition-colors cursor-pointer"
                    >
                      <option value="">No specific requirements</option>
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Vegan">Vegan</option>
                      <option value="Halal">Halal</option>
                      <option value="Kosher">Kosher</option>
                      <option value="Gluten-Free">Gluten-Free</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Allergies */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Allergies</label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="e.g. Nuts, shellfish, dairy"
                      className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Meal Preference */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Meal Preference</label>
                    <input
                      type="text"
                      value={mealPreference}
                      onChange={(e) => setMealPreference(e.target.value)}
                      placeholder="e.g. Chicken, fish, lamb"
                      className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Plus One */}
                  {data.plusOne && (
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Plus One Name</label>
                      <input
                        type="text"
                        value={plusOneName}
                        onChange={(e) => setPlusOneName(e.target.value)}
                        placeholder="Name of your guest"
                        className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">Message to the Couple (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any special requests or a note for the couple"
                  className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full gold-gradient text-on-primary font-label text-sm uppercase tracking-widest py-3.5 rounded-xl hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover-glow flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting && <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>}
                {submitting ? "Submitting..." : "Submit RSVP"}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/floral-accent.png" alt="" className="w-12 mx-auto opacity-40 mb-3" />
          <p className="font-headline italic text-on-surface-variant/60 text-xs">Powered by KnotBook</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `src/app/api/guests/route.ts`** — Generate rsvpToken on guest creation

In the POST handler, add `import { randomUUID } from "crypto";` at the top of the file (after existing imports).

Then in the `prisma.guest.create` data object, add the `rsvpToken` field:

Change `data` in the `prisma.guest.create` call from:

```typescript
        tableId: tableId || null,
```

to:

```typescript
        tableId: tableId || null,
        rsvpToken: randomUUID(),
```

- [ ] **Step 4: Update `src/app/dashboard/guests/page.tsx`** — Add rsvpToken to Guest interface and "Copy RSVP Link" button

Add `rsvpToken` to the `Guest` interface:

```typescript
interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  familySide: FamilySide;
  rsvpStatus: RsvpStatus;
  mealPreference: string | null;
  dietaryType: string | null;
  allergies: string | null;
  plusOne: boolean;
  plusOneName: string | null;
  notes: string | null;
  rsvpToken: string | null;
}
```

Then find the guest action buttons in the table/card view and add a "Copy RSVP Link" button. Look for the edit/delete action buttons per guest row and add before them:

```typescript
{guest.rsvpToken && (
  <button
    onClick={() => {
      navigator.clipboard.writeText(`${window.location.origin}/rsvp/${guest.rsvpToken}`);
      showToast("RSVP link copied!", "success");
    }}
    className="p-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
    title="Copy RSVP Link"
  >
    <span className="material-symbols-outlined text-on-surface-variant text-lg">link</span>
  </button>
)}
```

Note: The exact placement will depend on how the action buttons are laid out in the guest list — find the edit/delete buttons for each guest row and add this button adjacent to them.

- [ ] **Step 5: Also add `rsvpToken` to the select in the guests API GET** — make sure the response includes it

The current `prisma.guest.findMany` doesn't use `select`, so it already returns all fields including the new `rsvpToken`. No change needed.

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/rsvp/ src/app/rsvp/ src/app/api/guests/route.ts src/app/dashboard/guests/page.tsx
git commit -m "feat: public RSVP page with branded design, token generation, copy link button"
```

---

### Task 8: Wire Up Email Triggers (Welcome + Budget Alert)

**Files:**
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/app/api/budget/route.ts`

- [ ] **Step 1: Add welcome email to register route**

In `src/app/api/auth/register/route.ts`, add import at the top:

```typescript
import { sendEmail } from "@/lib/email/send";
```

Then after the line `log.info("User registered successfully", ...)` and before the `return NextResponse.json(...)`, add:

```typescript
    // Send welcome email (non-blocking — don't fail registration if email fails)
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk";
    sendEmail({
      to: normalizedEmail,
      slug: "welcome",
      variables: { name: name.trim(), loginUrl: `${APP_URL}/login` },
      recipientName: name.trim(),
    }).catch((err) => log.error("Failed to send welcome email", { error: (err as Error).message }));
```

- [ ] **Step 2: Add budget alert to budget POST route**

In `src/app/api/budget/route.ts`, add import at the top:

```typescript
import { sendEmail } from "@/lib/email/send";
import { formatCurrency } from "@/lib/format";
```

Then after `log.info("Budget item created", ...)` and before `return NextResponse.json(item, { status: 201 });`, add the budget alert check:

```typescript
    // Check budget alert thresholds
    try {
      const [allItems, wedding] = await Promise.all([
        prisma.budgetItem.findMany({ where: { weddingId }, select: { actualCost: true } }),
        prisma.wedding.findUnique({ where: { id: weddingId }, select: { totalBudget: true, budgetAlertsSent: true, userId: true } }),
      ]);

      if (wedding && Number(wedding.totalBudget) > 0) {
        const totalSpent = allItems.reduce((s, i) => s + Number(i.actualCost), 0);
        const percentUsed = Math.round((totalSpent / Number(wedding.totalBudget)) * 100);
        const alertsSent = (wedding.budgetAlertsSent as number[]) || [];
        const thresholds = [80, 90, 100];

        for (const threshold of thresholds) {
          if (percentUsed >= threshold && !alertsSent.includes(threshold)) {
            const user = await prisma.user.findUnique({ where: { id: wedding.userId }, select: { email: true, name: true } });
            if (user) {
              const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk";
              sendEmail({
                to: user.email,
                slug: "budget-alert",
                variables: {
                  name: user.name,
                  totalBudget: formatCurrency(Number(wedding.totalBudget)),
                  totalSpent: formatCurrency(totalSpent),
                  percentUsed: String(percentUsed),
                  dashboardUrl: `${APP_URL}/dashboard/budget`,
                },
                recipientName: user.name,
              }).catch(() => {});

              await prisma.wedding.update({
                where: { id: weddingId },
                data: { budgetAlertsSent: [...alertsSent, threshold] },
              });
            }
            break; // Only send one alert at a time
          }
        }
      }
    } catch (alertErr) {
      log.error("Budget alert check failed", { error: (alertErr as Error).message });
    }
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/register/route.ts src/app/api/budget/route.ts
git commit -m "feat: wire up welcome email on register + budget alert on spend threshold"
```

---

### Task 9: Cron Reminder Endpoints

**Files:**
- Create: `src/app/api/cron/task-reminders/route.ts`
- Create: `src/app/api/cron/event-reminders/route.ts`
- Create: `src/app/api/cron/vendor-reminders/route.ts`

- [ ] **Step 1: Create `src/app/api/cron/task-reminders/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron/task-reminders");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk";

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find tasks due within 24 hours that are not completed
    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { gte: now, lte: in24h },
        status: { not: "COMPLETED" },
      },
      include: {
        wedding: {
          select: { userId: true },
        },
      },
    });

    let sent = 0;
    for (const task of tasks) {
      const user = await prisma.user.findUnique({
        where: { id: task.wedding.userId },
        select: { email: true, name: true },
      });
      if (!user) continue;

      const dueDate = task.dueDate
        ? task.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : "Soon";

      await sendEmail({
        to: user.email,
        slug: "task-reminder",
        variables: {
          name: user.name,
          taskName: task.title,
          dueDate,
          priority: task.priority,
          dashboardUrl: `${APP_URL}/dashboard/tasks`,
        },
        recipientName: user.name,
      });
      sent++;
    }

    log.info("Task reminders sent", { found: tasks.length, sent });
    return NextResponse.json({ message: `Sent ${sent} task reminders` });
  } catch (err) {
    log.error("Task reminder cron failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `src/app/api/cron/event-reminders/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron/event-reminders");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk";

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find events within the next 7 days
    const events = await prisma.event.findMany({
      where: {
        date: { gte: now, lte: in7d },
      },
      include: {
        wedding: {
          select: { userId: true },
        },
      },
    });

    let sent = 0;
    for (const event of events) {
      const user = await prisma.user.findUnique({
        where: { id: event.wedding.userId },
        select: { email: true, name: true },
      });
      if (!user) continue;

      const eventDate = event.date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

      await sendEmail({
        to: user.email,
        slug: "event-reminder",
        variables: {
          name: user.name,
          eventName: event.name,
          eventDate,
          eventTime: event.startTime || "TBC",
          venue: event.venue || "TBC",
          dashboardUrl: `${APP_URL}/dashboard/timeline`,
        },
        recipientName: user.name,
      });
      sent++;
    }

    log.info("Event reminders sent", { found: events.length, sent });
    return NextResponse.json({ message: `Sent ${sent} event reminders` });
  } catch (err) {
    log.error("Event reminder cron failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create `src/app/api/cron/vendor-reminders/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { formatCurrency } from "@/lib/format";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron/vendor-reminders");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk";

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find vendor payments due within 7 days that are still pending
    const payments = await prisma.vendorPayment.findMany({
      where: {
        dueDate: { gte: now, lte: in7d },
        status: "PENDING",
      },
      include: {
        vendor: {
          select: {
            name: true,
            weddingId: true,
            wedding: { select: { userId: true } },
          },
        },
      },
    });

    let sent = 0;
    for (const payment of payments) {
      const user = await prisma.user.findUnique({
        where: { id: payment.vendor.wedding.userId },
        select: { email: true, name: true },
      });
      if (!user) continue;

      const dueDate = payment.dueDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

      await sendEmail({
        to: user.email,
        slug: "vendor-reminder",
        variables: {
          name: user.name,
          vendorName: payment.vendor.name,
          amount: formatCurrency(Number(payment.amount)),
          dueDate,
          dashboardUrl: `${APP_URL}/dashboard/vendors`,
        },
        recipientName: user.name,
      });
      sent++;
    }

    log.info("Vendor reminders sent", { found: payments.length, sent });
    return NextResponse.json({ message: `Sent ${sent} vendor payment reminders` });
  } catch (err) {
    log.error("Vendor reminder cron failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/
git commit -m "feat: cron-ready reminder endpoints — tasks, events, vendor payments"
```

---

### Task 10: Final Build Verification + Environment Variables Documentation

- [ ] **Step 1: Full build test**

```bash
npm run build
```

Expected: Build succeeds with zero errors.

- [ ] **Step 2: Verify all new routes exist**

Check that these paths are in the build output:
- `/api/admin/emails`
- `/api/admin/emails/[slug]`
- `/api/admin/emails/[slug]/test`
- `/api/admin/emails/logs`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- `/api/rsvp/[token]`
- `/api/cron/task-reminders`
- `/api/cron/event-reminders`
- `/api/cron/vendor-reminders`
- `/admin/emails`
- `/reset-password/[token]`
- `/rsvp/[token]`

- [ ] **Step 3: Commit everything**

```bash
git add -A
git commit -m "feat: complete email system — 8 templates, admin panel, RSVP, password reset, cron endpoints"
```

---

## Environment Variables to Add on Render

```
RESEND_API_KEY=re_xxxx
EMAIL_FROM=hello@knotbook.co.uk
CRON_SECRET=<generate-a-random-uuid>
NEXT_PUBLIC_APP_URL=https://knotbook.co.uk
```

## Render Cron Jobs (configure in Render dashboard)

| Job | URL | Schedule |
|-----|-----|----------|
| Task Reminders | `GET /api/cron/task-reminders` with `Authorization: Bearer {CRON_SECRET}` | Daily 9:00 AM |
| Event Reminders | `GET /api/cron/event-reminders` with `Authorization: Bearer {CRON_SECRET}` | Daily 9:00 AM |
| Vendor Reminders | `GET /api/cron/vendor-reminders` with `Authorization: Bearer {CRON_SECRET}` | Daily 9:00 AM |
