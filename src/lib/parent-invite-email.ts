const APP_BASE =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export function appPublicUrl(path = ""): string {
  if (!path) return APP_BASE;
  return `${APP_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildParentInviteEmail({
  acceptUrl,
  athleteName,
  inviterName,
}: {
  acceptUrl: string;
  athleteName: string;
  inviterName: string;
}) {
  const athlete = escapeHtml(athleteName);
  const inviter = escapeHtml(inviterName);
  const firstName = escapeHtml(athleteName.split(" ")[0] ?? athleteName);
  const logoUrl = appPublicUrl("/logo-lovejoy-xc.png");
  const safeUrl = escapeHtml(acceptUrl);

  const text =
    `${inviterName} invited you to view ${athleteName}'s training log on Lovejoy XC Log.\n\n` +
    `Accept the invite (expires in 7 days):\n\n${acceptUrl}\n\n` +
    `You'll get read-only access to ${firstName}'s workouts, team schedule, and shoe mileage.\n\n` +
    `If you weren't expecting this, you can ignore this email.`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Parent invite — Lovejoy XC Log</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111111;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${inviter} invited you to view ${firstName}&apos;s training log on Lovejoy XC Log.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f5f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <img src="${logoUrl}" width="88" height="88" alt="Lovejoy XC Log" style="display:block;border:0;outline:none;text-decoration:none;border-radius:9999px;" />
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(17,17,17,0.06);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="background-color:#fde8eb;padding:20px 28px;text-align:center;border-bottom:1px solid #e5e7eb;">
                      <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#c8102e;">
                        Parent / guardian invite
                      </p>
                      <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:800;color:#111111;">
                        Lovejoy XC Log
                      </h1>
                      <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#6b7280;">
                        Private running log for the Lovejoy Leopards
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:28px;">
                      <p style="margin:0 0 12px;font-size:18px;line-height:1.4;font-weight:700;color:#111111;">
                        You&apos;re invited to view ${firstName}&apos;s training log
                      </p>
                      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#374151;">
                        <strong style="color:#111111;">${inviter}</strong> invited you to follow
                        <strong style="color:#111111;">${athlete}</strong>&apos;s cross country training.
                        Create a parent account to get read-only access to their workouts, team schedule, and shoe mileage.
                      </p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#f5f5f5;border:1px solid #e5e7eb;border-radius:12px;">
                        <tr>
                          <td style="padding:16px 18px;">
                            <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#6b7280;">
                              What you can view
                            </p>
                            <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">
                              Workout history &amp; training log<br />
                              Team schedule (practices and meets)<br />
                              Shoe mileage tracking
                            </p>
                          </td>
                        </tr>
                      </table>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 24px;">
                        <tr>
                          <td align="center" style="border-radius:12px;background-color:#c8102e;">
                            <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:12px;">
                              Accept invite
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b7280;text-align:center;">
                        This invite expires in <strong style="color:#111111;">7 days</strong>.
                      </p>
                      <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;text-align:center;word-break:break-all;">
                        Or copy this link:<br />
                        <a href="${safeUrl}" style="color:#c8102e;text-decoration:underline;">${safeUrl}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px 0;text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
                  If you weren&apos;t expecting this email, you can safely ignore it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, text };
}
