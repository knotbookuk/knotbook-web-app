import {
  emailLayout,
  heading,
  paragraph,
  ctaButton,
  dividerLine,
} from "./base";

export interface VendorReminderItem {
  vendorName: string;
  amount: string;
  dueDate: string;
}

export function renderVendorReminderItems(items: VendorReminderItem[]): string {
  // Each payment becomes its own bordered card so multiple entries don't blur
  // into a single ambiguous table.
  return items
    .map(
      (item) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid rgba(127,118,99,0.15);border-radius:10px;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#1c1c18;">${item.vendorName}</p>
            <p style="margin:0;font-size:13px;color:#7f7663;">
              <strong style="color:#735c00;">${item.amount}</strong>
              &nbsp;&middot;&nbsp; Due ${item.dueDate}
            </p>
          </td>
        </tr>
      </table>`,
    )
    .join("");
}

export function renderVendorReminder(vars: Record<string, string>): string {
  const count = Number(vars.count) || 1;
  const intro =
    count === 1
      ? `Hi ${vars.name}, you have an upcoming vendor payment due soon.`
      : `Hi ${vars.name}, you have <strong>${count}</strong> upcoming vendor payments due soon.`;
  const headingText =
    count === 1 ? "Vendor Payment Reminder" : "Vendor Payment Reminders";

  const body = `
    ${heading(headingText)}
    ${paragraph(intro)}
    ${vars.itemsHtml}
    ${dividerLine()}
    ${ctaButton("View Vendors", vars.dashboardUrl)}
  `;
  return emailLayout(body);
}
