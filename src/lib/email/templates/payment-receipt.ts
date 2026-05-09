import {
  emailLayout,
  heading,
  paragraph,
  mutedText,
  dividerLine,
  infoTable,
  infoRow,
} from "./base";

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
