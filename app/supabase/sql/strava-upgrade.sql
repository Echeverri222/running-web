begin;

alter table if exists "Workout"
  add column if not exists "source" text not null default 'manual';

alter table if exists "Workout"
  add column if not exists "stravaActivityId" text;

create unique index if not exists "Workout_stravaActivityId_key"
  on "Workout" ("stravaActivityId")
  where "stravaActivityId" is not null;

alter table if exists "StravaConnection"
  add column if not exists "athleteUsername" text,
  add column if not exists "athleteFirstname" text,
  add column if not exists "athleteLastname" text,
  add column if not exists "scope" text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'StravaConnection_userId_fkey'
  ) then
    alter table "StravaConnection"
      add constraint "StravaConnection_userId_fkey"
      foreign key ("userId") references "User"("id") on delete cascade;
  end if;
end $$;

commit;
