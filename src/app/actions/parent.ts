"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  hashPassword,
  requireRole,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { sendParentInviteEmail } from "@/lib/email";
import {
  consumeParentInviteToken,
  createParentInviteToken,
  validateParentInviteToken,
} from "@/lib/parent-invite";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { persistParentChildSelection } from "@/lib/parent-access";

export type ParentActionState = { error?: string; ok?: boolean; message?: string };

const emailSchema = z.string().email("Enter a valid email address.");

function revalidateParentPaths(athleteId: string) {
  revalidatePath("/profile");
  revalidatePath(`/coach/athletes/${athleteId}`);
  revalidatePath("/parent/profile");
  revalidatePath("/parent/dashboard");
}

async function assertCanManageAthleteParentAccess(
  user: User,
  athleteId: string,
): Promise<{ athlete: { id: string; name: string; teamId: string | null } }> {
  if (user.role === "ATHLETE") {
    if (user.id !== athleteId) throw new Error("Forbidden");
    const athlete = await prisma.user.findUnique({
      where: { id: athleteId, role: "ATHLETE", active: true },
      select: { id: true, name: true, teamId: true },
    });
    if (!athlete) throw new Error("Athlete not found");
    return { athlete };
  }

  await requireRole("COACH", "ADMIN");
  const athlete = await prisma.user.findFirst({
    where: { id: athleteId, role: "ATHLETE", active: true },
    select: { id: true, name: true, teamId: true },
  });
  if (!athlete) throw new Error("Athlete not found");
  if (user.role === "COACH" && user.teamId && athlete.teamId !== user.teamId) {
    throw new Error("Forbidden");
  }
  return { athlete };
}

export async function inviteParent(
  athleteId: string,
  _prev: ParentActionState,
  formData: FormData,
): Promise<ParentActionState> {
  const user = await requireUser();
  let athlete: { id: string; name: string; teamId: string | null };
  try {
    ({ athlete } = await assertCanManageAthleteParentAccess(user, athleteId));
  } catch {
    return { error: "You cannot send invites for this athlete." };
  }

  const parsed = emailSchema.safeParse(
    String(formData.get("email") ?? "").trim().toLowerCase(),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }
  const email = parsed.data;

  if (!checkRateLimit(`parent-invite:${athleteId}`, 5, 60 * 60 * 1000).ok) {
    return { error: "Too many invites. Try again later." };
  }

  const existingParent = await prisma.user.findUnique({ where: { email } });
  if (existingParent?.role === "PARENT") {
    const existingLink = await prisma.parentAthleteLink.findUnique({
      where: {
        parentId_athleteId: { parentId: existingParent.id, athleteId },
      },
    });
    if (existingLink) {
      return { error: "This parent is already linked." };
    }
  }

  const raw = await createParentInviteToken(athleteId, email, user.id);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const acceptUrl = `${base}/parent/accept?token=${raw}`;
  await sendParentInviteEmail(email, acceptUrl, athlete.name, user.name);

  revalidateParentPaths(athleteId);
  return { ok: true, message: "Invite sent." };
}

export async function revokeParentLink(
  linkId: string,
  athleteId: string,
): Promise<void> {
  const user = await requireUser();
  try {
    await assertCanManageAthleteParentAccess(user, athleteId);
  } catch {
    return;
  }

  await prisma.parentAthleteLink.deleteMany({
    where: { id: linkId, athleteId },
  });
  revalidateParentPaths(athleteId);
}

