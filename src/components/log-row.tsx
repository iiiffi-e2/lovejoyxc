import Link from "next/link";
import type { WorkoutLog } from "@prisma/client";
import { AlertTriangle } from "lucide-react";
import { FeelingChip, WorkoutTypeBadge } from "./domain-badges";
import { formatDuration, formatMiles, formatPace, formatShortDate } from "@/lib/format";
import { RUNNING_TYPES } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type LogRowData = Pick<
  WorkoutLog,
  | "id"
  | "date"
  | "workoutType"
  | "distance"
  | "durationSec"
  | "paceSec"
  | "effort"
  | "feeling"
  | "painFlag"
  | "notes"
> & {
  shoe?: { name: string } | null;
  athlete?: { id?: string; name: string } | null;
};

export function LogRow({
  log,
  href,
  showAthlete,
}: {
  log: LogRowData;
  href?: string;
  showAthlete?: boolean;
}) {
  const isRunning = RUNNING_TYPES.includes(log.workoutType);
  const content = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3.5 transition-colors",
        href && "hover:bg-surface",
      )}
    >
      <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-surface py-1.5">
        <span className="text-[10px] font-bold tracking-wide text-gray-400 uppercase">
          {formatShortDate(log.date).split(" ")[0]}
        </span>
        <span className="text-lg leading-none font-extrabold text-ink">
          {formatShortDate(log.date).split(" ")[1]}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <WorkoutTypeBadge type={log.workoutType} />
          {showAthlete && log.athlete ? (
            <span className="text-sm font-bold text-ink">
              {log.athlete.name}
            </span>
          ) : null}
          {log.painFlag ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-injury">
              <AlertTriangle className="h-3.5 w-3.5" /> Pain
            </span>
          ) : null}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
          {isRunning && log.distance > 0 ? (
            <span className="font-semibold text-ink">
              {formatMiles(log.distance)} mi
            </span>
          ) : null}
          {log.durationSec ? <span>{formatDuration(log.durationSec)}</span> : null}
          {log.paceSec ? <span>{formatPace(log.paceSec)}</span> : null}
          {log.effort ? (
            <span className="text-gray-500">Effort {log.effort}/10</span>
          ) : null}
          {log.shoe ? (
            <span className="truncate text-gray-400">· {log.shoe.name}</span>
          ) : null}
        </div>

        {log.notes ? (
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">{log.notes}</p>
        ) : null}
      </div>

      <div className="shrink-0 pt-0.5">
        <FeelingChip feeling={log.feeling} withLabel={false} />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

export function LogList({
  logs,
  hrefForLog,
  showAthlete,
}: {
  logs: LogRowData[];
  hrefForLog?: (log: LogRowData) => string | undefined;
  showAthlete?: boolean;
}) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {logs.map((log) => (
        <LogRow
          key={log.id}
          log={log}
          href={hrefForLog?.(log)}
          showAthlete={showAthlete}
        />
      ))}
    </div>
  );
}
