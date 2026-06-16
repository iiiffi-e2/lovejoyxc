# Lovejoy XC Log

A private, mobile-first running log for the **Lovejoy Leopards** cross country team.
Athletes log workouts in under 30 seconds; coaches monitor consistency, mileage,
injuries, and training trends in under a minute.

Built with a crisp sports-dashboard aesthetic — bold red accents (`#C8102E`),
black typography, soft gray cards, rounded corners, and clean charts.

## Features

### Athletes
- **Self-signup** with a season invite code from your coach or admin (see `/signup`)
- Profile photo upload (when Vercel Blob is configured)
- **Forgot password** via email magic link
- **Log Today's Run** — fast, mobile-first form with smart defaults
- Auto-calculated pace from distance + duration
- Emoji feeling selector, effort slider, soreness, surface, pain/injury flag
- One-tap **Rest Day** logging
- Personal dashboard: weekly / monthly mileage, logging streak, last workout,
  shoe-mileage alerts, recent logs, and a weekly mileage chart
- Workout history with filters, edit/delete
- Shoe mileage tracking with wear warnings

### Coaches
- Team dashboard with stat cards (team mileage, logged today, missing logs,
  injury flags, average weekly mileage, mileage spikes, shoe warnings)
- Alert cards (missing logs, pain reported, mileage spikes, shoe warnings)
- **Athlete Log Status** and **Recent Workout Logs** tables
- Individual athlete profiles: mileage / effort / feeling trends, injury history,
  shoes, and private coach notes
- Filter by athlete, grade, group, team, workout type, and date range
- **CSV export**

### Admins
- Create teams / seasons
- Generate season **invite codes** for athlete self-signup (enable/disable per team)
- Add athletes and coaches, assign roles
- Manage groups (Varsity / JV / Freshman, Boys / Girls)
- Activate / deactivate accounts

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** for styling
- **Prisma 6** ORM with **PostgreSQL**
- **Recharts** for charts
- Cookie-based sessions with **bcrypt** password hashing and role-based routing

> The product brief recommended Supabase. This implementation uses Prisma +
> PostgreSQL for the database/auth layer so it runs end-to-end with no external
> credentials. `DATABASE_URL` accepts any Postgres connection string, including a
> Supabase Postgres URL, so the data layer is portable.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Start a local Postgres database

This project uses a local Prisma Postgres instance for development:

```bash
npm run db:start    # starts `prisma dev` (detached)
```

Copy the printed connection URL into `.env` as `DATABASE_URL`
(see `.env.example`). When using a pooled endpoint, append `?pgbouncer=true`.

For production, set `DATABASE_URL` to any Postgres database (Supabase, Neon,
Prisma Postgres cloud, etc.).

### 3. Apply the schema and seed demo data

```bash
npm run db:push     # sync schema (or `npx prisma migrate deploy` in prod)
npm run db:seed     # load demo team, athletes, coach, admin, and logs
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Secret for signing session cookies |
| `NEXT_PUBLIC_APP_URL` | Prod | Public app URL (used in password-reset links) |
| `BLOB_READ_WRITE_TOKEN` | Optional | Vercel Blob token for profile photo uploads |
| `RESEND_API_KEY` | Optional | Resend API key for password-reset emails |
| `EMAIL_FROM` | Optional | Sender address for transactional email |

When `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, or `EMAIL_FROM` are unset, avatar
upload and email features degrade gracefully in local dev (upload disabled; reset
links logged to the server console).

## Athlete signup

1. An admin creates a team and generates an invite code under **Admin → Teams**
   (or enables signup when creating a team).
2. The athlete visits `/signup`, enters the invite code, name, email, password,
   and grade.
3. On success they are logged in and redirected to their dashboard.

Invite codes are hashed in the database; admins can rotate codes to invalidate old ones.

## Demo accounts

All demo accounts use the password **`leopards`**.

| Role    | Email                  |
| ------- | ---------------------- |
| Athlete | `maya@lovejoyxc.app`   |
| Coach   | `coach@lovejoyxc.app`  |
| Admin   | `admin@lovejoyxc.app`  |

## Scripts

| Script            | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the dev server                 |
| `npm run build`   | Generate Prisma client + build       |
| `npm run start`   | Start the production server          |
| `npm run db:start`| Start a local Prisma Postgres DB     |
| `npm run db:push` | Push the Prisma schema to the DB     |
| `npm run db:seed` | Seed demo data                       |
| `npm run db:studio`| Open Prisma Studio                  |

## Project structure

```
prisma/
  schema.prisma        # users, teams, workout_logs, shoes, coach_notes, sessions
  seed.ts              # demo data
src/
  app/
    (athlete)/         # athlete routes: dashboard, log, history, shoes, profile
    coach/             # coach routes: dashboard, athletes, logs, reports, alerts, settings
    admin/             # admin routes: overview, users, teams
    login/             # authentication
    actions/           # server actions (auth, workout, shoe, coach, admin)
  components/           # UI primitives, charts, nav, domain components
  lib/                 # auth, prisma, queries, metrics, dates, formatting
```
