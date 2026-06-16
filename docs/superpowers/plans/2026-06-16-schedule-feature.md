# Team Schedule Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let coaches and admins add one-off practice/meet events that athletes see on their dashboard (this week) and on a full schedule page.

**Architecture:** New `ScheduleEvent` Prisma model scoped to `Team`. Server actions for CRUD (coach/admin only). Shared schedule components for manage pages at `/coach/schedule` and `/admin/schedule`. Athletes read via queries filtered by `teamId` and week range.

**Tech Stack:** Next.js 16 App Router, Prisma 6, PostgreSQL, Zod, server actions, Tailwind

**Spec:** `docs/superpowers/specs/2026-06-16-schedule-feature-design.md`

**Note:** This repo has no automated test runner. Verification = `npm run lint`, `npm run build`, and manual QA steps listed per task.

---

## File Map

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | `ScheduleEventType` enum, `ScheduleEvent` model, relations |
| `src/lib/labels.ts` | Practice/Meet display labels |
| `src/lib/format.ts` | `formatScheduleTime` helper |
| `src/lib/queries.ts` | Team schedule queries |
| `src/app/actions/schedule.ts` | Create/update/delete server actions |
| `src/components/domain-badges.tsx` | `ScheduleEventTypeBadge` |
| `src/components/schedule/schedule-event-card.tsx` | Single event display |
| `src/components/schedule/schedule-event-list.tsx` | List with optional manage actions |
| `src/components/schedule/schedule-event-form.tsx` | Add/edit form |
| `src/components/schedule/schedule-manage-page.tsx` | Coach/admin manage UI |
| `src/app/coach/schedule/page.tsx` | Coach route |
| `src/app/admin/schedule/page.tsx` | Admin route |
| `src/app/(athlete)/schedule/page.tsx` | Athlete full schedule |
| `src/app/(athlete)/dashboard/page.tsx` | This-week section |
| `src/components/nav/nav-config.ts` | Nav items |
| `src/components/nav/nav-icons.ts` | Calendar icon |
| `prisma/seed.ts` | Sample events |

---

## Task 1: Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enum and model**

After the `Surface` enum block, add:

```prisma
enum ScheduleEventType {
  PRACTICE
  MEET
}
```

After the `CoachNote` model, add:

```prisma
model ScheduleEvent {
  id          String            @id @default(cuid())
  type        ScheduleEventType
  title       String
  date        DateTime          @db.Date
  startTime   String?
  location    String?
  notes       String?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  teamId      String
  team        Team              @relation(fields: [teamId], references: [id], onDelete: Cascade)

  createdById String
  createdBy   User              @relation(fields: [createdById], references: [id], onDelete: Cascade)

  @@index([teamId, date])
}
```

On `Team`, add:

```prisma
scheduleEvents ScheduleEvent[]
```

On `User`, add:

```prisma
createdScheduleEvents ScheduleEvent[]
```

- [ ] **Step 2: Push schema**

Run: `npm run db:push`  
Expected: Schema synced without errors.

- [ ] **Step 3: Regenerate client**

Run: `npx prisma generate`  
Expected: `@prisma/client` types include `ScheduleEvent` and `ScheduleEventType`.

---

## Task 2: Labels & Format Helpers

**Files:**
- Modify: `src/lib/labels.ts`
- Modify: `src/lib/format.ts`

- [ ] **Step 1: Add schedule labels**

In `src/lib/labels.ts`, import `ScheduleEventType` and add:

```typescript
export const SCHEDULE_EVENT_TYPE_LABEL: Record<ScheduleEventType, string> = {
  PRACTICE: "Practice",
  MEET: "Meet",
};
```

- [ ] **Step 2: Add time formatter**

In `src/lib/format.ts`, add:

```typescript
/** Format stored startTime ("06:30" or "15:30") for display. */
export function formatScheduleTime(startTime?: string | null): string {
  if (!startTime?.trim()) return "";
  const match = startTime.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return startTime.trim();
  const hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}
```

---

## Task 3: Schedule Queries

**Files:**
- Modify: `src/lib/queries.ts`

- [ ] **Step 1: Add query functions**

At the end of `src/lib/queries.ts`, add:

