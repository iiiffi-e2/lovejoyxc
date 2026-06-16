"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { dateInputToUTC } from "@/lib/format";

const optionalText = (max: number) =>
  z.preprocess(
    (v) => {
      const s = String(v ?? "").trim();
      return s === "" ? undefined : s;
    },
    z.string().max(max).optional(),
  );

const eventSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["PRACTICE", "MEET", "CAMP", "OTHER"]),
  title: z.string().trim().min(1, "Title is required").max(120),
  date: z.string().min(1, "Date is required"),
  startTime: optionalText(10),
  endTime: optionalText(10),
  location: optionalText(200),
  notes: optionalText(1000),
});

function timeToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function validateTimes(startTime?: string, endTime?: string): string | null {
  if (endTime && !startTime) {
    return "Start time is required when end time is set.";
  }
  if (startTime && endTime) {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (start == null || end == null) {
      return "Enter valid times in HH:MM format.";
    }
    if (end <= start) {
      return "End time must be after start time.";
    }
  }
  return null;
}

export type ScheduleState = { error?: string; ok?: boolean };

function revalidateSchedulePaths() {
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath("/coach/schedule");
  revalidatePath("/admin/schedule");
}

async function requireTeamCoach() {
  const user = await requireRole("COACH", "ADMIN");
  if (!user.teamId) {
    return { user: null, error: "You must be assigned to a team to manage the schedule." };
  }
  return { user, error: null };
}

export async function createScheduleEvent(
  _prev: ScheduleState,
  formData: FormData,
): Promise<ScheduleState> {
  const { user, error } = await requireTeamCoach();
  if (!user) return { error: error! };

  const parsed = eventSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event." };
  }

  const timeError = validateTimes(parsed.data.startTime, parsed.data.endTime);
  if (timeError) return { error: timeError };

  await prisma.scheduleEvent.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      date: dateInputToUTC(parsed.data.date),
      startTime: parsed.data.startTime ?? null,
      endTime: parsed.data.endTime ?? null,
      location: parsed.data.location ?? null,
      notes: parsed.data.notes ?? null,
      teamId: user.teamId!,
      createdById: user.id,
    },
  });

  revalidateSchedulePaths();
  return { ok: true };
}

export async function updateScheduleEvent(
  _prev: ScheduleState,
  formData: FormData,
): Promise<ScheduleState> {
  const { user, error } = await requireTeamCoach();
  if (!user) return { error: error! };

  const parsed = eventSchema.safeParse({
    id: formData.get("id"),
    type: formData.get("type"),
    title: formData.get("title"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success || !parsed.data.id) {
    return { error: parsed.error?.issues[0]?.message ?? "Invalid event." };
  }

  const timeError = validateTimes(parsed.data.startTime, parsed.data.endTime);
  if (timeError) return { error: timeError };

  const existing = await prisma.scheduleEvent.findFirst({
    where: { id: parsed.data.id, teamId: user.teamId! },
  });
  if (!existing) return { error: "Event not found." };

  await prisma.scheduleEvent.update({
    where: { id: existing.id },
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      date: dateInputToUTC(parsed.data.date),
      startTime: parsed.data.startTime ?? null,
      endTime: parsed.data.endTime ?? null,
      location: parsed.data.location ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  revalidateSchedulePaths();
  return { ok: true };
}

export async function deleteScheduleEvent(id: string): Promise<void> {
  const { user, error } = await requireTeamCoach();
  if (!user) throw new Error(error!);

  const existing = await prisma.scheduleEvent.findFirst({
    where: { id, teamId: user.teamId! },
  });
  if (!existing) throw new Error("Event not found.");

  await prisma.scheduleEvent.delete({ where: { id } });
  revalidateSchedulePaths();
}
