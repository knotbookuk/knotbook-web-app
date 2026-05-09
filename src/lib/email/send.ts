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

const renderers: Record<
  TemplateSlug,
  (vars: Record<string, string>) => string
> = {
  welcome: renderWelcome,
  "password-reset": renderPasswordReset,
  "rsvp-confirmation": renderRsvpConfirmation,
  "task-reminder": renderTaskReminder,
  "event-reminder": renderEventReminder,
  "payment-receipt": renderPaymentReceipt,
  "budget-alert": renderBudgetAlert,
  "vendor-reminder": renderVendorReminder,
};

function replaceVariables(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

const EMAIL_FROM = process.env.EMAIL_FROM || "hello@knotbook.co.uk";

export async function sendEmail(
  options: SendEmailOptions
): Promise<{ success: boolean; error?: string }> {
  const { to, slug, variables, recipientName, subject: subjectOverride } = options;

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

    // 4. Build subject — cron-style senders can override with a dynamic
    // subject (e.g. digest counts) that the static DB template can't express.
    const subject = subjectOverride
      ? replaceVariables(subjectOverride, variables)
      : replaceVariables(template.subjectLine, variables);

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
