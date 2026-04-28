import { prisma } from "@/lib/db/client";
import { decryptString, encryptString } from "@/lib/security/crypto";
import { getStravaEnv } from "@/lib/strava/env";

const STRAVA_API = "https://www.strava.com/api/v3";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: {
    id: number;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  };
  scope?: string;
};

export async function exchangeStravaCode(code: string) {
  const { clientId, clientSecret } = getStravaEnv();
  const response = await fetch("https://www.strava.com/api/v3/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Strava token exchange failed: ${response.status}`);
  }

  return (await response.json()) as TokenResponse;
}

async function refreshStravaToken(refreshToken: string) {
  const { clientId, clientSecret } = getStravaEnv();
  const response = await fetch("https://www.strava.com/api/v3/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Strava token refresh failed: ${response.status}`);
  }

  return (await response.json()) as TokenResponse;
}

export async function getValidStravaAccessToken(connectionId: string) {
  const connection = await prisma.stravaConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new Error("Strava connection not found");
  }

  const refreshToken = decryptString(connection.refreshTokenEnc);
  const accessToken = decryptString(connection.accessTokenEnc);
  const nowPlusMinute = Date.now() + 60_000;

  if (connection.expiresAt.getTime() > nowPlusMinute) {
    return accessToken;
  }

  const refreshed = await refreshStravaToken(refreshToken);

  await prisma.stravaConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEnc: encryptString(refreshed.access_token),
      refreshTokenEnc: encryptString(refreshed.refresh_token),
      expiresAt: new Date(refreshed.expires_at * 1000),
      scope: refreshed.scope ?? connection.scope,
      athleteUsername: refreshed.athlete?.username ?? connection.athleteUsername,
      athleteFirstname: refreshed.athlete?.firstname ?? connection.athleteFirstname,
      athleteLastname: refreshed.athlete?.lastname ?? connection.athleteLastname,
    },
  });

  return refreshed.access_token;
}

export async function listStravaActivities(connectionId: string, after?: number) {
  const accessToken = await getValidStravaAccessToken(connectionId);
  const activities: StravaActivitySummary[] = [];
  let page = 1;

  while (page <= 4) {
    const query = new URLSearchParams({
      page: String(page),
      per_page: "50",
    });

    if (after) {
      query.set("after", String(after));
    }

    const response = await fetch(`${STRAVA_API}/athlete/activities?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Strava activities fetch failed: ${response.status}`);
    }

    const pageItems = (await response.json()) as StravaActivitySummary[];
    activities.push(...pageItems);

    if (pageItems.length < 50) {
      break;
    }

    page += 1;
  }

  return activities;
}

export async function deauthorizeStrava(connectionId: string) {
  const accessToken = await getValidStravaAccessToken(connectionId);
  const response = await fetch("https://www.strava.com/oauth/deauthorize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Strava deauthorize failed: ${response.status}`);
  }
}

type StreamSeries<T> = {
  data: T[];
  series_type: string;
  original_size: number;
  resolution: string;
};

export type StravaActivityStreams = {
  distance?: StreamSeries<number>;
  heartrate?: StreamSeries<number>;
  time?: StreamSeries<number>;
  velocity_smooth?: StreamSeries<number>;
};

export async function getStravaActivityStreams(connectionId: string, activityId: string) {
  const accessToken = await getValidStravaAccessToken(connectionId);
  const query = new URLSearchParams({
    keys: "distance,heartrate,time,velocity_smooth",
    key_by_type: "true",
  });
  const response = await fetch(`${STRAVA_API}/activities/${activityId}/streams?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      return {};
    }

    throw new Error(`Strava activity streams fetch failed: ${response.status}`);
  }

  const payload = await response.json();

  if (Array.isArray(payload)) {
    const keyed: StravaActivityStreams = {};

    for (const stream of payload) {
      const type = stream.type as keyof StravaActivityStreams;
      keyed[type] = stream;
    }

    return keyed;
  }

  return payload as StravaActivityStreams;
}

export type StravaActivitySummary = {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_heartrate?: number;
  max_heartrate?: number;
  elev_high?: number | null;
  total_elevation_gain?: number;
};
