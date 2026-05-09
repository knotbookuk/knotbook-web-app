import {
  emailLayout,
  heading,
  paragraph,
  ctaButton,
  dividerLine,
} from "./base";

export interface EventReminderItem {
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
}

export function renderEventReminderItems(items: EventReminderItem[]): string {
  return items
    .map(
      (item) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid rgba(127,118,99,0.15);border-radius:10px;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#1c1c18;">${item.eventName}</p>
            <p style="margin:0 0 2px;font-size:13px;color:#7f7663;">
              ${item.eventDate} &nbsp;&middot;&nbsp; ${item.eventTime}
            </p>
            <p style="margin:0;font-size:13px;color:#7f7663;">${item.venue}</p>
          </td>
        </tr>
      </table>`,
    )
    .join("");
}

export function renderEventReminder(vars: Record<string, string>): string {
  const count = Number(vars.count) || 1;
  const intro =
    count === 1
      ? `Hi ${vars.name}, just a reminder about an upcoming event in your wedding timeline.`
      : `Hi ${vars.name}, you have <strong>${count}</strong> upcoming events in your wedding timeline.`;
  const headingText = count === 1 ? "Upcoming Event" : "Upcoming Events";

  const body = `
    ${heading(headingText)}
    ${paragraph(intro)}
    ${vars.itemsHtml}
    ${dividerLine()}
    ${ctaButton("View Timeline", vars.dashboardUrl)}
  `;
  return emailLayout(body);
}
