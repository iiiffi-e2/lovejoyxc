# Team Schedule (Practice & Meet) — Design Spec

**Date:** 2026-06-16  
**Status:** Approved

## Overview

Allow coaches and admins to add one-off team schedule events (practices and meets). Athletes see this week's events on their dashboard and can view the full season schedule on a dedicated page.

## Requirements Summary

| Feature | Decision |
|---|---|
| Visibility | Team-wide — all athletes on the team see the same events |
| Event types | Practice, Meet |
| Event fields | Title (required), date (required), start time (optional), location (optional), notes (optional) |
| Recurrence | One-off only for v1 |
| Athlete dashboard | "This week" section with link to full schedule |
| Athlete full schedule | Dedicated `/schedule` page + nav item |
| Management UI | Shared component at `/coach/schedule` and `/admin/schedule` |
| Who can manage | Coaches and admins (scoped to their team) |

---

## 1. Data Model

### ScheduleEventType (new enum)

```prisma
enum ScheduleEventType {
  PRACTICE
  MEET
}
```

### ScheduleEvent (new model)

```prisma
model ScheduleEvent {
  id          String            @id @default(cuid())
  type        ScheduleEventType
  title       String
  date        DateTime          @db.Date
  startTime   String?           // Display string, e.g. "06:30" or "15:30"
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

### Relation updates

- `Team`: add `scheduleEvents ScheduleEvent[]`
- `User`: add `createdScheduleEvents ScheduleEvent[]`

### Design notes

- Events belong to a team; visibility is implicit via the athlete's `teamId`.
- `startTime` is a display string, not a full datetime — avoids timezone complexity for a high-school team app.
- `date` uses `@db.Date` consistent with `WorkoutLog.date`.
- Hard delete on event removal (no soft-delete for v1).

---

## 2. Authorization

| Action | Roles | Scope |
|---|---|---|
| Create / update / delete | `COACH`, `ADMIN` | User must have `teamId`; event must belong to that team |
| Read (athlete) | `ATHLETE` | Events where `teamId` matches athlete's `teamId` |
| Read (coach/admin manage page) | `COACH`, `ADMIN` | Same team scope |

If coach/admin has no `teamId`, show inline message: *"You must be assigned to a team to manage the schedule."*

If athlete has no `teamId`, show empty schedule states (no error).

---

## 3. Queries

Add to `src/lib/queries.ts`:

### `getScheduleEventsForTeam(teamId, options?)`

- **Options:** `{ from?: Date; to?: Date; includePast?: boolean }`
- Returns events ordered by `date` ascending, then `startTime` ascending.
- Used by coach/admin manage page and athlete full schedule page.

### `getThisWeekSchedule(teamId)`

- Returns events where `date` falls within the current week (Monday–Sunday).
- Reuses existing week boundary helpers from `src/lib/dates.ts` (same logic as mileage stats).

### `getScheduleEvent(id, teamId)`

- Returns a single event or null.
- Verifies `teamId` matches before returning (used for edit flows).

---

## 4. Server Actions

New file: `src/app/actions/schedule.ts`

### `createScheduleEvent(prev, formData)`

- Requires `requireRole("COACH", "ADMIN")`.
- Validates with Zod:
  - `type`: `"PRACTICE" | "MEET"`
  - `title`: string, min 1, max 120
  - `date`: required date string → parsed to UTC date
  - `startTime`: optional string, max 10 chars
  - `location`: optional string, max 200
  - `notes`: optional string, max 1000
- Sets `teamId` from current user, `createdById` from current user.
- Revalidates: `/dashboard`, `/schedule`, `/coach/schedule`, `/admin/schedule`.

### `updateScheduleEvent(prev, formData)`

- Same validation + `id` field.
- Verifies event exists and `event.teamId === user.teamId`.

### `deleteScheduleEvent(id)`

- Requires coach/admin role.
- Verifies team ownership before delete.

All actions return `{ error?: string; ok?: boolean }` action state (same pattern as coach notes).

---

## 5. Routes & Navigation

### New routes

| Route | Layout | Access | Purpose |
|---|---|---|---|
| `/coach/schedule` | Coach layout | `COACH`, `ADMIN` | Manage team schedule |
| `/admin/schedule` | Admin layout | `ADMIN` | Same manage UI |
| `/schedule` | Athlete layout | `ATHLETE` | Full season schedule |

### Nav updates (`src/components/nav/nav-config.ts`)

- **coachNav:** add `{ href: "/coach/schedule", label: "Schedule", icon: "schedule" }`
- **adminNav:** add `{ href: "/admin/schedule", label: "Schedule", icon: "schedule" }`
- **athleteNav:** add `{ href: "/schedule", label: "Schedule", icon: "schedule" }`

Add `"schedule"` to `NavIconKey` and map to a calendar icon in `nav-icons.ts`.

### Athlete dashboard (`src/app/(athlete)/dashboard/page.tsx`)

Add **"This week"** section after stat cards, before weekly mileage:

- Lists events from `getThisWeekSchedule(user.teamId)`.
- Section action link: **"Full schedule →"** pointing to `/schedule`.
- Empty state: *"No events scheduled this week."*

---

## 6. UI Components

| Component | File | Purpose |
|---|---|---|
| `ScheduleEventCard` | `src/components/schedule/schedule-event-card.tsx` | Single event: type badge, title, date/time, location, notes |
| `ScheduleEventList` | `src/components/schedule/schedule-event-list.tsx` | Renders list of cards; optional edit/delete for manage mode |
| `ScheduleEventForm` | `src/components/schedule/schedule-event-form.tsx` | Client form for create/edit via server actions |
| `ScheduleManagePage` | `src/components/schedule/schedule-manage-page.tsx` | Composes form + list for coach/admin pages |

### Labels (`src/lib/labels.ts`)

```typescript
export const SCHEDULE_EVENT_TYPE_LABEL: Record<ScheduleEventType, string> = {
  PRACTICE: "Practice",
  MEET: "Meet",
};
```

### Manage page layout

1. Page heading: "Team schedule"
2. Add event form at top
3. Upcoming events list (sorted by date)
4. Past events in a collapsible or muted section below

### Delete confirmation

Simple browser `confirm()` before delete form submit (consistent with lightweight patterns elsewhere).

---

## 7. Seed Data (optional)

Add 2–3 sample schedule events to `prisma/seed.ts` for the demo team (one practice this week, one meet upcoming, one past) so dashboards are populated in dev.

---

## 8. Out of Scope (v1)

- Recurring events (Mon/Wed/Fri practices)
- Squad filtering (Varsity / JV / Freshman / Boys / Girls)
- Calendar grid / month view
- Email or push reminders
- iCal export
- Soft delete / event history audit log

---

## 9. Testing Plan

Manual verification:

1. Coach creates a practice and a meet for the current week → both appear on athlete dashboard "This week" section.
2. Athlete opens `/schedule` → sees full list including past events.
3. Coach edits event title → athlete view updates after refresh.
4. Coach deletes event → removed from all views.
5. Admin accesses `/admin/schedule` → same manage UI works.
6. Coach/admin without `teamId` → sees helpful empty state, cannot create events.
7. Athlete on different team → does not see another team's events.

---

## 10. Files to Create / Modify

### Create

- `prisma/migrations/.../migration.sql` (via `prisma migrate dev`)
- `src/app/actions/schedule.ts`
- `src/app/coach/schedule/page.tsx`
- `src/app/admin/schedule/page.tsx`
- `src/app/(athlete)/schedule/page.tsx`
- `src/components/schedule/schedule-event-card.tsx`
- `src/components/schedule/schedule-event-list.tsx`
- `src/components/schedule/schedule-event-form.tsx`
- `src/components/schedule/schedule-manage-page.tsx`

### Modify

- `prisma/schema.prisma`
- `prisma/seed.ts` (optional sample events)
- `src/lib/queries.ts`
- `src/lib/labels.ts`
- `src/components/nav/nav-config.ts`
- `src/components/nav/nav-icons.ts`
- `src/app/(athlete)/dashboard/page.tsx`
