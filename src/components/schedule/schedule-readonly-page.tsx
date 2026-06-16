import { PageHeading, SectionTitle } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import { CalendarDays } from "lucide-react";
import { ScheduleEventList } from "./schedule-event-list";
import type { ScheduleEventCardData } from "./schedule-event-card";

export function ScheduleReadonlyPage({
  events,
  noTeam,
}: {
  events: ScheduleEventCardData[];
  noTeam?: boolean;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeading
        title="Schedule"
        description="Practices and meets for your team."
      />

      {noTeam ? (
        <EmptyState
          icon={CalendarDays}
          title="No team assigned"
          description="Your coach will add you to the team roster."
        />
      ) : (
        <>
          <SectionTitle title="Season schedule" />
          <ScheduleEventList events={events} />
        </>
      )}
    </div>
  );
}
