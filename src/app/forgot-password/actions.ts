"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

export type ForgotState = { ok?: boolean; error?: string; message?: string };

const SUCCESS_MSG =
  "If an account exists for that email, we sent a reset link.";

export async function forgotPasswordAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000).ok) {
    return { error: "Too many attempts. Try again later." };
  }

  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (user?.active) {
    const raw = await createPasswordResetToken(user.id);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${base}/reset-password?token=${raw}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  return { ok: true, message: SUCCESS_MSG };
}
