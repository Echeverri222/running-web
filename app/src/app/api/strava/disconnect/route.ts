import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/db/client";
import { deauthorizeStrava } from "@/lib/strava/client";

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
  const connection = await prisma.stravaConnection.findUnique({
    where: { userId: appUser.id },
  });

  if (connection) {
    try {
      await deauthorizeStrava(connection.id);
    } catch {
      // Local cleanup still matters even if the remote deauthorize request fails.
    }

    await prisma.stravaConnection.delete({
      where: { id: connection.id },
    });
  }

  return NextResponse.redirect(new URL("/workouts?status=strava_disconnected", url.origin));
}
