import type {
  Feeling,
  GenderTeam,
  Role,
  Soreness,
  Surface,
  TeamGroup,
  WorkoutType,
} from "@prisma/client";

export const WORKOUT_TYPE_LABEL: Record<WorkoutType, string> = {
  EASY_RUN: "Easy Run",
  LONG_RUN: "Long Run",
  WORKOUT: "Workout",
  RACE: "Race",
  RECOVERY_RUN: "Recovery Run",
  CROSS_TRAINING: "Cross Training",
  STRENGTH: "Strength",
  REST_DAY: "Rest Day",
  INJURY_RECOVERY: "Injury/Recovery",
};

/** Workout types that involve logging running distance. */
export const RUNNING_TYPES: WorkoutType[] = [
  "EASY_RUN",
  "LONG_RUN",
  "WORKOUT",
  "RACE",
  "RECOVERY_RUN",
];

export const FEELING_LABEL: Record<Feeling, string> = {
  GREAT: "Great",
  GOOD: "Good",
  OKAY: "Okay",
  ROUGH: "Rough",
  PAIN: "Pain/Injury",
};

export const FEELING_EMOJI: Record<Feeling, string> = {
  GREAT: "😄",
  GOOD: "🙂",
  OKAY: "😐",
  ROUGH: "😣",
  PAIN: "🤕",
};

export const FEELING_ORDER: Feeling[] = [
  "GREAT",
  "GOOD",
  "OKAY",
  "ROUGH",
  "PAIN",
];

/** Higher = better, used for trend math. */
export const FEELING_SCORE: Record<Feeling, number> = {
  GREAT: 5,
  GOOD: 4,
  OKAY: 3,
  ROUGH: 2,
  PAIN: 1,
};

export const SORENESS_LABEL: Record<Soreness, string> = {
  NONE: "None",
  MILD: "Mild",
  MODERATE: "Moderate",
  HIGH: "High",
};

export const SURFACE_LABEL: Record<Surface, string> = {
  ROAD: "Road",
  TRAIL: "Trail",
  TRACK: "Track",
  GRASS: "Grass",
  TREADMILL: "Treadmill",
  OTHER: "Other",
};

export const ROLE_LABEL: Record<Role, string> = {
  ATHLETE: "Athlete",
  COACH: "Coach",
  ADMIN: "Admin",
};

export const TEAM_GROUP_LABEL: Record<TeamGroup, string> = {
  VARSITY: "Varsity",
  JV: "JV",
  FRESHMAN: "Freshman",
};

export const GENDER_TEAM_LABEL: Record<GenderTeam, string> = {
  BOYS: "Boys",
  GIRLS: "Girls",
};

export function enumOptions<T extends string>(
  map: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value] }));
}
