import {
  emailLayout,
  heading,
  paragraph,
  ctaButton,
  mutedText,
  dividerLine,
} from "./base";

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
