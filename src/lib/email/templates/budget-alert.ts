import {
  emailLayout,
  heading,
  paragraph,
  ctaButton,
  dividerLine,
} from "./base";

export function renderBudgetAlert(vars: Record<string, string>): string {
  const percent = parseInt(vars.percentUsed) || 0;
  const barColor =
    percent >= 100 ? "#ba1a1a" : percent >= 90 ? "#e65100" : "#d4af37";

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
