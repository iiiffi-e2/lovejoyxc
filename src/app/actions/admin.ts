"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { GenderTeam, TeamGroup } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";

const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(values).optional());

const userSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["ATHLETE", "COACH", "ADMIN"]),
  grade: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(7).max(12).optional(),
  ),
  genderTeam: optionalEnum(["BOYS", "GIRLS"]),
  teamGroup: optionalEnum(["VARSITY", "JV", "FRESHMAN"]),
  teamId: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().optional(),
  ),
});

export type AdminState = { error?: string; ok?: boolean };

export async function createUser(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireRole("ADMIN");
  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password") || undefined,
    role: formData.get("role") ?? "ATHLETE",
    grade: formData.get("grade"),
    genderTeam: formData.get("genderTeam"),
    teamGroup: formData.get("teamGroup"),
    teamId: formData.get("teamId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }
  const d = parsed.data;
  if (!d.password) return { error: "A password is required for new accounts." };

  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) return { error: "A user with that email already exists." };

  await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      passwordHash: await hashPassword(d.password),
      role: d.role,
      grade: d.grade ?? null,
      genderTeam: (d.genderTeam ?? null) as GenderTeam | null,
      teamGroup: (d.teamGroup ?? null) as TeamGroup | null,
      teamId: d.teamId ?? null,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateUser(
  id: string,
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireRole("ADMIN");
  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password") || undefined,
    role: formData.get("role") ?? "ATHLETE",
    grade: formData.get("grade"),
    genderTeam: formData.get("genderTeam"),
    teamGroup: formData.get("teamGroup"),
    teamId: formData.get("teamId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }
  const d = parsed.data;

  await prisma.user.update({
    where: { id },
    data: {
      name: d.name,
      email: d.email,
      role: d.role,
      grade: d.grade ?? null,
      genderTeam: (d.genderTeam ?? null) as GenderTeam | null,
      teamGroup: (d.teamGroup ?? null) as TeamGroup | null,
      teamId: d.teamId ?? null,
      ...(d.password ? { passwordHash: await hashPassword(d.password) } : {}),
    },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function toggleUserActive(id: string): Promise<void> {
  const admin = await requireRole("ADMIN");
  if (admin.id === id) return; // don't deactivate yourself
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;
  await prisma.user.update({ where: { id }, data: { active: !user.active } });
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

const teamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(120),
  season: z.string().min(1, "Season is required").max(60),
  schoolYear: z.string().min(1, "School year is required").max(20),
});

export async function createTeam(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireRole("ADMIN");
  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    season: formData.get("season"),
    schoolYear: formData.get("schoolYear"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }

  try {
    await prisma.team.create({ data: parsed.data });
  } catch {
    return { error: "A team with that name and school year already exists." };
  }

  revalidatePath("/admin/teams");
  revalidatePath("/admin");
  return { ok: true };
}
