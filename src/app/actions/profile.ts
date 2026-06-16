"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ProfileState = { error?: string; ok?: boolean };

function revalidateForRole(role: Role) {
  revalidatePath("/profile");
  revalidatePath("/coach/settings");
  revalidatePath("/admin/settings");
  switch (role) {
    case "ATHLETE":
      revalidatePath("/dashboard", "layout");
      break;
    case "COACH":
      revalidatePath("/coach", "layout");
      break;
    case "ADMIN":
      revalidatePath("/admin", "layout");
      break;
  }
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export async function changePasswordAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }

  const ok = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!ok) {
    return { error: "Current password is incorrect." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  revalidateForRole(user.role);
  return { ok: true };
}

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  currentPassword: z.string().min(1, "Enter your password to confirm."),
});

export async function updateEmailAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = emailSchema.safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    currentPassword: formData.get("currentPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }

  if (parsed.data.email === user.email) {
    return { error: "That is already your email address." };
  }

  const ok = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!ok) {
    return { error: "Password is incorrect." };
  }

  const taken = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (taken) {
    return { error: "That email is already in use." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { email: parsed.data.email },
  });

  revalidateForRole(user.role);
  return { ok: true };
}