```typescript
import { weekRange } from "./dates";
import { startOfUTCDay } from "./format";

export type ScheduleEventRow = {
  id: string;
  type: import("@prisma/client").ScheduleEventType;
  title: string;
  date: Date;
  startTime: string | null;
  location: string | null;
  notes: string | null;
};

export async function getScheduleEventsForTeam(
  teamId: string,
  options?: { from?: Date; to?: Date },
): Promise<ScheduleEventRow[]> {
  const where: Prisma.ScheduleEventWhereInput = { teamId };
  if (options?.from || options?.to) {
    where.date = {};
    if (options.from) where.date.gte = startOfUTCDay(options.from);
    if (options.to) where.date.lt = options.to;
  }

  return prisma.scheduleEvent.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    select: {
      id: true,
      type: true,
      title: true,
      date: true,
      startTime: true,
      location: true,
      notes: true,
    },
  });
}

export async function getThisWeekSchedule(teamId: string): Promise<ScheduleEventRow[]> {
  const { start, end } = weekRange(0);
  return getScheduleEventsForTeam(teamId, { from: start, to: end });
}

export async function getScheduleEvent(id: string, teamId: string) {
  return prisma.scheduleEvent.findFirst({
    where: { id, teamId },
  });
}
```

Ensure `Prisma` is already imported at top of file (it is).

---

## Task 4: Server Actions

**Files:**
- Create: `src/app/actions/schedule.ts`

- [ ] **Step 1: Create schedule actions file**

Create `src/app/actions/schedule.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { dateInputToUTC } from "@/lib/format";

const optionalText = (max: number) =>
  z.preprocess(
    (v) => {
      const s = String(v ?? "").trim();
      return s === "" ? undefined : s;
    },
    z.string().max(max).optional(),
  );

const eventSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["PRACTICE", "MEET"]),
  title: z.string().trim().min(1, "Title is required").max(120),
  date: z.string().min(1, "Date is required"),
  startTime: optionalText(10),
  location: optionalText(200),
  notes: optionalText(1000),
});

export type ScheduleState = { error?: string; ok?: boolean };

function revalidateSchedulePaths() {
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath("/coach/schedule");
  revalidatePath("/admin/schedule");
}

async function requireTeamCoach() {
  const user = await requireRole("COACH", "ADMIN");
  if (!user.teamId) {
    return { user: null, error: "You must be assigned to a team to manage the schedule." };
  }
  return { user, error: null };
}

export async function createScheduleEvent(
  _prev: ScheduleState,
  formData: FormData,
): Promise<ScheduleState> {
  const { user, error } = await requireTeamCoach();
  if (!user) return { error: error! };

  const parsed = eventSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid event." };
  }

  await prisma.scheduleEvent.create({
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      date: dateInputToUTC(parsed.data.date),
      startTime: parsed.data.startTime ?? null,
      location: parsed.data.location ?? null,
      notes: parsed.data.notes ?? null,
      teamId: user.teamId!,
      createdById: user.id,
    },
  });

  revalidateSchedulePaths();
  return { ok: true };
}

export async function updateScheduleEvent(
  _prev: ScheduleState,
  formData: FormData,
): Promise<ScheduleState> {
  const { user, error } = await requireTeamCoach();
  if (!user) return { error: error! };

  const parsed = eventSchema.safeParse({
    id: formData.get("id"),
    type: formData.get("type"),
    title: formData.get("title"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success || !parsed.data.id) {
    return { error: parsed.error?.issues[0]?.message ?? "Invalid event." };
  }

  const existing = await prisma.scheduleEvent.findFirst({
    where: { id: parsed.data.id, teamId: user.teamId! },
  });
  if (!existing) return { error: "Event not found." };

  await prisma.scheduleEvent.update({
    where: { id: existing.id },
    data: {
      type: parsed.data.type,
      title: parsed.data.title,
      date: dateInputToUTC(parsed.data.date),
      startTime: parsed.data.startTime ?? null,
      location: parsed.data.location ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  revalidateSchedulePaths();
  return { ok: true };
}

export async function deleteScheduleEvent(id: string): Promise<void> {
  const { user, error } = await requireTeamCoach();
  if (!user) throw new Error(error!);

  const existing = await prisma.scheduleEvent.findFirst({
    where: { id, teamId: user.teamId! },
  });
  if (!existing) throw new Error("Event not found.");

  await prisma.scheduleEvent.delete({ where: { id } });
  revalidateSchedulePaths();
}
```

