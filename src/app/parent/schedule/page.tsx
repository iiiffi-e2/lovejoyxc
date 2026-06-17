import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getAthleteForParent,
  resolveParentChildId,
} from "@/lib/parent-access";
import { getScheduleEventsForTeam } from "@/lib/queries";
import { ChildHeader } from "@/components/parent/child-header";
import { ScheduleReadonlyPage } from "@/components/schedule/schedule-readonly-page";

export default async function ParentSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const user = await requireRole("PARENT");
  const sp = await searchParams;
  const childId = await resolveParentChildId(user.id, sp.child);
  if (!childId) redirect("/parent/profile");

  const athlete = await getAthleteForParent(childId);
  if (!athlete) redirect("/parent/profile");

  const events = athlete.teamId
    ? await getScheduleEventsForTeam(athlete.teamId)
    : [];

  return (
    <div className="space-y-5 animate-fade-in">
      <ChildHeader athlete={athlete} />
      <ScheduleReadonlyPage events={events} noTeam={!athlete.teamId} />
    </div>
  );
}
