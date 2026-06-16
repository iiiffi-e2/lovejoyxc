"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { recomputeShoeMiles } from "@/lib/queries";
import { computePaceSec, dateInputToUTC } from "@/lib/format";
import { RUNNING_TYPES } from "@/lib/labels";

const WorkoutEnum = z.enum([
  "EASY_RUN",
  "LONG_RUN",
  "WORKOUT",
  "RACE",
  "RECOVERY_RUN",
  "CROSS_TRAINING",
  "STRENGTH",
  "REST_DAY",
  "INJURY_RECOVERY",
]);

const schema = z.object({
  date: z.string().min(1, "Pick a date"),
  workoutType: WorkoutEnum,
  distance: z.coerce.number().min(0).max(200).optional(),
  durationSec: z.coerce.number().int().min(0).max(86400).optional(),
  shoeId: z.string().optional(),
  effort: z.coerce.number().int().min(1).max(10).optional(),
  feeling: z.enum(["GREAT", "GOOD", "OKAY", "ROUGH", "PAIN"]).optional(),
  soreness: z.enum(["NONE", "MILD", "MODERATE", "HIGH"]).default("NONE"),
  painFlag: z.coerce.boolean().optional(),
  surface: z
    .enum(["ROAD", "TRAIL", "TRACK", "GRASS", "TREADMILL", "OTHER"])
    .optional(),
  notes: z.string().max(2000).optional(),
});

export type WorkoutFormState = { error?: string };

function parseForm(formData: FormData) {
  const raw = {
    date: formData.get("date") ?? "",
    workoutType: formData.get("workoutType") ?? "EASY_RUN",
    distance: formData.get("distance") || undefined,
    durationSec: formData.get("durationSec") || undefined,
    shoeId: (formData.get("shoeId") as string) || undefined,
    effort: formData.get("effort") || undefined,
    feeling: (formData.get("feeling") as string) || undefined,
    soreness: (formData.get("soreness") as string) || "NONE",
    painFlag: formData.get("painFlag") === "on" || formData.get("painFlag") === "true",
    surface: (formData.get("surface") as string) || undefined,
    notes: (formData.get("notes") as string)?.trim() || undefined,
  };
  return schema.safeParse(raw);
}

export async function createLog(
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }
  const d = parsed.data;
  const isRunning = RUNNING_TYPES.includes(d.workoutType);
  const distance = isRunning ? (d.distance ?? 0) : 0;
  const paceSec = computePaceSec(distance, d.durationSec ?? null);
  const painFlag = d.painFlag || d.feeling === "PAIN" || d.soreness === "HIGH";

  const log = await prisma.workoutLog.create({
    data: {
      athleteId: user.id,
      teamId: user.teamId ?? undefined,
      date: dateInputToUTC(d.date),
      workoutType: d.workoutType,
      distance,
      durationSec: d.durationSec ?? null,
      paceSec,
      effort: d.effort ?? null,
      feeling: d.feeling ?? null,
      soreness: d.soreness,
      painFlag,
      surface: d.surface ?? null,
      notes: d.notes ?? null,
      shoeId: isRunning ? (d.shoeId ?? null) : null,
    },
  });

  if (log.shoeId) await recomputeShoeMiles(log.shoeId);

  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/dashboard?logged=1");
}

export async function updateLog(
  id: string,
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const user = await requireUser();
  const existing = await prisma.workoutLog.findUnique({ where: { id } });
  if (!existing || existing.athleteId !== user.id) {
    return { error: "You can only edit your own logs." };
  }
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }
  const d = parsed.data;
  const isRunning = RUNNING_TYPES.includes(d.workoutType);
  const distance = isRunning ? (d.distance ?? 0) : 0;
  const paceSec = computePaceSec(distance, d.durationSec ?? null);
  const painFlag = d.painFlag || d.feeling === "PAIN" || d.soreness === "HIGH";

  await prisma.workoutLog.update({
    where: { id },
    data: {
      date: dateInputToUTC(d.date),
      workoutType: d.workoutType,
      distance,
      durationSec: d.durationSec ?? null,
      paceSec,
      effort: d.effort ?? null,
      feeling: d.feeling ?? null,
      soreness: d.soreness,
      painFlag,
      surface: d.surface ?? null,
      notes: d.notes ?? null,
      shoeId: isRunning ? (d.shoeId ?? null) : null,
    },
  });

  const affectedShoes = new Set(
    [existing.shoeId, isRunning ? d.shoeId : null].filter(Boolean) as string[],
  );
  for (const sid of affectedShoes) await recomputeShoeMiles(sid);

  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/history");
}

export async function deleteLog(id: string): Promise<void> {
  const user = await requireUser();
  const existing = await prisma.workoutLog.findUnique({ where: { id } });
  if (!existing || existing.athleteId !== user.id) return;

  await prisma.workoutLog.delete({ where: { id } });
  if (existing.shoeId) await recomputeShoeMiles(existing.shoeId);

  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/history");
}

/** One-tap rest day for today. */
export async function logRestDay(): Promise<void> {
  const user = await requireUser();
  const today = dateInputToUTC(new Date().toISOString().slice(0, 10));

  await prisma.workoutLog.create({
    data: {
      athleteId: user.id,
      teamId: user.teamId ?? undefined,
      date: today,
      workoutType: "REST_DAY",
      distance: 0,
      feeling: "GOOD",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/dashboard?logged=rest");
}
