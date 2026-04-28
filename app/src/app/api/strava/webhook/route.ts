import { NextResponse } from "next/server";
import { getStravaEnv } from "@/lib/strava/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const { webhookVerifyToken } = getStravaEnv();

  if (mode !== "subscribe" || verifyToken !== webhookVerifyToken || !challenge) {
    return NextResponse.json({ error: "invalid_webhook_verification" }, { status: 400 });
  }

  return NextResponse.json({ "hub.challenge": challenge });
}

export async function POST() {
  return NextResponse.json({ received: true });
}
