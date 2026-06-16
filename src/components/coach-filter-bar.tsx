import Link from "next/link";
import { Download } from "lucide-react";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  GENDER_TEAM_LABEL,
  TEAM_GROUP_LABEL,
  WORKOUT_TYPE_LABEL,
  enumOptions,
} from "@/lib/labels";

export type FilterField =
  | "athlete"
  | "grade"
  | "teamGroup"
  | "genderTeam"
  | "workoutType"
  | "from"
  | "to";

export function CoachFilterBar({
  action,
  fields,
  values,
  athletes,
  exportHref,
}: {
  action: string;
  fields: FilterField[];
  values: Record<string, string | undefined>;
  athletes?: { id: string; name: string }[];
  exportHref?: string;
}) {
  return (
    <form
      method="get"
      action={action}
      className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4"
    >
      {fields.includes("athlete") && athletes ? (
        <Labeled label="Athlete">
          <Select name="athleteId" defaultValue={values.athleteId ?? ""}>
            <option value="">All athletes</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Labeled>
      ) : null}

      {fields.includes("grade") ? (
        <Labeled label="Grade">
          <Select name="grade" defaultValue={values.grade ?? ""}>
            <option value="">All grades</option>
            {[9, 10, 11, 12].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </Select>
        </Labeled>
      ) : null}

      {fields.includes("teamGroup") ? (
        <Labeled label="Group">
          <Select name="teamGroup" defaultValue={values.teamGroup ?? ""}>
            <option value="">All groups</option>
            {enumOptions(TEAM_GROUP_LABEL).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Labeled>
      ) : null}

      {fields.includes("genderTeam") ? (
        <Labeled label="Team">
          <Select name="genderTeam" defaultValue={values.genderTeam ?? ""}>
            <option value="">Boys & Girls</option>
            {enumOptions(GENDER_TEAM_LABEL).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Labeled>
      ) : null}

      {fields.includes("workoutType") ? (
        <Labeled label="Workout">
          <Select name="workoutType" defaultValue={values.workoutType ?? ""}>
            <option value="">All workouts</option>
            {enumOptions(WORKOUT_TYPE_LABEL).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Labeled>
      ) : null}

      {fields.includes("from") ? (
        <Labeled label="From">
          <input
            type="date"
            name="from"
            defaultValue={values.from ?? ""}
            className="h-12 rounded-xl border border-line bg-white px-3 text-base text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
        </Labeled>
      ) : null}

      {fields.includes("to") ? (
        <Labeled label="To">
          <input
            type="date"
            name="to"
            defaultValue={values.to ?? ""}
            className="h-12 rounded-xl border border-line bg-white px-3 text-base text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
        </Labeled>
      ) : null}

      <div className="flex items-end gap-2">
        <Button type="submit" variant="outline" size="md">
          Apply
        </Button>
        {exportHref ? (
          <Button asChild variant="ghost" size="md">
            <Link href={exportHref}>
              <Download className="h-4 w-4" />
              CSV
            </Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-[140px] flex-1 flex-col">
      <span className="mb-1 text-xs font-semibold text-gray-500">{label}</span>
      {children}
    </div>
  );
}
