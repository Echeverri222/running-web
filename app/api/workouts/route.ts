import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/db/client";
import { findMatchingSessionForWorkout, findPlanForWorkoutDate } from "@/lib/training/calendar";
import { workoutSchema } from "@/lib/validations/workout";

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return Number(value);
}

function optionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  return value.trim();
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
  const parsed = workoutSchema.safeParse({
    date: formData.get("date"),
    type: formData.get("type"),
    distanceKm: Number(formData.get("distanceKm")),
    durationMin: Number(formData.get("durationMin")),
    avgHeartRate: optionalNumber(formData.get("avgHeartRate")),
    maxHeartRate: optionalNumber(formData.get("maxHeartRate")),
    rpe: Number(formData.get("rpe")),
    notes: optionalText(formData.get("notes")),
  });

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/workouts?error=invalid_workout", url.origin));
  }

  const paceSecPerKm = Math.round((parsed.data.durationMin * 60) / parsed.data.distanceKm);
  const workoutDate = new Date(parsed.data.date);
  const matchingPlans = await prisma.trainingPlan.findMany({
    where: {
      userId: appUser.id,
      startDate: { lte: workoutDate },
      endDate: { gte: workoutDate },
    },
    include: {
      weeks: {
        include: {
          sessions: true,
        },
      },
    },
  });
  const matchedPlan = findPlanForWorkoutDate(matchingPlans, workoutDate);
  const matchedSession = findMatchingSessionForWorkout(matchedPlan, {
    date: workoutDate,
    type: parsed.data.type,
    trainingSessionId: null,
  });

  await prisma.$transaction(async (tx) => {
    const workout = await tx.workout.create({
      data: {
        userId: appUser.id,
        trainingPlanId: matchedPlan?.id,
        trainingSessionId: matchedSession?.id,
        date: workoutDate,
        type: parsed.data.type,
        distanceKm: parsed.data.distanceKm,
        durationMin: parsed.data.durationMin,
        paceSecPerKm,
        avgHeartRate: parsed.data.avgHeartRate,
        maxHeartRate: parsed.data.maxHeartRate,
        rpe: parsed.data.rpe,
        notes: parsed.data.notes,
      },
    });

    if (matchedSession) {
      await tx.trainingSession.update({
        where: { id: matchedSession.id },
        data: {
          status: "completed",
          workout: {
            connect: {
              id: workout.id,
            },
          },
        },
      });
    }
  });

  return NextResponse.redirect(new URL("/workouts", url.origin));
}
