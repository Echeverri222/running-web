import type { TrainingPlan, TrainingSession, Workout } from "@prisma/client";

type PlanWithSessions = TrainingPlan & {
  weeks: Array<{
    sessions: TrainingSession[];
  }>;
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function getScheduledDate(weekStart: Date, dayOfWeek: number) {
  const value = startOfDay(weekStart);
  value.setDate(value.getDate() + dayOfWeek - 1);
  return value;
}

export function getDayOfWeekFromDate(date: Date) {
  const day = startOfDay(date).getDay();
  return day === 0 ? 7 : day;
}

export function findPlanForWorkoutDate(plans: PlanWithSessions[], workoutDate: Date) {
  const target = startOfDay(workoutDate).getTime();

  return plans.find((plan) => {
    const start = startOfDay(plan.startDate).getTime();
    const end = startOfDay(plan.endDate).getTime();
    return target >= start && target <= end;
  });
}

export function findMatchingSessionForWorkout(
  plan: PlanWithSessions | undefined,
  workout: Pick<Workout, "date" | "type" | "trainingSessionId">,
) {
  if (!plan) {
    return undefined;
  }

  const target = startOfDay(workout.date).getTime();
  const sessions = plan.weeks.flatMap((week) => week.sessions);

  return sessions.find((session) => {
    if (session.status === "completed") {
      return false;
    }

    const scheduled = startOfDay(session.scheduledDate).getTime();
    return scheduled === target && session.type === workout.type;
  }) ?? sessions.find((session) => {
    if (session.status === "completed") {
      return false;
    }

    const scheduled = startOfDay(session.scheduledDate).getTime();
    return scheduled === target;
  });
}

export function getCalendarMonthStart(currentMonth: string | undefined) {
  if (currentMonth && /^\d{4}-\d{2}$/.test(currentMonth)) {
    const [year, month] = currentMonth.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }

  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
}

export function getCalendarGrid(monthStart: Date) {
  const first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const start = startOfDay(first);
  const firstDay = start.getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  start.setDate(start.getDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + index);
    return value;
  });
}

export function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
