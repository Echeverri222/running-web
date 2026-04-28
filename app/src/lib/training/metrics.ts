import type { Workout } from "@prisma/client";

export function getCurrentWeeklyKm(workouts: Workout[]) {
  if (workouts.length === 0) {
    return 0;
  }

  const totalKm = workouts.reduce((sum, workout) => sum + workout.distanceKm, 0);
  const oldestWorkout = workouts[workouts.length - 1];
  const newestWorkout = workouts[0];
  const spanDays = Math.max(
    7,
    Math.ceil((newestWorkout.date.getTime() - oldestWorkout.date.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  const weekSpan = spanDays / 7;

  return Number((totalKm / weekSpan).toFixed(1));
}

export function getAverageRpe(workouts: Workout[]) {
  if (workouts.length === 0) {
    return 5;
  }

  const totalRpe = workouts.reduce((sum, workout) => sum + workout.rpe, 0);
  return Math.round(totalRpe / workouts.length);
}

export function getAverageRunsPerWeek(workouts: Workout[]) {
  if (workouts.length === 0) {
    return 0;
  }

  const newestWorkout = workouts[0];
  const oldestWorkout = workouts[workouts.length - 1];
  const spanDays = Math.max(
    7,
    Math.ceil((newestWorkout.date.getTime() - oldestWorkout.date.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  const weekSpan = spanDays / 7;

  return Number((workouts.length / weekSpan).toFixed(1));
}

export function getRecentLongestRunKm(workouts: Workout[]) {
  if (workouts.length === 0) {
    return 0;
  }

  return Number(
    Math.max(
      ...workouts
        .filter((workout) => workout.type !== "recovery")
        .map((workout) => workout.distanceKm),
      0,
    ).toFixed(1),
  );
}

export function getRecentQualitySessionsPerWeek(workouts: Workout[]) {
  if (workouts.length === 0) {
    return 0;
  }

  const qualityTypes = new Set(["tempo", "intervals", "race"]);
  const qualityCount = workouts.filter((workout) => qualityTypes.has(workout.type)).length;
  const newestWorkout = workouts[0];
  const oldestWorkout = workouts[workouts.length - 1];
  const spanDays = Math.max(
    7,
    Math.ceil((newestWorkout.date.getTime() - oldestWorkout.date.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  const weekSpan = spanDays / 7;

  return Number((qualityCount / weekSpan).toFixed(1));
}

export function getWeekStart(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}
