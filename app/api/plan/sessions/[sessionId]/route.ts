import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/db/client";
import { getDayOfWeekFromDate } from "@/lib/training/calendar";

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const url = new URL(request.url);
  const formData = await request.formData();
  const nextDateValue = formData.get("scheduledDate");
  const nextPath = typeof formData.get("next") === "string" ? String(formData.get("next")) : "/workouts";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  if (typeof nextDateValue !== "string" || !nextDateValue) {
    return NextResponse.redirect(new URL("/workouts?error=invalid_schedule", url.origin));
  }

  const appUser = await ensureAppUser(user);
  const session = await prisma.trainingSession.findFirst({
    where: {
      id: sessionId,
      trainingWeek: {
        trainingPlan: {
          userId: appUser.id,
        },
      },
    },
    include: {
      trainingWeek: {
        include: {
          trainingPlan: true,
        },
      },
    },
  });

  if (!session) {
    return NextResponse.redirect(new URL("/workouts?error=session_not_found", url.origin));
  }

  if (session.status === "completed") {
    return NextResponse.redirect(new URL("/workouts?error=session_completed", url.origin));
  }

  const nextDate = startOfDay(new Date(nextDateValue));
  const today = startOfDay(new Date());

  if (Number.isNaN(nextDate.getTime()) || nextDate.getTime() < today.getTime()) {
    return NextResponse.redirect(new URL("/workouts?error=invalid_schedule", url.origin));
  }

  const planStart = startOfDay(session.trainingWeek.trainingPlan.startDate);
  const planEnd = startOfDay(session.trainingWeek.trainingPlan.endDate);

  if (nextDate.getTime() < planStart.getTime() || nextDate.getTime() > planEnd.getTime()) {
    return NextResponse.redirect(new URL("/workouts?error=outside_plan", url.origin));
  }

  const conflictingSession = await prisma.trainingSession.findFirst({
    where: {
      trainingWeekId: session.trainingWeekId,
      id: { not: session.id },
      scheduledDate: nextDate,
    },
    select: { id: true },
  });

  if (conflictingSession) {
    return NextResponse.redirect(new URL("/workouts?error=duplicate_day", url.origin));
  }

  await prisma.trainingSession.update({
    where: { id: session.id },
    data: {
      scheduledDate: nextDate,
      dayOfWeek: getDayOfWeekFromDate(nextDate),
      status: session.status === "planned" ? "moved" : session.status,
    },
  });

  return NextResponse.redirect(new URL(nextPath, url.origin));
}
