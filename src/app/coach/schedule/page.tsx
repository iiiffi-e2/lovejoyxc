import { requireRole } from "@/lib/auth";
import { getScheduleEventsForTeam } from "@/lib/queries";
import { ScheduleManagePage } from "@/components/schedule/schedule-manage-page";

export default async function CoachSchedulePage() {
  const user = await requireRole("COACH", "ADMIN");
  const events = user.teamId
    ? await getScheduleEventsForTeam(user.teamId)
    : [];

  return <ScheduleManagePage events={events} noTeam={!user.teamId} />;
}
