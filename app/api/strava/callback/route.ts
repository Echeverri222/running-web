import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/db/client";
import { encryptString } from "@/lib/security/crypto";
import { exchangeStravaCode } from "@/lib/strava/client";
import { syncStravaActivities } from "@/lib/strava/sync";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state") ?? "/workouts";

  if (error) {
    return NextResponse.redirect(new URL(`/workouts?error=strava_access_denied`, url.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL(`/workouts?error=strava_missing_code`, url.origin));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const appUser = await ensureAppUser(user);
  try {
    const token = await exchangeStravaCode(code);

    if (!token.athlete) {
      return NextResponse.redirect(new URL(`/workouts?error=strava_invalid_athlete`, url.origin));
    }

    await prisma.stravaConnection.upsert({
      where: { userId: appUser.id },
      update: {
        stravaAthleteId: String(token.athlete.id),
        athleteUsername: token.athlete.username ?? null,
        athleteFirstname: token.athlete.firstname ?? null,
        athleteLastname: token.athlete.lastname ?? null,
        scope: token.scope ?? null,
        accessTokenEnc: encryptString(token.access_token),
        refreshTokenEnc: encryptString(token.refresh_token),
        expiresAt: new Date(token.expires_at * 1000),
      },
      create: {
        userId: appUser.id,
        stravaAthleteId: String(token.athlete.id),
        athleteUsername: token.athlete.username ?? null,
        athleteFirstname: token.athlete.firstname ?? null,
        athleteLastname: token.athlete.lastname ?? null,
        scope: token.scope ?? null,
        accessTokenEnc: encryptString(token.access_token),
        refreshTokenEnc: encryptString(token.refresh_token),
        expiresAt: new Date(token.expires_at * 1000),
      },
    });

    await syncStravaActivities(appUser.id);
  } catch (error) {
    console.error("Strava callback sync failed", error);
    return NextResponse.redirect(new URL(`/workouts?error=strava_sync_failed`, url.origin));
  }

  return NextResponse.redirect(new URL(`${state}?connected=strava`, url.origin));
}
