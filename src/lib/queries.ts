import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { startOfUTCDay } from "./format";
import {
  addDays,
  lastWeeks,
  startOfMonth,
  startOfWeek,
  weekRange,
} from "./dates";
import {
  changePercent,
  currentStreak,
  feelingTrend,
  isSpike,
  milesInRange,
} from "./metrics";

export const SHOE_WARN_THRESHOLD = 0.85; // warn when 85% of limit reached

/* ----------------------------- Athlete views ----------------------------- */

export async function getAthleteDashboard(athleteId: string) {
  const since = addDays(startOfWeek(new Date()), -7 * 8); // last 8 weeks window
  const [logs, shoes, lastWorkout, recentLogs] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { athleteId, date: { gte: since } },
      select: {
        date: true,
        distance: true,
        feeling: true,
        effort: true,
        painFlag: true,
        workoutType: true,
      },
    }),
    prisma.shoe.findMany({
      where: { athleteId, retired: false },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workoutLog.findFirst({
      where: { athleteId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { shoe: { select: { name: true } } },
    }),
    prisma.workoutLog.findMany({
      where: { athleteId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { shoe: { select: { name: true } } },
    }),
  ]);

  const allDates = await prisma.workoutLog.findMany({
    where: { athleteId },
    select: { date: true },
    orderBy: { date: "desc" },
    take: 400,
  });

  const thisWeek = weekRange(0);
  const lastWeek = weekRange(-1);
  const now = new Date();

  const weekly = lastWeeks(8).map((w) => ({
    label: w.start.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    }),
    miles: milesInRange(logs, w.start, w.end),
    highlight: w.start.getTime() === thisWeek.start.getTime(),
  }));

  const shoeAlerts = shoes
    .map((s) => ({
      ...s,
      pct: s.mileageLimit > 0 ? s.totalMiles / s.mileageLimit : 0,
    }))
    .filter((s) => s.pct >= SHOE_WARN_THRESHOLD);

  return {
    thisWeekMiles: milesInRange(logs, thisWeek.start, thisWeek.end),
    lastWeekMiles: milesInRange(logs, lastWeek.start, lastWeek.end),
    monthMiles: milesInRange(logs, startOfMonth(now), addDays(now, 1)),
    streak: currentStreak(allDates.map((d) => d.date)),
    lastWorkout,
    recentLogs,
    shoes,
    shoeAlerts,
    weekly,
  };
}

export async function getAthleteShoes(athleteId: string) {
  return prisma.shoe.findMany({
    where: { athleteId },
    orderBy: [{ retired: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { workoutLogs: true } } },
  });
}

export type TeamLogFilters = {
  athleteId?: string;
  workoutType?: string;
  from?: Date;
};

export async function getTeamAthletes(teamId: string) {
  return prisma.user.findMany({
    where: { teamId, role: "ATHLETE", active: true },
    select: { id: true, name: true, grade: true, teamGroup: true },
    orderBy: { name: "asc" },
  });
}

export async function getTeamLogs(
  teamId: string,
  filters: TeamLogFilters = {},
  take = 100,
) {
  const where: Prisma.WorkoutLogWhereInput = {
    teamId,
    athlete: { role: "ATHLETE", active: true, teamId },
  };
  if (filters.athleteId) where.athleteId = filters.athleteId;
  if (filters.workoutType) where.workoutType = filters.workoutType as never;
  if (filters.from) where.date = { gte: filters.from };

  return prisma.workoutLog.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: {
      athlete: { select: { id: true, name: true } },
      shoe: { select: { name: true } },
    },
  });
}

/** Recompute a shoe's total mileage from starting miles plus logged runs. */
export async function recomputeShoeMiles(shoeId: string) {
  const shoe = await prisma.shoe.findUnique({
    where: { id: shoeId },
    select: { startingMiles: true },
  });
  if (!shoe) return;

  const agg = await prisma.workoutLog.aggregate({
    where: { shoeId },
    _sum: { distance: true },
  });
  const loggedMiles = agg._sum.distance ?? 0;
  await prisma.shoe.update({
    where: { id: shoeId },
    data: {
      totalMiles:
        Math.round((shoe.startingMiles + loggedMiles) * 10) / 10,
    },
  });
}

/* ------------------------------- Coach views ------------------------------ */