---

## Task 5: Badge & Event Card

**Files:**
- Modify: `src/components/domain-badges.tsx`
- Create: `src/components/schedule/schedule-event-card.tsx`

- [ ] **Step 1: Add ScheduleEventTypeBadge**

In `src/components/domain-badges.tsx`, import `ScheduleEventType` and `SCHEDULE_EVENT_TYPE_LABEL`, then add:

```typescript
const SCHEDULE_TONE: Record<
  import("@prisma/client").ScheduleEventType,
  Parameters<typeof Badge>[0]["tone"]
> = {
  PRACTICE: "neutral",
  MEET: "brand",
};

export function ScheduleEventTypeBadge({
  type,
}: {
  type: import("@prisma/client").ScheduleEventType;
}) {
  return (
    <Badge tone={SCHEDULE_TONE[type]}>{SCHEDULE_EVENT_TYPE_LABEL[type]}</Badge>
  );
}
```

- [ ] **Step 2: Create event card**

Create `src/components/schedule/schedule-event-card.tsx`:

```tsx
import { MapPin } from "lucide-react";
import type { ScheduleEventType } from "@prisma/client";
import { ScheduleEventTypeBadge } from "@/components/domain-badges";
import { formatDate, formatScheduleTime, formatWeekday } from "@/lib/format";

export type ScheduleEventCardData = {
  id: string;
  type: ScheduleEventType;
  title: string;
  date: Date;
  startTime: string | null;
  location: string | null;
  notes: string | null;
};

export function ScheduleEventCard({
  event,
  muted = false,
}: {
  event: ScheduleEventCardData;
  muted?: boolean;
}) {
  const time = formatScheduleTime(event.startTime);

  return (
    <article
      className={`rounded-xl border border-line p-4 ${
        muted ? "bg-surface/40 opacity-80" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ScheduleEventTypeBadge type={event.type} />
          <h3 className="mt-2 font-semibold text-ink">{event.title}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {formatWeekday(event.date)} · {formatDate(event.date)}
            {time ? ` · ${time}` : ""}
          </p>
          {event.location ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {event.location}
            </p>
          ) : null}
          {event.notes ? (
            <p className="mt-2 text-sm text-gray-600">{event.notes}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
```

---

## Task 6: Form, List & Manage Page

**Files:**
- Create: `src/components/schedule/schedule-event-form.tsx`
- Create: `src/components/schedule/schedule-event-list.tsx`
- Create: `src/components/schedule/schedule-manage-page.tsx`

- [ ] **Step 1: Create form component**

Create `src/components/schedule/schedule-event-form.tsx`:

```tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import {
  createScheduleEvent,
  updateScheduleEvent,
  type ScheduleState,
} from "@/app/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import type { ScheduleEventCardData } from "./schedule-event-card";
import { toDateInputValue } from "@/lib/format";

export function ScheduleEventForm({
  event,
  onCancel,
}: {
  event?: ScheduleEventCardData;
  onCancel?: () => void;
}) {
  const action = event ? updateScheduleEvent : createScheduleEvent;
  const [state, formAction] = useActionState(action, {} as ScheduleState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onCancel?.();
    }
  }, [state.ok, onCancel]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select id="type" name="type" defaultValue={event?.type ?? "PRACTICE"} required>
            <option value="PRACTICE">Practice</option>
            <option value="MEET">Meet</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={event ? toDateInputValue(event.date) : undefined}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            placeholder="Morning practice"
            defaultValue={event?.title}
            required
          />
        </div>
        <div>
          <Label htmlFor="startTime">Time (optional)</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            defaultValue={event?.startTime ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="location">Location (optional)</Label>
          <Input
            id="location"
            name="location"
            placeholder="Lovejoy HS track"
            defaultValue={event?.location ?? ""}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Bring spikes, bus leaves at 2:30…"
            defaultValue={event?.notes ?? ""}
          />
        </div>
      </div>
      {state.error ? (
        <p className="text-sm font-medium text-injury">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-success">Event saved.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <SubmitButton editing={!!event} />
        {event && onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="h-4 w-4" />
      {pending ? "Saving…" : editing ? "Update event" : "Add event"}
    </Button>
  );
}
```

- [ ] **Step 2: Create list component**

Create `src/components/schedule/schedule-event-list.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteScheduleEvent } from "@/app/actions/schedule";
import { ScheduleEventCard, type ScheduleEventCardData } from "./schedule-event-card";
import { ScheduleEventForm } from "./schedule-event-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { CalendarDays } from "lucide-react";
import { startOfUTCDay } from "@/lib/format";

export function ScheduleEventList({
  events,
  manage = false,
}: {
  events: ScheduleEventCardData[];
  manage?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = startOfUTCDay(new Date());

  const upcoming = events.filter((e) => startOfUTCDay(e.date) >= today);
  const past = events.filter((e) => startOfUTCDay(e.date) < today);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No events yet"
        description="Add a practice or meet to get started."
      />
    );
  }

  return (
    <div className="space-y-6">
      <EventSection
        title="Upcoming"
        events={upcoming}
        manage={manage}
        editingId={editingId}
        setEditingId={setEditingId}
        emptyMessage="No upcoming events."
      />
      {past.length > 0 ? (
        <EventSection
          title="Past"
          events={past}
          manage={manage}
          editingId={editingId}
          setEditingId={setEditingId}
          muted
        />
      ) : null}
    </div>
  );
}

function EventSection({
  title,
  events,
  manage,
  editingId,
  setEditingId,
  muted = false,
  emptyMessage,
}: {
  title: string;
  events: ScheduleEventCardData[];
  manage: boolean;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  muted?: boolean;
  emptyMessage?: string;
}) {
  if (events.length === 0) {
    return emptyMessage ? (
      <p className="text-sm text-gray-400">{emptyMessage}</p>
    ) : null;
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      <ul className="space-y-3">
        {events.map((event) => (
          <li key={event.id}>
            {manage && editingId === event.id ? (
              <div className="rounded-xl border border-line bg-surface/60 p-4">
                <ScheduleEventForm
                  event={event}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div className="relative">
                <ScheduleEventCard event={event} muted={muted} />
                {manage ? (
                  <div className="absolute right-3 top-3 flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Edit event"
                      onClick={() => setEditingId(event.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <form
                      action={deleteScheduleEvent.bind(null, event.id)}
                      onSubmit={(e) => {
                        if (!confirm("Delete this event?")) e.preventDefault();
                      }}
                    >
                      <Button type="submit" variant="ghost" size="sm" aria-label="Delete event">
                        <Trash2 className="h-4 w-4 text-injury" />
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Create manage page component**

Create `src/components/schedule/schedule-manage-page.tsx`:

```tsx
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
```

---

## Task 7: Coach & Admin Routes

**Files:**
- Create: `src/app/coach/schedule/page.tsx`
- Create: `src/app/admin/schedule/page.tsx`

- [ ] **Step 1: Coach schedule page**

Create `src/app/coach/schedule/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Admin schedule page**

Create `src/app/admin/schedule/page.tsx`:

```tsx
import { requireRole } from "@/lib/auth";
import { getScheduleEventsForTeam } from "@/lib/queries";
import { ScheduleManagePage } from "@/components/schedule/schedule-manage-page";

export default async function AdminSchedulePage() {
  const user = await requireRole("ADMIN");
  const events = user.teamId
    ? await getScheduleEventsForTeam(user.teamId)
    : [];

  return <ScheduleManagePage events={events} noTeam={!user.teamId} />;
}
```

---

## Task 8: Athlete Schedule Page

**Files:**
- Create: `src/app/(athlete)/schedule/page.tsx`
- Create: `src/components/schedule/schedule-readonly-page.tsx`

- [ ] **Step 1: Create readonly page wrapper**

Create `src/components/schedule/schedule-readonly-page.tsx`:

```tsx
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
```

- [ ] **Step 2: Create athlete route**

Create `src/app/(athlete)/schedule/page.tsx`:

```tsx
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
```

---

## Task 9: Athlete Dashboard Section

**Files:**
- Modify: `src/app/(athlete)/dashboard/page.tsx`

- [ ] **Step 1: Fetch this week's schedule**

After `const data = await getAthleteDashboard(user.id);`, add:

```typescript
import { getThisWeekSchedule } from "@/lib/queries";
import { ScheduleEventCard } from "@/components/schedule/schedule-event-card";

// inside component, after getAthleteDashboard:
const weekEvents = user.teamId
  ? await getThisWeekSchedule(user.teamId)
  : [];
```

- [ ] **Step 2: Render "This week" section**

After the stat cards grid (`</div>` closing the 2x2 grid) and before shoe alerts, insert:

```tsx
<div>
  <SectionTitle
    title="This week"
    action={{ label: "Full schedule", href: "/schedule" }}
  />
  {weekEvents.length > 0 ? (
    <ul className="space-y-3">
      {weekEvents.map((event) => (
        <li key={event.id}>
          <ScheduleEventCard event={event} />
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState
      icon={CalendarDays}
      title="No events this week"
      description="Check the full schedule for upcoming practices and meets."
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/schedule">View schedule</Link>
        </Button>
      }
    />
  )}
</div>
```

Ensure `CalendarDays` is imported from `lucide-react` (already imported in file).

---

## Task 10: Navigation Updates

**Files:**
- Modify: `src/components/nav/nav-config.ts`
- Modify: `src/components/nav/nav-icons.ts`

- [ ] **Step 1: Add nav icon key and items**

In `nav-config.ts`, add `"schedule"` to `NavIconKey` type.

Add to arrays (after dashboard entries):

```typescript
// athleteNav — after dashboard entry
{ href: "/schedule", label: "Schedule", icon: "schedule" },

// coachNav — after dashboard entry
{ href: "/coach/schedule", label: "Schedule", icon: "schedule" },

// adminNav — after overview entry
{ href: "/admin/schedule", label: "Schedule", icon: "schedule" },
```

- [ ] **Step 2: Map calendar icon**

In `nav-icons.ts`, import `CalendarDays` from lucide-react and add:

```typescript
schedule: CalendarDays,
```

---

## Task 11: Seed Data

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Delete schedule events on reset**

Near other `deleteMany` calls in `main()`, add before team delete:

```typescript
await prisma.scheduleEvent.deleteMany();
```

- [ ] **Step 2: Create sample events**

After team and coach are created, add helper to compute dates:

```typescript
function utcDateOffset(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
```

After coach creation:

```typescript
await prisma.scheduleEvent.createMany({
  data: [
    {
      type: "PRACTICE",
      title: "Morning practice",
      date: utcDateOffset(1),
      startTime: "06:30",
      location: "Lovejoy HS track",
      notes: "Easy 4–5 miles",
      teamId: team.id,
      createdById: coach.id,
    },
    {
      type: "MEET",
      title: "Lucas Lovejoy Invitational",
      date: utcDateOffset(5),
      startTime: "08:00",
      location: "Lucas Lovejoy HS",
      notes: "Bus leaves at 6:15 AM",
      teamId: team.id,
      createdById: coach.id,
    },
    {
      type: "PRACTICE",
      title: "Recovery run",
      date: utcDateOffset(-3),
      startTime: "16:00",
      location: "Neighborhood loop",
      teamId: team.id,
      createdById: coach.id,
    },
  ],
});
```

- [ ] **Step 3: Re-seed**

Run: `npm run db:seed`  
Expected: Seed completes; 3 schedule events created.

---

## Task 12: Verification

**Files:** (none — verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`  
Expected: No errors.

- [ ] **Step 2: Build**

Run: `npm run build`  
Expected: Build succeeds.

- [ ] **Step 3: Manual QA**

1. Log in as `coach@lovejoyxc.app` / `leopards` → `/coach/schedule` → add a practice for today → appears in list.
2. Log in as an athlete → `/dashboard` shows event under "This week".
3. Athlete → `/schedule` → sees full list including past recovery run from seed.
4. Coach edits event title → athlete view updates on refresh.
5. Coach deletes event → removed everywhere.
6. Log in as `admin@lovejoyxc.app` → `/admin/schedule` → same manage UI works.

---

## Spec Coverage Checklist

| Spec requirement | Task |
|---|---|
| ScheduleEvent model + enum | Task 1 |
| Team-wide visibility | Tasks 3, 7, 8 |
| Coach/admin CRUD | Task 4 |
| Athlete this-week dashboard | Task 9 |
| Athlete full schedule page | Task 8 |
| Shared manage UI (coach + admin) | Tasks 6, 7 |
| Nav items all roles | Task 10 |
| Labels and badges | Tasks 2, 5 |
| Seed sample data | Task 11 |
| Out-of-scope items excluded | N/A (not implemented) |
