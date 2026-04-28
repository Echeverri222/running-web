import { NextResponse } from "next/server";
import { getStravaEnv } from "@/lib/strava/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/workouts";
  let clientId: string;

  try {
    ({ clientId } = getStravaEnv());
  } catch {
    return NextResponse.redirect(new URL("/workouts?error=strava_not_configured", url.origin));
  }

  const redirectUri = `${url.origin}/api/strava/callback`;
  const authorizeUrl = new URL("https://www.strava.com/oauth/authorize");

  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("approval_prompt", "auto");
  authorizeUrl.searchParams.set("scope", "read,activity:read_all");
  authorizeUrl.searchParams.set("state", next);

  return NextResponse.redirect(authorizeUrl);
}