export type CoachFilters = {
  athleteId?: string;
  grade?: number;
  teamGroup?: string;
  genderTeam?: string;
  workoutType?: string;
  from?: Date;
  to?: Date;
};

export async function getCoachAthletes(filters: CoachFilters = {}) {
  const where: Prisma.UserWhereInput = {
    role: "ATHLETE",
    active: true,
  };
  if (filters.grade) where.grade = filters.grade;
  if (filters.teamGroup) where.teamGroup = filters.teamGroup as never;
  if (filters.genderTeam) where.genderTeam = filters.genderTeam as never;
  if (filters.athleteId) where.id = filters.athleteId;

  return prisma.user.findMany({
    where,
    orderBy: [{ name: "asc" }],
  });
}

export type AthleteStatusRow = Awaited<
  ReturnType<typeof getTeamStatusRows>
>[number];

export async function getTeamStatusRows(filters: CoachFilters = {}) {
  const athletes = await getCoachAthletes(filters);
  const since = addDays(startOfWeek(new Date()), -7); // this + last week

  const logs = await prisma.workoutLog.findMany({
    where: {
      athleteId: { in: athletes.map((a) => a.id) },
      date: { gte: since },
    },
    select: {
      athleteId: true,
      date: true,
      distance: true,
      feeling: true,
      painFlag: true,
    },
  });

  const lastLogs = await prisma.workoutLog.groupBy({
    by: ["athleteId"],
    where: { athleteId: { in: athletes.map((a) => a.id) } },
    _max: { date: true },
  });
  const lastLogMap = new Map(
    lastLogs.map((l) => [l.athleteId, l._max.date as Date | null]),
  );

  const thisWeek = weekRange(0);
  const lastWeek = weekRange(-1);
  const today = startOfUTCDay(new Date()).getTime();

  return athletes.map((a) => {
    const aLogs = logs.filter((l) => l.athleteId === a.id);
    const thisWeekMiles = milesInRange(aLogs, thisWeek.start, thisWeek.end);
    const lastWeekMiles = milesInRange(aLogs, lastWeek.start, lastWeek.end);
    const change = changePercent(thisWeekMiles, lastWeekMiles);
    const lastLogged = lastLogMap.get(a.id) ?? null;
    const thisWeekLogs = aLogs.filter(
      (l) => l.date >= thisWeek.start && l.date < thisWeek.end,
    );
    const painThisWeek = thisWeekLogs.some((l) => l.painFlag);
    const loggedToday =
      lastLogged != null && startOfUTCDay(lastLogged).getTime() === today;
    const daysSince =
      lastLogged == null
        ? Infinity
        : Math.round((today - startOfUTCDay(lastLogged).getTime()) / 86400000);

    let status: {
      label: string;
      tone: "success" | "warning" | "injury" | "neutral" | "brand";
    };
    if (painThisWeek) status = { label: "Pain reported", tone: "injury" };
    else if (isSpike(thisWeekMiles, lastWeekMiles))
      status = { label: "Mileage spike", tone: "warning" };
    else if (daysSince >= 2)
      status = { label: "Needs check-in", tone: "warning" };
    else if (loggedToday) status = { label: "Logged today", tone: "success" };
    else status = { label: "On track", tone: "neutral" };

    return {
      athlete: a,
      lastLogged,
      daysSince,
      thisWeekMiles,
      lastWeekMiles,
      change,
      feeling: feelingTrend(thisWeekLogs),
      painFlag: painThisWeek,
      status,
    };
  });
}

