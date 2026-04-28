import type { WorkoutType } from "@/types/domain";
import type { StravaActivitySummary } from "@/lib/strava/client";

const runningSportTypes = new Set([
  "Run",
  "TrailRun",
  "VirtualRun",
  "Workout",
  "Race",
]);

export function isSupportedStravaActivity(activity: StravaActivitySummary) {
  return runningSportTypes.has(activity.sport_type) || activity.type === "Run";
}

export function mapStravaActivityType(activity: StravaActivitySummary): WorkoutType {
  const name = activity.name.toLowerCase();

  if (name.includes("race")) {
    return "race";
  }

  if (name.includes("long")) {
    return "long";
  }

  if (name.includes("tempo")) {
    return "tempo";
  }

  if (name.includes("interval")) {
    return "intervals";
  }

  if (activity.moving_time < 1800) {
    return "recovery";
  }

  return "easy";
}
