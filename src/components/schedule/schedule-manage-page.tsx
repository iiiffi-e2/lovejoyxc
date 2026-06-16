import { Card, CardContent } from "@/components/ui/card";
import { PageHeading, SectionTitle } from "@/components/section";
import { ScheduleEventForm } from "./schedule-event-form";
import { ScheduleEventList } from "./schedule-event-list";
import type { ScheduleEventCardData } from "./schedule-event-card";

export function ScheduleManagePage({
  events,
  noTeam,
}: {
  events: ScheduleEventCardData[];
  noTeam?: boolean;
}) {
  return (
    <div className="space-y-7 animate-fade-in">
      <PageHeading
        title="Team schedule"
        description="Add practices and meets for your athletes."
      />

      {noTeam ? (
        <p className="text-sm font-medium text-injury">
          You must be assigned to a team to manage the schedule.
        </p>
      ) : (
        <>
          <div>
            <SectionTitle title="Add event" />
            <Card>
              <CardContent>
                <ScheduleEventForm />
              </CardContent>
            </Card>
          </div>

          <div>
            <SectionTitle title="All events" />
            <ScheduleEventList events={events} manage />
          </div>
        </>
      )}
    </div>
  );
}
