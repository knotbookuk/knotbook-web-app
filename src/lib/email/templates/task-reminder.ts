import {
  emailLayout,
  heading,
  paragraph,
  ctaButton,
  dividerLine,
  priorityBadge,
} from "./base";

export interface TaskReminderItem {
  taskName: string;
  dueDate: string;
  priority: string;
}

export function renderTaskReminderItems(items: TaskReminderItem[]): string {
  return items
    .map(
      (item) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid rgba(127,118,99,0.15);border-radius:10px;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#1c1c18;">${item.taskName}</p>
            <p style="margin:0;font-size:13px;color:#7f7663;">
              Due ${item.dueDate} &nbsp;&middot;&nbsp; ${priorityBadge(item.priority)}
            </p>
          </td>
        </tr>
      </table>`,
    )
    .join("");
}

export function renderTaskReminder(vars: Record<string, string>): string {
  const count = Number(vars.count) || 1;
  const intro =
    count === 1
      ? `Hi ${vars.name}, you have an upcoming task that needs your attention.`
      : `Hi ${vars.name}, you have <strong>${count}</strong> upcoming tasks that need your attention.`;
  const headingText = count === 1 ? "Task Reminder" : "Task Reminders";

  const body = `
    ${heading(headingText)}
    ${paragraph(intro)}
    ${vars.itemsHtml}
    ${dividerLine()}
    ${ctaButton("View in Dashboard", vars.dashboardUrl)}
  `;
  return emailLayout(body);
}
