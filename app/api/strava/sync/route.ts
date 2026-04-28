import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { syncStravaActivities } from "@/lib/strava/sync";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const appUser = await ensureAppUser(user);
  try {
    await syncStravaActivities(appUser.id);
  } catch (error) {
    console.error("Strava sync failed", error);
    return NextResponse.redirect(new URL("/workouts?error=strava_sync_failed", url.origin));
  }

  return NextResponse.redirect(new URL("/workouts?synced=strava", url.origin));
}
