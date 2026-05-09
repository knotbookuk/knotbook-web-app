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
  count: string;
  itemsHtml: string;
  dashboardUrl: string;
}

export interface EventReminderVars {
  name: string;
  count: string;
  itemsHtml: string;
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
  count: string;
  itemsHtml: string;
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
  /**
   * Override the template's subject line. Cron jobs use this to inject
   * dynamic subjects (e.g. "3 vendor payments due") that depend on the
   * grouped item count.
   */
  subject?: string;
}
