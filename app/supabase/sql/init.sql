-- Running Web MVP - Initial SQL schema
-- This script mirrors prisma/schema.prisma (current project state).

begin;

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

create table if not exists "User" (
  "id" text primary key,
  "email" text not null unique,
  "name" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "RunnerProfile" (
  "id" text primary key,
  "userId" text not null unique,
  "age" integer,
  "weightKg" double precision,
  "heightCm" double precision,
  "level" text not null,
  "availableDays" integer not null,
  "easyPaceSecPerKm" integer,
  "maxHeartRate" integer,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "RunnerProfile_userId_fkey"
    foreign key ("userId") references "User"("id") on delete cascade
);

create table if not exists "RaceGoal" (
  "id" text primary key,
  "userId" text not null,
  "distance" text not null,
  "targetDate" timestamptz not null,
  "targetTimeS" integer,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "RaceGoal_userId_fkey"
    foreign key ("userId") references "User"("id") on delete cascade
);

create index if not exists "RaceGoal_userId_targetDate_idx"
  on "RaceGoal" ("userId", "targetDate");

create table if not exists "Workout" (
  "id" text primary key,
  "userId" text not null,
  "date" timestamptz not null,
  "type" text not null,
  "distanceKm" double precision not null,
  "durationMin" double precision not null,
  "paceSecPerKm" integer,
  "avgHeartRate" integer,
  "maxHeartRate" integer,
  "elevationGain" double precision,
  "rpe" integer not null,
  "notes" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Workout_userId_fkey"
    foreign key ("userId") references "User"("id") on delete cascade
);

create index if not exists "Workout_userId_date_idx"
  on "Workout" ("userId", "date");

create table if not exists "TrainingPlan" (
  "id" text primary key,
  "userId" text not null,
  "name" text not null,
  "startDate" timestamptz not null,
  "endDate" timestamptz not null,
  "isActive" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "TrainingPlan_userId_fkey"
    foreign key ("userId") references "User"("id") on delete cascade
);

create index if not exists "TrainingPlan_userId_isActive_idx"
  on "TrainingPlan" ("userId", "isActive");

create table if not exists "TrainingWeek" (
  "id" text primary key,
  "trainingPlanId" text not null,
  "weekNumber" integer not null,
  "startDate" timestamptz not null,
  "plannedKm" double precision not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "TrainingWeek_trainingPlanId_fkey"
    foreign key ("trainingPlanId") references "TrainingPlan"("id") on delete cascade
);

create index if not exists "TrainingWeek_trainingPlanId_weekNumber_idx"
  on "TrainingWeek" ("trainingPlanId", "weekNumber");

create table if not exists "TrainingSession" (
  "id" text primary key,
  "trainingWeekId" text not null,
  "dayOfWeek" integer not null,
  "type" text not null,
  "plannedDistance" double precision,
  "plannedDuration" integer,
  "notes" text,
  "status" text not null default 'planned',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "TrainingSession_trainingWeekId_fkey"
    foreign key ("trainingWeekId") references "TrainingWeek"("id") on delete cascade
);

create index if not exists "TrainingSession_trainingWeekId_dayOfWeek_idx"
  on "TrainingSession" ("trainingWeekId", "dayOfWeek");

create table if not exists "StravaConnection" (
  "id" text primary key,
  "userId" text not null unique,
  "stravaAthleteId" text not null unique,
  "accessTokenEnc" text not null,
  "refreshTokenEnc" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- updatedAt triggers

drop trigger if exists trg_user_updated_at on "User";
create trigger trg_user_updated_at
before update on "User"
for each row execute function set_updated_at();

drop trigger if exists trg_runner_profile_updated_at on "RunnerProfile";
create trigger trg_runner_profile_updated_at
before update on "RunnerProfile"
for each row execute function set_updated_at();

drop trigger if exists trg_race_goal_updated_at on "RaceGoal";
create trigger trg_race_goal_updated_at
before update on "RaceGoal"
for each row execute function set_updated_at();

drop trigger if exists trg_workout_updated_at on "Workout";
create trigger trg_workout_updated_at
before update on "Workout"
for each row execute function set_updated_at();

drop trigger if exists trg_training_plan_updated_at on "TrainingPlan";
create trigger trg_training_plan_updated_at
before update on "TrainingPlan"
for each row execute function set_updated_at();

drop trigger if exists trg_training_week_updated_at on "TrainingWeek";
create trigger trg_training_week_updated_at
before update on "TrainingWeek"
for each row execute function set_updated_at();

drop trigger if exists trg_training_session_updated_at on "TrainingSession";
create trigger trg_training_session_updated_at
before update on "TrainingSession"
for each row execute function set_updated_at();

drop trigger if exists trg_strava_connection_updated_at on "StravaConnection";
create trigger trg_strava_connection_updated_at
before update on "StravaConnection"
for each row execute function set_updated_at();

commit;
