"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { dateInputToUTC } from "@/lib/format";

const schema = z.object({
  name: z.string().min(1, "Name your shoes").max(80),
  startDate: z.string().min(1),
  mileageLimit: z.coerce.number().min(50).max(1000).default(400),
});

export type ShoeFormState = { error?: string; ok?: boolean };

export async function addShoe(
  _prev: ShoeFormState,
  formData: FormData,
): Promise<ShoeFormState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    startDate:
      (formData.get("startDate") as string) ||
      new Date().toISOString().slice(0, 10),
    mileageLimit: formData.get("mileageLimit") || 400,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }

  await prisma.shoe.create({
    data: {
      athleteId: user.id,
      name: parsed.data.name,
      startDate: dateInputToUTC(parsed.data.startDate),
      mileageLimit: parsed.data.mileageLimit,
    },
  });

  revalidatePath("/shoes");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function toggleRetireShoe(id: string): Promise<void> {
  const user = await requireUser();
  const shoe = await prisma.shoe.findUnique({ where: { id } });
  if (!shoe || shoe.athleteId !== user.id) return;
  await prisma.shoe.update({
    where: { id },
    data: { retired: !shoe.retired },
  });
  revalidatePath("/shoes");
  revalidatePath("/dashboard");
}

export async function deleteShoe(id: string): Promise<void> {
  const user = await requireUser();
  const shoe = await prisma.shoe.findUnique({ where: { id } });
  if (!shoe || shoe.athleteId !== user.id) return;
  await prisma.shoe.delete({ where: { id } });
  revalidatePath("/shoes");
  revalidatePath("/dashboard");
}
