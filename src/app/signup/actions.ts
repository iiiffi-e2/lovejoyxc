"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, roleHome } from "@/lib/auth";
import { verifyInviteCode } from "@/lib/invite-code";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const signupSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  grade: z.coerce.number().int().min(7).max(12),
});

export type SignupState = { error?: string };

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`signup:${ip}`, 10, 15 * 60 * 1000).ok) {
    return { error: "Too many attempts. Try again later." };
  }

  const parsed = signupSchema.safeParse({
    inviteCode: formData.get("inviteCode"),
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
    grade: formData.get("grade"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }
  const d = parsed.data;

  const teams = await prisma.team.findMany({
    where: { signupEnabled: true, signupCodeHash: { not: null } },
  });

  let matchedTeam: (typeof teams)[number] | null = null;
  for (const team of teams) {
    if (await verifyInviteCode(d.inviteCode, team.signupCodeHash)) {
      matchedTeam = team;
      break;
    }
  }
  if (!matchedTeam) {
    return { error: "Invalid invite code or signup is closed." };
  }

  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) {
    return { error: "An account with that email already exists. Try logging in." };
  }

  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      passwordHash: await hashPassword(d.password),
      role: "ATHLETE",
      grade: d.grade,
      teamId: matchedTeam.id,
      active: true,
    },
  });

  await createSession(user.id);
  redirect(roleHome(user.role));
}
