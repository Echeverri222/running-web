import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/db/client";
import { getValidStravaAccessToken, listStravaActivities } from "@/lib/strava/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const appUser = await ensureAppUser(user);
    const connection = await prisma.stravaConnection.findUnique({
      where: { userId: appUser.id },
    });

    if (!connection) {
      return NextResponse.json({ error: "missing_connection" }, { status: 404 });
    }

    const token = await getValidStravaAccessToken(connection.id);
    const activities = await listStravaActivities(connection.id);

    return NextResponse.json({
      connection: {
        id: connection.id,
        userId: connection.userId,
        athleteId: connection.stravaAthleteId,
        athleteUsername: connection.athleteUsername,
        scope: connection.scope,
        expiresAt: connection.expiresAt.toISOString(),
      },
      accessTokenPreview: `${token.slice(0, 8)}...`,
      fetched: activities.length,
      sample: activities.slice(0, 5).map((activity) => ({
        id: activity.id,
        name: activity.name,
        type: activity.type,
        sport_type: activity.sport_type,
        distance: activity.distance,
        moving_time: activity.moving_time,
      })),
    });
  } catch (error) {
    console.error("Strava debug failed", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    );
  }
}
