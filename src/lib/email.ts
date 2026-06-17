import "server-only";
import { Resend } from "resend";

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.log(`[dev] Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: "Reset your Lovejoy XC Log password",
    text: `Reset your password by visiting this link (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  });
}

export async function sendParentInviteEmail(
  to: string,
  acceptUrl: string,
  athleteName: string,
  inviterName: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  const text =
    `${inviterName} invited you to view ${athleteName}'s training log on Lovejoy XC Log.\n\n` +
    `Accept the invite (expires in 7 days):\n\n${acceptUrl}\n\n` +
    `If you weren't expecting this, you can ignore this email.`;

  if (!apiKey || !from) {
    console.log(`[dev] Parent invite link for ${to}: ${acceptUrl}`);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: `View ${athleteName}'s training log — Lovejoy XC`,
    text,
  });
}
