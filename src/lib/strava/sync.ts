import { prisma } from "@/lib/db/client";
import { findMatchingSessionForWorkout, findPlanForWorkoutDate } from "@/lib/training/calendar";
import { listStravaActivities } from "@/lib/strava/client";
import { isSupportedStravaActivity, mapStravaActivityType } from "@/lib/strava/map";

export async function syncStravaActivities(userId: string) {
  const connection = await prisma.stravaConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    throw new Error("Strava connection not found");
  }

  const latestImportedWorkout = await prisma.workout.findFirst({
    where: {
      userId,
      source: "strava",
    },
    orderBy: { date: "desc" },
  });

  const after = latestImportedWorkout ? Math.floor(latestImportedWorkout.date.getTime() / 1000) - 1 : undefined;
  const activities = await listStravaActivities(connection.id, after);
  const candidateDates = activities.map((activity) => new Date(activity.start_date));
  const windowStart =
    candidateDates.length > 0
      ? new Date(Math.min(...candidateDates.map((date) => date.getTime())))
      : undefined;
  const windowEnd =
    candidateDates.length > 0
      ? new Date(Math.max(...candidateDates.map((date) => date.getTime())))
      : undefined;
  const matchingPlans =
    windowStart && windowEnd
      ? await prisma.trainingPlan.findMany({
          where: {
            userId,
            startDate: { lte: windowEnd },
            endDate: { gte: windowStart },
          },
          include: {
            weeks: {
              include: {
                sessions: true,
              },
            },
          },
        })
      : [];
  let imported = 0;

  for (const activity of activities) {
    if (!isSupportedStravaActivity(activity)) {
      continue;
    }

    const distanceKm = Number((activity.distance / 1000).toFixed(2));

    if (distanceKm <= 0) {
      continue;
    }

    const durationMin = Number(((activity.moving_time || activity.elapsed_time) / 60).toFixed(1));
    const paceSecPerKm = Math.round((activity.moving_time || activity.elapsed_time) / distanceKm);
    const workoutDate = new Date(activity.start_date);
    const type = mapStravaActivityType(activity);
    const matchedPlan = findPlanForWorkoutDate(matchingPlans, workoutDate);
    const matchedSession = findMatchingSessionForWorkout(matchedPlan, {
      date: workoutDate,
      type,
      trainingSessionId: null,
    });

    const workoutData = {
      trainingPlanId: matchedPlan?.id ?? null,
      trainingSessionId: matchedSession?.id ?? null,
      date: workoutDate,
      type,
      source: "strava" as const,
      distanceKm,
      durationMin,
      paceSecPerKm,
      avgHeartRate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
      maxHeartRate: activity.max_heartrate ? Math.round(activity.max_heartrate) : null,
      elevationGain: activity.total_elevation_gain ?? null,
      notes: `Imported from Strava: ${activity.name}`,
    };

    const existingWorkout = await prisma.workout.findFirst({
      where: {
        userId,
        stravaActivityId: String(activity.id),
      },
      select: { id: true },
    });

    if (existingWorkout) {
      await prisma.$transaction(async (tx) => {
        await tx.workout.update({
          where: { id: existingWorkout.id },
          data: workoutData,
        });

        if (matchedSession) {
          await tx.trainingSession.update({
            where: { id: matchedSession.id },
            data: { status: "completed" },
          });
        }
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const workout = await tx.workout.create({
          data: {
            userId,
            stravaActivityId: String(activity.id),
            rpe: 5,
            ...workoutData,
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
    }

    imported += 1;
  }

  return {
    imported,
    fetched: activities.length,
  };
}
