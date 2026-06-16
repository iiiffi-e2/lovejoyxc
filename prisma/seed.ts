import "dotenv/config";
import {
  PrismaClient,
  type Feeling,
  type Soreness,
  type WorkoutType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;

function utcDay(offsetDays: number): Date {
  const now = new Date();
  const base = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return new Date(base - offsetDays * DAY);
}

function utcDateOffset(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type AthleteSpec = {
  name: string;
  email: string;
  grade: number;
  genderTeam: "BOYS" | "GIRLS";
  teamGroup: "VARSITY" | "JV" | "FRESHMAN";
  weeklyMiles: number;
  basePaceSec: number; // sec per mile easy pace
  consistency: number; // 0-1
  missRecentDays?: number; // skip logging within last N days
  spike?: boolean; // ~40% jump this week
  painThisWeek?: boolean;
  shoe: { name: string; limit: number; carryover: number };
};

const ATHLETES: AthleteSpec[] = [
  {
    name: "Maya Thompson",
    email: "maya@lovejoyxc.app",
    grade: 11,
    genderTeam: "GIRLS",
    teamGroup: "VARSITY",
    weeklyMiles: 38,
    basePaceSec: 450,
    consistency: 0.95,
    shoe: { name: "Nike Pegasus 41", limit: 400, carryover: 120 },
  },
  {
    name: "Sofia Ramirez",
    email: "sofia@lovejoyxc.app",
    grade: 12,
    genderTeam: "GIRLS",
    teamGroup: "VARSITY",
    weeklyMiles: 45,
    basePaceSec: 430,
    consistency: 0.92,
    spike: true,
    shoe: { name: "Saucony Endorphin Speed", limit: 350, carryover: 210 },
  },
  {
    name: "Hannah Lee",
    email: "hannah@lovejoyxc.app",
    grade: 9,
    genderTeam: "GIRLS",
    teamGroup: "FRESHMAN",
    weeklyMiles: 22,
    basePaceSec: 510,
    consistency: 0.85,
    shoe: { name: "Brooks Ghost 16", limit: 400, carryover: 40 },
  },
  {
    name: "Olivia Brown",
    email: "olivia@lovejoyxc.app",
    grade: 10,
    genderTeam: "GIRLS",
    teamGroup: "JV",
    weeklyMiles: 28,
    basePaceSec: 480,
    consistency: 0.8,
    missRecentDays: 3,
    shoe: { name: "Hoka Clifton 9", limit: 400, carryover: 95 },
  },
  {
    name: "Ethan Carter",
    email: "ethan@lovejoyxc.app",
    grade: 12,
    genderTeam: "BOYS",
    teamGroup: "VARSITY",
    weeklyMiles: 55,
    basePaceSec: 380,
    consistency: 0.95,
    painThisWeek: true,
    shoe: { name: "Nike Vaporfly 3", limit: 200, carryover: 175 },
  },
  {
    name: "Liam Nguyen",
    email: "liam@lovejoyxc.app",
    grade: 11,
    genderTeam: "BOYS",
    teamGroup: "VARSITY",
    weeklyMiles: 48,
    basePaceSec: 400,
    consistency: 0.93,
    shoe: { name: "Asics Novablast 4", limit: 400, carryover: 150 },
  },
  {
    name: "Noah Patel",
    email: "noah@lovejoyxc.app",
    grade: 10,
    genderTeam: "BOYS",
    teamGroup: "JV",
    weeklyMiles: 30,
    basePaceSec: 445,
    consistency: 0.88,
    spike: true,
    shoe: { name: "Adidas Adizero SL", limit: 400, carryover: 60 },
  },
  {
    name: "Caleb Johnson",
    email: "caleb@lovejoyxc.app",
    grade: 9,
    genderTeam: "BOYS",
    teamGroup: "FRESHMAN",
    weeklyMiles: 20,
    basePaceSec: 520,
    consistency: 0.78,
    missRecentDays: 2,
    shoe: { name: "New Balance Rebel v4", limit: 350, carryover: 330 },
  },
];

// Distance share + relative effort/feel by weekday workout
function plan(weekday: number): {
  type: WorkoutType;
  share: number;
  effort: number;
} | null {
  switch (weekday) {
    case 1: // Mon
      return { type: "EASY_RUN", share: 0.15, effort: 4 };
    case 2: // Tue
      return { type: "WORKOUT", share: 0.16, effort: 8 };
    case 3: // Wed
      return { type: "EASY_RUN", share: 0.14, effort: 4 };
    case 4: // Thu
      return { type: "RECOVERY_RUN", share: 0.1, effort: 3 };
    case 5: // Fri
      return { type: "EASY_RUN", share: 0.15, effort: 4 };
    case 6: // Sat
      return { type: "LONG_RUN", share: 0.3, effort: 6 };
    default: // Sun rest
      return null;
  }
}

const GOOD_FEELINGS: Feeling[] = ["GREAT", "GOOD", "GOOD", "OKAY"];

async function main() {
  console.log("Resetting data…");
  await prisma.session.deleteMany();
  await prisma.coachNote.deleteMany();
  await prisma.workoutLog.deleteMany();
  await prisma.shoe.deleteMany();
  await prisma.scheduleEvent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  const passwordHash = await bcrypt.hash("leopards", 10);

  const team = await prisma.team.create({
    data: {
      name: "Lovejoy Leopards XC",
      season: "Cross Country",
      schoolYear: "2025-2026",
    },
  });

  await prisma.user.create({
    data: {
      name: "Riley Admin",
      email: "admin@lovejoyxc.app",
      passwordHash,
      role: "ADMIN",
      teamId: team.id,
    },
  });

  const coach = await prisma.user.create({
    data: {
      name: "Coach Dawson",
      email: "coach@lovejoyxc.app",
      passwordHash,
      role: "COACH",
      teamId: team.id,
    },
  });

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

  console.log("Creating athletes, shoes, and logs…");
  const DAYS = 56; // 8 weeks of history

  for (const spec of ATHLETES) {
    const athlete = await prisma.user.create({
      data: {
        name: spec.name,
        email: spec.email,
        passwordHash,
        role: "ATHLETE",
        grade: spec.grade,
        genderTeam: spec.genderTeam,
        teamGroup: spec.teamGroup,
        teamId: team.id,
      },
    });

    const shoe = await prisma.shoe.create({
      data: {
        athleteId: athlete.id,
        name: spec.shoe.name,
        startDate: utcDay(120),
        mileageLimit: spec.shoe.limit,
        totalMiles: 0,
      },
    });

    let shoeMiles = spec.shoe.carryover;

    for (let i = DAYS; i >= 0; i--) {
      const date = utcDay(i);
      const weekday = date.getUTCDay();
      const inThisWeek = i < 7;

      // Skip recent days for "missing logs" athletes
      if (spec.missRecentDays && i < spec.missRecentDays) continue;

      const p = plan(weekday);

      // Rest day (logged) on Sundays for consistent athletes
      if (!p) {
        if (Math.random() < spec.consistency * 0.7) {
          await prisma.workoutLog.create({
            data: {
              athleteId: athlete.id,
              teamId: team.id,
              date,
              workoutType: "REST_DAY",
              distance: 0,
              feeling: "GOOD",
              soreness: "NONE",
            },
          });
        }
        continue;
      }

      // Miss some days based on consistency
      if (Math.random() > spec.consistency) continue;

      const spikeFactor = spec.spike && inThisWeek ? 1.4 : 1;
      const noise = 0.9 + Math.random() * 0.2;
      let distance =
        Math.round(spec.weeklyMiles * p.share * spikeFactor * noise * 10) / 10;
      distance = Math.max(2, distance);

      const paceMod =
        p.type === "WORKOUT" ? -40 : p.type === "LONG_RUN" ? 25 : 0;
      const paceSec = Math.round(
        (spec.basePaceSec + paceMod) * (0.97 + Math.random() * 0.06),
      );
      const durationSec = Math.round(distance * paceSec);

      let feeling: Feeling = pick(GOOD_FEELINGS);
      let soreness: Soreness = pick(["NONE", "NONE", "MILD"]) as Soreness;
      let painFlag = false;
      let effort = p.effort + (Math.random() < 0.3 ? 1 : 0);

      // Pain event this week
      if (spec.painThisWeek && inThisWeek && (weekday === 2 || weekday === 4)) {
        feeling = pick(["ROUGH", "PAIN"]);
        soreness = pick(["MODERATE", "HIGH"]) as Soreness;
        painFlag = feeling === "PAIN" || soreness === "HIGH";
        effort = Math.min(10, effort + 2);
      }

      const surface =
        p.type === "WORKOUT"
          ? "TRACK"
          : p.type === "LONG_RUN"
            ? pick(["ROAD", "TRAIL"])
            : pick(["ROAD", "ROAD", "TRAIL", "GRASS"]);

      await prisma.workoutLog.create({
        data: {
          athleteId: athlete.id,
          teamId: team.id,
          date,
          workoutType: p.type,
          distance,
          durationSec,
          paceSec,
          effort: Math.min(10, effort),
          feeling,
          soreness,
          painFlag,
          surface: surface as never,
          shoeId: shoe.id,
          notes:
            p.type === "WORKOUT"
              ? pick([
                  "6x800m on the track, felt strong.",
                  "Mile repeats, legs heavy but hit splits.",
                  "Tempo intervals — solid session.",
                ])
              : p.type === "LONG_RUN"
                ? pick([
                    "Long run with the group on the trails.",
                    "Steady long run, beautiful morning.",
                    "",
                  ])
                : pick(["", "", "Easy shakeout.", "Felt smooth today."]),
        },
      });

      shoeMiles += distance;
    }

    await prisma.shoe.update({
      where: { id: shoe.id },
      data: { totalMiles: Math.round(shoeMiles * 10) / 10 },
    });

    // A couple of coach notes for a few athletes
    if (["Ethan Carter", "Olivia Brown", "Sofia Ramirez"].includes(spec.name)) {
      await prisma.coachNote.create({
        data: {
          coachId: coach.id,
          athleteId: athlete.id,
          note:
            spec.name === "Ethan Carter"
              ? "Watch the calf tightness — keep easy days truly easy this week."
              : spec.name === "Olivia Brown"
                ? "Hasn't logged in a few days. Check in at practice."
                : "Great fitness — make sure the mileage jump stays controlled.",
        },
      });
    }
  }

  const counts = {
    users: await prisma.user.count(),
    logs: await prisma.workoutLog.count(),
    shoes: await prisma.shoe.count(),
    notes: await prisma.coachNote.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