export async function revokeParentInvite(
  tokenId: string,
  athleteId: string,
): Promise<void> {
  const user = await requireUser();
  try {
    await assertCanManageAthleteParentAccess(user, athleteId);
  } catch {
    return;
  }

  await prisma.parentInviteToken.updateMany({
    where: { id: tokenId, athleteId, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidateParentPaths(athleteId);
}

export async function resendParentInvite(
  tokenId: string,
  athleteId: string,
): Promise<void> {
  const user = await requireUser();
  let athlete: { id: string; name: string; teamId: string | null };
  try {
    ({ athlete } = await assertCanManageAthleteParentAccess(user, athleteId));
  } catch {
    return;
  }

  const pending = await prisma.parentInviteToken.findFirst({
    where: {
      id: tokenId,
      athleteId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!pending) return;

  const raw = await createParentInviteToken(athleteId, pending.email, user.id);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const acceptUrl = `${base}/parent/accept?token=${raw}`;
  await sendParentInviteEmail(pending.email, acceptUrl, athlete.name, user.name);
  revalidateParentPaths(athleteId);
}

async function linkParentToAthlete(
  parentId: string,
  athleteId: string,
  invitedById: string,
) {
  await prisma.parentAthleteLink.upsert({
    where: { parentId_athleteId: { parentId, athleteId } },
    create: { parentId, athleteId, invitedById },
    update: {},
  });
}

export async function signupAndAcceptParentInvite(
  _prev: ParentActionState,
  formData: FormData,
): Promise<ParentActionState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`parent-accept:${ip}`, 10, 15 * 60 * 1000).ok) {
    return { error: "Too many attempts. Try again later." };
  }

  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!token) return { error: "Invalid invite." };
  if (!name) return { error: "Name is required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const record = await validateParentInviteToken(token);
  if (!record) return { error: "This invite link is invalid or has expired." };

  const existing = await prisma.user.findUnique({ where: { email: record.email } });
  if (existing) {
    return { error: "An account already exists for this email. Log in to accept the invite." };
  }

  const consumed = await consumeParentInviteToken(token);
  if (!consumed) return { error: "This invite link is invalid or has expired." };

  const parent = await prisma.user.create({
    data: {
      name,
      email: record.email,
      passwordHash: await hashPassword(password),
      role: "PARENT",
      active: true,
    },
  });

  await linkParentToAthlete(parent.id, record.athleteId, record.invitedById);
  await createSession(parent.id);
  await persistParentChildSelection(record.athleteId);
  redirect(`/parent/dashboard?child=${record.athleteId}`);
}

export async function loginAndAcceptParentInvite(
  _prev: ParentActionState,
  formData: FormData,
): Promise<ParentActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!token) return { error: "Invalid invite." };

  const record = await validateParentInviteToken(token);
  if (!record) return { error: "This invite link is invalid or has expired." };

  const user = await prisma.user.findUnique({ where: { email: record.email } });
  if (!user || !user.active) return { error: "Invalid email or password." };
  if (user.role !== "PARENT") {
    return {
      error: "This email is already registered. Use a different email or contact your coach.",
    };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Invalid email or password." };

  const consumed = await consumeParentInviteToken(token);
  if (!consumed) return { error: "This invite link is invalid or has expired." };

  await linkParentToAthlete(user.id, record.athleteId, record.invitedById);
  await createSession(user.id);
  await persistParentChildSelection(record.athleteId);
  redirect(`/parent/dashboard?child=${record.athleteId}`);
}

export async function acceptParentInviteWhileLoggedIn(token: string): Promise<void> {
  const user = await requireRole("PARENT");
  const record = await validateParentInviteToken(token);
  if (!record || record.email !== user.email) {
    redirect("/parent/profile");
  }

  const consumed = await consumeParentInviteToken(token);
  if (!consumed) redirect("/parent/profile");

  await linkParentToAthlete(user.id, record.athleteId, record.invitedById);
  await persistParentChildSelection(record.athleteId);
  redirect(`/parent/dashboard?child=${record.athleteId}`);
}

export async function removeSelfFromAthlete(athleteId: string): Promise<void> {
  const parent = await requireRole("PARENT");
  await prisma.parentAthleteLink.deleteMany({
    where: { parentId: parent.id, athleteId },
  });
  revalidatePath("/parent/profile");
  revalidatePath("/parent/dashboard");
  revalidatePath("/profile");
  revalidatePath(`/coach/athletes/${athleteId}`);
}

export async function revokeParentLinkAsParent(linkId: string): Promise<void> {
  const parent = await requireRole("PARENT");
  const link = await prisma.parentAthleteLink.findFirst({
    where: { id: linkId, parentId: parent.id },
  });
  if (!link) return;
  await prisma.parentAthleteLink.delete({ where: { id: linkId } });
  revalidatePath("/parent/profile");
  revalidatePath("/parent/dashboard");
  revalidatePath("/profile");
  revalidatePath(`/coach/athletes/${link.athleteId}`);
}