export async function getCoachDashboard(filters: CoachFilters = {}) {
  const rows = await getTeamStatusRows(filters);
  const thisWeek = weekRange(0);

  const teamMilesThisWeek =
    Math.round(rows.reduce((s, r) => s + r.thisWeekMiles, 0) * 10) / 10;
  const loggedToday = rows.filter(
    (r) => r.status.label === "Logged today",
  ).length;
  const missing = rows.filter((r) => r.daysSince >= 2);
  const injuries = rows.filter((r) => r.painFlag);
  const spikes = rows.filter((r) => isSpike(r.thisWeekMiles, r.lastWeekMiles));
  const avgWeekly =
    rows.length > 0
      ? Math.round((teamMilesThisWeek / rows.length) * 10) / 10
      : 0;

  // Shoe warnings across the team
  const shoes = await prisma.shoe.findMany({
    where: {
      retired: false,
      athlete: { role: "ATHLETE", active: true },
    },
    include: { athlete: { select: { id: true, name: true } } },
  });
  const shoeWarnings = shoes.filter(
    (s) => s.mileageLimit > 0 && s.totalMiles / s.mileageLimit >= SHOE_WARN_THRESHOLD,
  );

  // Recent team logs
  const recentLogs = await prisma.workoutLog.findMany({
    where: {
      athlete: { role: "ATHLETE", active: true },
      ...(filters.athleteId ? { athleteId: filters.athleteId } : {}),
      ...(filters.workoutType
        ? { workoutType: filters.workoutType as never }
        : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 12,
    include: {
      athlete: { select: { id: true, name: true } },
      shoe: { select: { name: true } },
    },
  });

  // 8-week team mileage trend
  const since = addDays(thisWeek.start, -7 * 7);
  const teamLogs = await prisma.workoutLog.findMany({
    where: {
      athlete: { role: "ATHLETE", active: true },
      date: { gte: since },
    },
    select: { date: true, distance: true },
  });
  const trend = lastWeeks(8).map((w) => ({
    label: w.start.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    }),
    miles: milesInRange(teamLogs, w.start, w.end),
    highlight: w.start.getTime() === thisWeek.start.getTime(),
  }));

  return {
    rows,
    teamMilesThisWeek,
    loggedToday,
    athleteCount: rows.length,
    missing,
    injuries,
    spikes,
    avgWeekly,
    shoeWarnings,
    recentLogs,
    trend,
  };
}

function logWhereFromFilters(filters: CoachFilters): Prisma.WorkoutLogWhereInput {
  const where: Prisma.WorkoutLogWhereInput = {
    athlete: {
      role: "ATHLETE",
      active: true,
      ...(filters.grade ? { grade: filters.grade } : {}),
      ...(filters.teamGroup ? { teamGroup: filters.teamGroup as never } : {}),
      ...(filters.genderTeam ? { genderTeam: filters.genderTeam as never } : {}),
    },
  };
  if (filters.athleteId) where.athleteId = filters.athleteId;
  if (filters.workoutType) where.workoutType = filters.workoutType as never;
  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }
  return where;
}

export async function getCoachLogs(filters: CoachFilters = {}, take = 300) {
  return prisma.workoutLog.findMany({
    where: logWhereFromFilters(filters),
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: {
      athlete: { select: { id: true, name: true, grade: true, teamGroup: true } },
      shoe: { select: { name: true } },
    },
  });
}

export async function getFlaggedLogs() {
  const since = addDays(startOfUTCDay(new Date()), -7);
  return prisma.workoutLog.findMany({
    where: {
      date: { gte: since },
      athlete: { role: "ATHLETE", active: true },
      OR: [
        { painFlag: true },
        { feeling: { in: ["ROUGH", "PAIN"] } },
        { effort: { gte: 9 } },
        { soreness: { in: ["MODERATE", "HIGH"] } },
      ],
    },
    orderBy: [{ date: "desc" }],
    include: {
      athlete: { select: { id: true, name: true } },
      shoe: { select: { name: true } },
    },
    take: 50,
  });
}

export async function getWeeklyMileageByAthlete(
  weeks = 6,
  filters: CoachFilters = {},
) {
  const athletes = await getCoachAthletes(filters);
  const ranges = lastWeeks(weeks);
  const since = ranges[0].start;

  const logs = await prisma.workoutLog.findMany({
    where: { athleteId: { in: athletes.map((a) => a.id) }, date: { gte: since } },
    select: { athleteId: true, date: true, distance: true },
  });

  const labels = ranges.map((w) =>
    w.start.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    }),
  );

  const rows = athletes.map((a) => {
    const aLogs = logs.filter((l) => l.athleteId === a.id);
    const weekly = ranges.map((w) => milesInRange(aLogs, w.start, w.end));
    const total = Math.round(weekly.reduce((s, v) => s + v, 0) * 10) / 10;
    const thisWeek = weekly[weekly.length - 1];
    const lastWeek = weekly[weekly.length - 2] ?? 0;
    return {
      athlete: a,
      weekly,
      total,
      change: changePercent(thisWeek, lastWeek),
      spike: isSpike(thisWeek, lastWeek),
    };
  });

  const teamWeekly = ranges.map((_, i) =>
    Math.round(rows.reduce((s, r) => s + r.weekly[i], 0) * 10) / 10,
  );

  return { labels, rows, teamWeekly };
}

