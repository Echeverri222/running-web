function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getStravaEnv() {
  return {
    clientId: requireEnv("STRAVA_CLIENT_ID"),
    clientSecret: requireEnv("STRAVA_CLIENT_SECRET"),
    webhookVerifyToken: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ?? "strava-webhook-token",
  };
}
