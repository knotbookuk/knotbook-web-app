const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk";

export function emailLayout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KnotBook</title>
</head>
<body style="margin:0;padding:0;background-color:#fcf9f2;font-family:Inter,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fcf9f2;">
    <tr>
      <td align="center" style="padding:16px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Body Card with Logo Inside -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;border:1px solid rgba(127,118,99,0.15);">
                <!-- Logo Row + Corner Accents -->
                <tr>
                  <td style="padding:0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="45" style="vertical-align:top;">
                          <img src="${APP_URL}/images/floral-corner.png" alt="" width="40" style="display:block;height:auto;opacity:0.2;" />
                        </td>
                        <td align="center" style="padding:20px 0 8px;">
                          <img src="${APP_URL}/images/knotbook-logo-full.png" alt="KnotBook" width="120" style="display:block;height:auto;" />
                        </td>
                        <td width="45" style="vertical-align:top;text-align:right;">
                          <img src="${APP_URL}/images/floral-corner.png" alt="" width="40" style="display:block;height:auto;opacity:0.2;transform:scaleX(-1);-webkit-transform:scaleX(-1);mso-transform:scaleX(-1);margin-left:auto;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding:0 40px 32px;">
                    ${bodyContent}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:30px 40px 10px;">
              <img src="${APP_URL}/images/floral-accent.png" alt="" width="50" style="display:block;height:auto;opacity:0.5;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 40px 30px;">
              <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:#735c00;">
                KnotBook &mdash; Your Wedding, Your Way
              </p>
              <p style="margin:0;font-size:12px;color:#7f7663;">
                <a href="${APP_URL}" style="color:#7f7663;text-decoration:underline;">knotbook.co.uk</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#1c1c18;line-height:1.3;">${text}</h1>`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1c1c18;">${text}</p>`;
}

export function mutedText(text: string): string {
  return `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#7f7663;">${text}</p>`;
}

export function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td align="center" style="background:linear-gradient(135deg,#d4af37 0%,#735c00 100%);border-radius:8px;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.5px;text-transform:uppercase;">${text}</a>
    </td>
  </tr>
</table>`;
}

export function dividerLine(): string {
  return `<hr style="border:none;border-top:1px solid rgba(127,118,99,0.15);margin:24px 0;" />`;
}

export function infoRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:6px 0;font-size:13px;color:#7f7663;width:140px;vertical-align:top;">${label}</td>
  <td style="padding:6px 0;font-size:14px;color:#1c1c18;font-weight:500;">${value}</td>
</tr>`;
}

export function infoTable(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}</table>`;
}

export function priorityBadge(priority: string): string {
  const colors: Record<string, { bg: string; text: string }> = {
    HIGH: { bg: "#ffdad6", text: "#ba1a1a" },
    MEDIUM: { bg: "#fff3cd", text: "#735c00" },
    LOW: { bg: "#d6f5d6", text: "#2c5f2d" },
  };
  const c = colors[priority] || colors.MEDIUM;
  return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${c.bg};color:${c.text};text-transform:uppercase;letter-spacing:0.5px;">${priority}</span>`;
}