export async function getAthleteProfileForCoach(athleteId: string) {
  const athlete = await prisma.user.findUnique({ where: { id: athleteId } });
  if (!athlete) return null;

  const since = addDays(startOfWeek(new Date()), -7 * 12);
  const [logs, recentLogs, shoes, notes, painHistory] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { athleteId, date: { gte: since } },
      select: {
        date: true,
        distance: true,
        feeling: true,
        effort: true,
        painFlag: true,
        workoutType: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.workoutLog.findMany({
      where: { athleteId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: { shoe: { select: { name: true } } },
    }),
    prisma.shoe.findMany({
      where: { athleteId },
      orderBy: [{ retired: "asc" }, { createdAt: "desc" }],
    }),
    prisma.coachNote.findMany({
      where: { athleteId },
      orderBy: { createdAt: "desc" },
      include: { coach: { select: { name: true } } },
    }),
    prisma.workoutLog.findMany({
      where: { athleteId, painFlag: true },
      orderBy: { date: "desc" },
      take: 10,
      select: { id: true, date: true, soreness: true, notes: true, feeling: true },
    }),
  ]);

  const weekly = lastWeeks(12).map((w) => ({
    label: w.start.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      timeZone: "UTC",
    }),
    miles: milesInRange(logs, w.start, w.end),
  }));

  // Effort & feeling trend over the last weeks
  const effortTrend = lastWeeks(8).map((w) => {
    const wl = logs.filter((l) => l.date >= w.start && l.date < w.end);
    const efforts = wl.map((l) => l.effort).filter((e): e is number => !!e);
    return {
      label: w.start.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        timeZone: "UTC",
      }),
      value: efforts.length
        ? Math.round(
            (efforts.reduce((a, b) => a + b, 0) / efforts.length) * 10,
          ) / 10
        : null,
    };
  });
  const feelingTrendData = lastWeeks(8).map((w) => {
    const wl = logs.filter((l) => l.date >= w.start && l.date < w.end);
    const t = feelingTrend(wl);
    return {
      label: w.start.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        timeZone: "UTC",
      }),
      value: t != null ? Math.round(t * 10) / 10 : null,
    };
  });

  const thisWeek = weekRange(0);
  const lastWeek = weekRange(-1);

  return {
    athlete,
    weekly,
    effortTrend,
    feelingTrendData,
    recentLogs,
    shoes,
    notes,
    painHistory,
    thisWeekMiles: milesInRange(logs, thisWeek.start, thisWeek.end),
    lastWeekMiles: milesInRange(logs, lastWeek.start, lastWeek.end),
  };
}

export type ScheduleEventRow = {
  id: string;
  type: import("@prisma/client").ScheduleEventType;
  title: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
};

export async function getScheduleEventsForTeam(
  teamId: string,
  options?: { from?: Date; to?: Date },
): Promise<ScheduleEventRow[]> {
  const where: Prisma.ScheduleEventWhereInput = { teamId };
  if (options?.from || options?.to) {
    where.date = {};
    if (options.from) where.date.gte = startOfUTCDay(options.from);
    if (options.to) where.date.lt = options.to;
  }

  return prisma.scheduleEvent.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    select: {
      id: true,
      type: true,
      title: true,
      date: true,
      startTime: true,
      endTime: true,
      location: true,
      notes: true,
    },
  });
}

export async function getThisWeekSchedule(teamId: string): Promise<ScheduleEventRow[]> {
  const { start, end } = weekRange(0);
  return getScheduleEventsForTeam(teamId, { from: start, to: end });
}

export async function getScheduleEvent(id: string, teamId: string) {
  return prisma.scheduleEvent.findFirst({
    where: { id, teamId },
  });
}

export async function getParentAccessData(athleteId: string) {
  const [links, pendingInvites] = await Promise.all([
    prisma.parentAthleteLink.findMany({
      where: { athleteId },
      include: {
        parent: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parentInviteToken.findMany({
      where: {
        athleteId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { links, pendingInvites };
}
