"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { isBlobConfigured } from "@/lib/blob-config";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AvatarState = { error?: string; ok?: boolean };

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

export async function uploadAvatar(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const user = await requireUser();
  if (!isBlobConfigured()) {
    return { error: "Photo upload is not configured in this environment." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Photo must be JPEG, PNG, or WebP under 2 MB." };
  }
  if (!ALLOWED.has(file.type)) {
    return { error: "Photo must be JPEG, PNG, or WebP under 2 MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const pathname = `avatars/${user.id}.webp`;
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
  });

  if (user.avatarUrl) {
    try {
      await del(user.avatarUrl);
    } catch {
      /* old blob may already be gone */
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: blob.url },
  });

  revalidateForRole(user.role);
  return { ok: true };
}

export async function removeAvatar(): Promise<AvatarState> {
  const user = await requireUser();
  if (user.avatarUrl) {
    if (isBlobConfigured()) {
      try {
        await del(user.avatarUrl);
      } catch {
        /* ignore */
      }
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });
  }
  revalidateForRole(user.role);
  return { ok: true };
}
