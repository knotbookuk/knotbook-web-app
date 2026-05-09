import {
  emailLayout,
  heading,
  paragraph,
  mutedText,
  dividerLine,
  infoTable,
  infoRow,
} from "./base";

export function renderRsvpConfirmation(vars: Record<string, string>): string {
  const statusText =
    vars.rsvpStatus === "ATTENDING"
      ? "We're delighted to confirm your attendance!"
      : "We've noted that you won't be able to attend.";

  const statusColor = vars.rsvpStatus === "ATTENDING" ? "#2c5f2d" : "#ba1a1a";
  const statusLabel =
    vars.rsvpStatus === "ATTENDING" ? "Attending" : "Unable to Attend";

  const body = `
    ${heading("RSVP Confirmed")}
    ${paragraph(`Dear ${vars.guestName}, thank you for responding to ${vars.coupleName}'s wedding invitation.`)}
    <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:${statusColor};">${statusText}</p>
    ${dividerLine()}
    ${infoTable(
      infoRow(
        "Your Response",
        `<span style="color:${statusColor};font-weight:600;">${statusLabel}</span>`
      ) +
        infoRow("Wedding", vars.coupleName) +
        infoRow("Date", vars.weddingDate) +
        infoRow("Venue", vars.venue)
    )}
    ${dividerLine()}
    ${mutedText("If you need to change your response, please use the same RSVP link you received or contact the couple directly.")}
  `;
  return emailLayout(body);
}
