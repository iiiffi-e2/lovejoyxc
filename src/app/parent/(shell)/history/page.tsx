import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAthleteForParent,
  resolveParentChildId,
} from "@/lib/parent-access";
import { PageHeading } from "@/components/section";
import { LogList } from "@/components/log-row";
import { EmptyState } from "@/components/empty-state";
import { ChildHeader } from "@/components/parent/child-header";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { WORKOUT_TYPE_LABEL, enumOptions } from "@/lib/labels";
import { formatMiles } from "@/lib/format";
import { addDays, startOfMonth, startOfWeek } from "@/lib/dates";
import { totalMiles } from "@/lib/metrics";

const PERIODS: Record<string, string> = {
  all: "All time",
  week: "This week",
  month: "This month",
  "30d": "Last 30 days",
};

export default async function ParentHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; type?: string; period?: string }>;
}) {
  const user = await requireRole("PARENT");
  const sp = await searchParams;
  const childId = await resolveParentChildId(user.id, sp.child);
  if (!childId) redirect("/parent/profile");

  const athlete = await getAthleteForParent(childId);
  if (!athlete) redirect("/parent/profile");

  const type = sp.type ?? "";
  const period = sp.period ?? "all";

  const where: Prisma.WorkoutLogWhereInput = { athleteId: childId };
  if (type) where.workoutType = type as never;
  const now = new Date();
  if (period === "week") where.date = { gte: startOfWeek(now) };
  else if (period === "month") where.date = { gte: startOfMonth(now) };
  else if (period === "30d") where.date = { gte: addDays(now, -30) };

  const logs = await prisma.workoutLog.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: { shoe: { select: { name: true } } },
  });

  const miles = totalMiles(logs);

  return (
    <div className="animate-fade-in space-y-5">
      <ChildHeader athlete={athlete} />
      <PageHeading
        title="History"
        description={`${logs.length} logs · ${formatMiles(miles)} mi total`}
      />

      <form className="mb-5 grid grid-cols-2 gap-3" method="get">
        <input type="hidden" name="child" value={childId} />
        <Select name="type" defaultValue={type} aria-label="Workout type">
          <option value="">All workouts</option>
          {enumOptions(WORKOUT_TYPE_LABEL).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select name="period" defaultValue={period} aria-label="Period">
          {Object.entries(PERIODS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline" size="md" className="col-span-2">
          Apply filters
        </Button>
      </form>

      {logs.length > 0 ? (
        <LogList logs={logs} />
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No logs found"
          description="Try changing the filters."
        />
      )}
    </div>
  );
}
