"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const noteSchema = z.object({
  athleteId: z.string().min(1),
  note: z.string().min(1, "Write a note").max(2000),
});

export type NoteState = { error?: string; ok?: boolean };

export async function addCoachNote(
  _prev: NoteState,
  formData: FormData,
): Promise<NoteState> {
  const coach = await requireRole("COACH", "ADMIN");
  const parsed = noteSchema.safeParse({
    athleteId: formData.get("athleteId"),
    note: (formData.get("note") as string)?.trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid note." };
  }

  await prisma.coachNote.create({
    data: {
      coachId: coach.id,
      athleteId: parsed.data.athleteId,
      note: parsed.data.note,
    },
  });

  revalidatePath(`/coach/athletes/${parsed.data.athleteId}`);
  return { ok: true };
}

export async function deleteCoachNote(id: string): Promise<void> {
  const coach = await requireRole("COACH", "ADMIN");
  const note = await prisma.coachNote.findUnique({ where: { id } });
  if (!note) return;
  // Coaches can delete their own notes; admins can delete any.
  if (coach.role !== "ADMIN" && note.coachId !== coach.id) return;
  await prisma.coachNote.delete({ where: { id } });
  revalidatePath(`/coach/athletes/${note.athleteId}`);
}
