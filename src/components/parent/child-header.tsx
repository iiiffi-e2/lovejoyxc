import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { GENDER_TEAM_LABEL, TEAM_GROUP_LABEL } from "@/lib/labels";
import type { LinkedAthlete } from "@/lib/parent-access";

export function ChildHeader({ athlete }: { athlete: LinkedAthlete }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
      <UserAvatar name={athlete.name} avatarUrl={athlete.avatarUrl} size="lg" />
      <div>
        <h2 className="text-lg font-extrabold text-ink">{athlete.name}</h2>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {athlete.grade ? <Badge tone="ink">Grade {athlete.grade}</Badge> : null}
          {athlete.teamGroup ? (
            <Badge tone="brand">{TEAM_GROUP_LABEL[athlete.teamGroup]}</Badge>
          ) : (
            <Badge tone="neutral">Unassigned</Badge>
          )}
          {athlete.genderTeam ? (
            <Badge tone="neutral">{GENDER_TEAM_LABEL[athlete.genderTeam]}</Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
