import { requireRole } from "@/lib/auth";
import { getScheduleEventsForTeam } from "@/lib/queries";
import { ScheduleReadonlyPage } from "@/components/schedule/schedule-readonly-page";

export default async function AthleteSchedulePage() {
  const user = await requireRole("ATHLETE");
  const events = user.teamId
    ? await getScheduleEventsForTeam(user.teamId)
    : [];

  return <ScheduleReadonlyPage events={events} noTeam={!user.teamId} />;
}
