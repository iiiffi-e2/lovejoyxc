"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check } from "lucide-react";
import type {
  Feeling,
  Soreness,
  Surface,
  WorkoutType,
} from "@prisma/client";
import type { WorkoutFormState } from "@/app/actions/workout";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  FEELING_EMOJI,
  FEELING_LABEL,
  FEELING_ORDER,
  RUNNING_TYPES,
  SORENESS_LABEL,
  SURFACE_LABEL,
  WORKOUT_TYPE_LABEL,
  enumOptions,
} from "@/lib/labels";
import {
  computePaceSec,
  formatDuration,
  formatPace,
  parseDurationToSeconds,
  toDateInputValue,
} from "@/lib/format";

type Action = (
  prev: WorkoutFormState,
  formData: FormData,
) => Promise<WorkoutFormState>;

export type WorkoutDefaults = {
  date?: string;
  workoutType?: WorkoutType;
  distance?: number | null;
  durationSec?: number | null;
  shoeId?: string | null;
  effort?: number | null;
  feeling?: Feeling | null;
  soreness?: Soreness;
  painFlag?: boolean;
  surface?: Surface | null;
  notes?: string | null;
};

const WORKOUT_ORDER: WorkoutType[] = [
  "EASY_RUN",
  "WORKOUT",
  "LONG_RUN",
  "RECOVERY_RUN",
  "RACE",
  "CROSS_TRAINING",
  "STRENGTH",
  "REST_DAY",
  "INJURY_RECOVERY",
];

const SORENESS_ORDER: Soreness[] = ["NONE", "MILD", "MODERATE", "HIGH"];

export function WorkoutForm({
  action,
  shoes,
  defaults,
  submitLabel = "Save run",
}: {
  action: Action;
  shoes: { id: string; name: string }[];
  defaults?: WorkoutDefaults;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, {} as WorkoutFormState);

  const [workoutType, setWorkoutType] = useState<WorkoutType>(
    defaults?.workoutType ?? "EASY_RUN",
  );
  const [distance, setDistance] = useState<string>(
    defaults?.distance ? String(defaults.distance) : "",
  );
  const [duration, setDuration] = useState<string>(
    defaults?.durationSec ? formatDuration(defaults.durationSec) : "",
  );
  const [effort, setEffort] = useState<number>(defaults?.effort ?? 5);
  const [feeling, setFeeling] = useState<Feeling | null>(
    defaults?.feeling ?? null,
  );
  const [soreness, setSoreness] = useState<Soreness>(
    defaults?.soreness ?? "NONE",
  );
  const [painFlag, setPainFlag] = useState<boolean>(defaults?.painFlag ?? false);

  const isRunning = RUNNING_TYPES.includes(workoutType);
  const durationSec = useMemo(
    () => parseDurationToSeconds(duration),
    [duration],
  );
  const paceSec = useMemo(
    () => computePaceSec(Number(distance) || 0, durationSec),
    [distance, durationSec],
  );

  return (
    <form action={formAction} className="space-y-6">
      {/* Date */}
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          name="date"
          type="date"
          defaultValue={defaults?.date ?? toDateInputValue(new Date())}
          required
        />
      </div>

      {/* Workout type */}
      <div>
        <Label>Workout type</Label>
        <input type="hidden" name="workoutType" value={workoutType} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {WORKOUT_ORDER.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setWorkoutType(t)}
              className={cn(
                "rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                workoutType === t
                  ? "border-brand bg-brand text-white shadow-sm"
                  : "border-line bg-white text-ink hover:bg-surface",
              )}
            >
              {WORKOUT_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Distance + duration (running only) */}
      {isRunning ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="distance">Distance (mi)</Label>
            <Input
              id="distance"
              name="distance"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="5.0"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="duration">Duration</Label>
            <Input
              id="duration"
              type="text"
              inputMode="numeric"
              placeholder="40:00"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <input type="hidden" name="durationSec" value={durationSec ?? ""} />
          <div className="col-span-2">
            <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
              <span className="text-sm font-semibold text-gray-500">
                Pace (auto)
              </span>
              <span className="text-lg font-extrabold text-brand">
                {formatPace(paceSec)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <Label htmlFor="duration">Duration (optional)</Label>
          <Input
            id="duration"
            type="text"
            inputMode="numeric"
            placeholder="30:00"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <input type="hidden" name="durationSec" value={durationSec ?? ""} />
        </div>
      )}

      {/* Shoes (running only) */}
      {isRunning && shoes.length > 0 ? (
        <div>
          <Label htmlFor="shoeId">Shoes</Label>
          <Select id="shoeId" name="shoeId" defaultValue={defaults?.shoeId ?? ""}>
            <option value="">No shoes selected</option>
            {shoes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      {isRunning && shoes.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-gray-600">
          <Link href="/shoes" className="font-semibold text-brand hover:underline">
            Add shoes
          </Link>{" "}
          to track mileage on each run.
        </p>
      ) : null}

      {/* Feeling */}
      <div>
        <Label>How did it feel?</Label>
        <input type="hidden" name="feeling" value={feeling ?? ""} />
        <div className="grid grid-cols-5 gap-2">
          {FEELING_ORDER.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFeeling(f)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-all",
                feeling === f
                  ? "border-brand bg-brand-light shadow-sm"
                  : "border-line bg-white hover:bg-surface",
              )}
            >
              <span className="text-2xl leading-none">{FEELING_EMOJI[f]}</span>
              <span className="text-[10px] font-semibold text-gray-500">
                {FEELING_LABEL[f].split("/")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Effort */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label className="mb-0">Effort</Label>
          <span className="text-sm font-bold text-brand">{effort}/10</span>
        </div>
        <input type="hidden" name="effort" value={effort} />
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={effort}
          onChange={(e) => setEffort(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface accent-brand"
        />
        <div className="mt-1 flex justify-between text-[11px] font-medium text-gray-400">
          <span>Easy</span>
          <span>All out</span>
        </div>
      </div>

      {/* Soreness */}
      <div>
        <Label>Soreness</Label>
        <input type="hidden" name="soreness" value={soreness} />
        <div className="grid grid-cols-4 gap-2">
          {SORENESS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSoreness(s)}
              className={cn(
                "rounded-xl border px-2 py-2.5 text-sm font-semibold transition-colors",
                soreness === s
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-ink hover:bg-surface",
              )}
            >
              {SORENESS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Surface */}
      <div>
        <Label htmlFor="surface">Surface</Label>
        <Select id="surface" name="surface" defaultValue={defaults?.surface ?? ""}>
          <option value="">Not specified</option>
          {enumOptions(SURFACE_LABEL).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Pain flag */}
      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
        <span>
          <span className="block text-sm font-bold text-ink">
            Report pain or injury
          </span>
          <span className="block text-xs text-gray-500">
            Flags this for your coach to review
          </span>
        </span>
        <input
          type="checkbox"
          name="painFlag"
          checked={painFlag}
          onChange={(e) => setPainFlag(e.target.checked)}
          className="h-6 w-6 accent-injury"
        />
      </label>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="How was the run? Anything to remember?"
          defaultValue={defaults?.notes ?? ""}
        />
      </div>

      {state.error ? (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-injury">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <SubmitButton label={submitLabel} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      <Check className="h-5 w-5" />
      {pending ? "Saving…" : label}
    </Button>
  );
}
