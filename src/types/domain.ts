export type RunnerLevel = "beginner" | "intermediate" | "advanced";
export type GoalDistance = "5K" | "10K" | "21K" | "42K";
export type WorkoutType =
  | "easy"
  | "recovery"
  | "long"
  | "tempo"
  | "fartlek"
  | "intervals"
  | "race"
  | "rest"
  | "cross_training";

export interface PlanGenerationInput {
  level: RunnerLevel;
  availableDays: number;
  currentWeeklyKm: number;
  targetDistance: GoalDistance;
  weeksToRace: number;
  recentFatigueScore: number;
  easyPaceSecPerKm?: number | null;
  recentLongestRunKm?: number;
  averageRunsPerWeek?: number;
  recentQualitySessionsPerWeek?: number;
}

export interface TrainingSession {
  dayOfWeek: number;
  type: WorkoutType;
  plannedKm: number;
  plannedDurationMin?: number;
  notes: string;
}
