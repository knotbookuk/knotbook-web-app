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
