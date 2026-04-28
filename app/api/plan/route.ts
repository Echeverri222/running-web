import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/db/client";
import { generateWeekPlan } from "@/lib/training/generator";
import { getScheduledDate } from "@/lib/training/calendar";
import {
  getAverageRpe,
  getAverageRunsPerWeek,
  getCurrentWeeklyKm,
  getRecentLongestRunKm,
  getRecentQualitySessionsPerWeek,
  getWeekStart,
} from "@/lib/training/metrics";
import type { GoalDistance, RunnerLevel } from "@/types/domain";

function parsePositiveInt(value: FormDataEntryValue | null, fallback: number) {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const formData = await request.formData();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const appUser = await ensureAppUser(user);

  if (!appUser.profile) {
    return NextResponse.redirect(new URL("/onboarding", url.origin));
  }

  const workouts = await prisma.workout.findMany({
    where: { userId: appUser.id },
    orderBy: { date: "desc" },
    take: 12,
  });

  const currentWeeklyKm = getCurrentWeeklyKm(workouts);
  const averageRunsPerWeek = getAverageRunsPerWeek(workouts);
  const recentLongestRunKm = getRecentLongestRunKm(workouts);
  const recentQualitySessionsPerWeek = getRecentQualitySessionsPerWeek(workouts);
  const recentFatigueScore = parsePositiveInt(formData.get("recentFatigueScore"), getAverageRpe(workouts));
  const weeksToRace = parsePositiveInt(formData.get("weeksToRace"), 8);
  const targetDistance = ((formData.get("targetDistance") as GoalDistance | null) ?? "10K") as GoalDistance;
  const level = appUser.profile.level as RunnerLevel;
  const sessions = generateWeekPlan({
    level,
    availableDays: appUser.profile.availableDays,
    currentWeeklyKm,
    targetDistance,
    weeksToRace,
    recentFatigueScore,
    easyPaceSecPerKm: appUser.profile.easyPaceSecPerKm,
    recentLongestRunKm,
    averageRunsPerWeek,
    recentQualitySessionsPerWeek,
  });
  const uniquePlannedDays = new Set(sessions.map((session) => session.dayOfWeek));

  if (uniquePlannedDays.size !== sessions.length) {
    throw new Error("Plan generator produced duplicate training days");
  }

  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const plannedKm = Number(sessions.reduce((sum, session) => sum + session.plannedKm, 0).toFixed(1));

  await prisma.$transaction(async (tx) => {
    await tx.trainingPlan.updateMany({
      where: { userId: appUser.id, isActive: true },
      data: { isActive: false },
    });

    const plan = await tx.trainingPlan.create({
      data: {
        userId: appUser.id,
        name: `${targetDistance} - ${weekStart.toISOString().slice(0, 10)}`,
        startDate: weekStart,
        endDate: weekEnd,
        isActive: true,
      },
    });

    const week = await tx.trainingWeek.create({
      data: {
        trainingPlanId: plan.id,
        weekNumber: 1,
        startDate: weekStart,
        plannedKm,
      },
    });

    await tx.trainingSession.createMany({
      data: sessions.map((session) => ({
        trainingWeekId: week.id,
        dayOfWeek: session.dayOfWeek,
        scheduledDate: getScheduledDate(weekStart, session.dayOfWeek),
        type: session.type,
        plannedDistance: session.plannedKm,
        plannedDuration: session.plannedDurationMin,
        notes: session.notes,
      })),
    });
  });

  return NextResponse.redirect(new URL("/plan?generated=1", url.origin));
}
