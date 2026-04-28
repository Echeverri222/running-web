-- Upgrade for plan calendar + workout/session links.
-- Run this in Supabase SQL Editor when `prisma db push` hangs against the pooler.

begin;

-- Workout fields added after the initial schema.
alter table if exists "Workout"
  add column if not exists "source" text not null default 'manual',
  add column if not exists "stravaActivityId" text,
  add column if not exists "trainingPlanId" text,
  add column if not exists "trainingSessionId" text;

-- Training sessions now need a concrete calendar date.
alter table if exists "TrainingSession"
  add column if not exists "scheduledDate" timestamptz;

update "TrainingSession" ts
set "scheduledDate" = date_trunc('day', tw."startDate") + ((ts."dayOfWeek" - 1) * interval '1 day')
from "TrainingWeek" tw
where ts."trainingWeekId" = tw."id"
  and ts."scheduledDate" is null;

alter table if exists "TrainingSession"
  alter column "scheduledDate" set not null;

-- Strava connection fields used by the current app.
alter table if exists "StravaConnection"
  add column if not exists "athleteUsername" text,
  add column if not exists "athleteFirstname" text,
  add column if not exists "athleteLastname" text,
  add column if not exists "scope" text;

-- Indexes and unique constraints expected by Prisma/current queries.
create unique index if not exists "Workout_stravaActivityId_key"
  on "Workout" ("stravaActivityId")
  where "stravaActivityId" is not null;

create unique index if not exists "Workout_trainingSessionId_key"
  on "Workout" ("trainingSessionId")
  where "trainingSessionId" is not null;

create index if not exists "Workout_trainingPlanId_date_idx"
  on "Workout" ("trainingPlanId", "date");

create index if not exists "TrainingSession_scheduledDate_idx"
  on "TrainingSession" ("scheduledDate");

-- Some existing generated plans can have more than one session on the same day.
-- Keep this non-unique so the upgrade does not rewrite user data.
create index if not exists "TrainingSession_trainingWeekId_scheduledDate_idx"
  on "TrainingSession" ("trainingWeekId", "scheduledDate");

-- Foreign keys. Wrapped in DO blocks because PostgreSQL lacks
-- `add constraint if not exists`.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'Workout_trainingPlanId_fkey'
  ) then
    alter table "Workout"
      add constraint "Workout_trainingPlanId_fkey"
      foreign key ("trainingPlanId") references "TrainingPlan"("id") on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'Workout_trainingSessionId_fkey'
  ) then
    alter table "Workout"
      add constraint "Workout_trainingSessionId_fkey"
      foreign key ("trainingSessionId") references "TrainingSession"("id") on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'StravaConnection_userId_fkey'
  ) then
    alter table "StravaConnection"
      add constraint "StravaConnection_userId_fkey"
      foreign key ("userId") references "User"("id") on delete cascade;
  end if;
end $$;

commit;
