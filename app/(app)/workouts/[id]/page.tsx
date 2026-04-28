import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { Badge, ButtonLink, Card, PageHeader, StatGrid } from "@/components/ui";
import { HeartRateChart, TrendChart } from "@/components/charts";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/db/client";
import { formatPaceFromSeconds } from "@/lib/format/pace";
import { createClient } from "@/lib/supabase/server";
import { getStravaActivityStreams } from "@/lib/strava/client";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function round(value: number) {
  return Number(value.toFixed(1));
}

function formatMinutes(minutes: number) {
  if (minutes < 1) {
    return "<1 min";
  }

  return `${Math.round(minutes)} min`;
}

export default async function WorkoutDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ streams?: string }>;
}) {
  const { id } = await params;
  const { streams } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await ensureAppUser(user);
  const workout = await prisma.workout.findFirst({
    where: {
      id,
      userId: appUser.id,
    },
  });

  if (!workout) {
    notFound();
  }

  const stats = [
    { label: "Distancia", value: `${workout.distanceKm} km` },
    { label: "Duracion", value: `${workout.durationMin} min` },
    { label: "Ritmo promedio", value: formatPaceFromSeconds(workout.paceSecPerKm) ?? "Pendiente" },
    { label: "Fuente", value: workout.source },
  ];

  let heartRatePoints: { x: number; y: number }[] = [];
  let pacePoints: { x: number; y: number }[] = [];
  let heartRateZoneKpis: Array<{ label: string; timeMin: number; share: number; color: string }> = [];
  let streamsError: string | null = null;
  const shouldLoadStreams = streams === "1";

  if (shouldLoadStreams && workout.source === "strava" && workout.stravaActivityId) {
    const connection = await prisma.stravaConnection.findUnique({
      where: { userId: appUser.id },
    });

    if (connection) {
      try {
        const streams = await getStravaActivityStreams(connection.id, workout.stravaActivityId);
        const distanceData = streams.distance?.data ?? [];
        const heartrateData = streams.heartrate?.data ?? [];
        const timeData = streams.time?.data ?? [];
        const velocityData = streams.velocity_smooth?.data ?? [];
        const maxHeartRate = appUser.profile?.maxHeartRate ?? workout.maxHeartRate ?? 190;
        const heartRateZones = [
          { label: "Z1", min: Math.round(maxHeartRate * 0.5), max: Math.round(maxHeartRate * 0.6), color: "#2563eb" },
          { label: "Z2", min: Math.round(maxHeartRate * 0.6), max: Math.round(maxHeartRate * 0.7), color: "#0f766e" },
          { label: "Z3", min: Math.round(maxHeartRate * 0.7), max: Math.round(maxHeartRate * 0.8), color: "#ca8a04" },
          { label: "Z4", min: Math.round(maxHeartRate * 0.8), max: Math.round(maxHeartRate * 0.9), color: "#ea580c" },
          { label: "Z5", min: Math.round(maxHeartRate * 0.9), max: maxHeartRate, color: "#dc2626" },
        ];

        heartRatePoints = distanceData
          .map((distance, index) => ({
            x: round(distance / 1000),
            y: heartrateData[index] ?? 0,
          }))
          .filter((point) => point.y > 0);

        pacePoints = distanceData
          .map((distance, index) => {
            const velocity = velocityData[index];

            if (!velocity || velocity <= 0) {
              return null;
            }

            return {
              x: round(distance / 1000),
              y: round(1000 / velocity),
            };
          })
          .filter((point): point is { x: number; y: number } => point !== null);

        if (heartrateData.length > 0 && timeData.length > 1) {
          const zoneSeconds = heartRateZones.map((zone) => ({
            ...zone,
            seconds: 0,
          }));

          for (let index = 1; index < heartrateData.length; index += 1) {
            const bpm = heartrateData[index];
            const delta = Math.max(0, (timeData[index] ?? 0) - (timeData[index - 1] ?? 0));

            if (!bpm || delta <= 0) {
              continue;
            }

            const zone =
              zoneSeconds.find((entry) => bpm >= entry.min && bpm < entry.max) ??
              zoneSeconds[zoneSeconds.length - 1];

            if (zone) {
              zone.seconds += delta;
            }
          }

          const totalSeconds = zoneSeconds.reduce((sum, zone) => sum + zone.seconds, 0) || 1;
          heartRateZoneKpis = zoneSeconds.map((zone) => ({
            label: `${zone.label} · ${zone.min}-${zone.max} bpm`,
            timeMin: zone.seconds / 60,
            share: Math.round((zone.seconds / totalSeconds) * 100),
            color: zone.color,
          }));
        }
      } catch {
        streamsError = "No fue posible cargar los streams de Strava para esta actividad.";
      }
    }
  }

  return (
    <SiteShell showAuthActions={false}>
      <div className="stack" style={{ gap: 24 }}>
        <PageHeader
          eyebrow="Detalle de actividad"
          title={workout.notes?.startsWith("Imported from Strava:") ? workout.notes.replace("Imported from Strava: ", "") : "Sesion registrada"}
          description={`${formatDate(workout.date)} · ${workout.type}`}
          actions={
            <>
              <ButtonLink href="/workouts" variant="secondary">
                Volver a workouts
              </ButtonLink>
              <ButtonLink href="/plan">Ver plan</ButtonLink>
              {workout.source === "strava" && workout.stravaActivityId && !shouldLoadStreams ? (
                <ButtonLink href={`/workouts/${workout.id}?streams=1`}>Cargar graficas</ButtonLink>
              ) : null}
            </>
          }
        />

        <div className="split">
          <Badge>{workout.source}</Badge>
          <Link href="/workouts" className="text-link">
            Ver historial completo
          </Link>
        </div>

        <StatGrid
          items={stats.map((item) => ({
            ...item,
            helper: item.label === "Fuente" ? "Manual o importado desde Strava" : undefined,
          }))}
        />

        <div className="two-column">
          <Card>
            <div className="section-title">
              <h2>Resumen</h2>
              <p>Lectura rapida de la sesion y sus indicadores principales.</p>
            </div>
            <div className="list">
              <div className="session">
                <span className="session-meta">Frecuencia cardiaca promedio</span>
                <strong>{workout.avgHeartRate ?? "Sin dato"}</strong>
              </div>
              <div className="session">
                <span className="session-meta">Frecuencia cardiaca maxima</span>
                <strong>{workout.maxHeartRate ?? "Sin dato"}</strong>
              </div>
              <div className="session">
                <span className="session-meta">RPE</span>
                <strong>{workout.rpe}/10</strong>
              </div>
              <div className="session">
                <span className="session-meta">Notas</span>
                <strong>{workout.notes ?? "Sin notas"}</strong>
              </div>
            </div>
          </Card>

          <Card>
            <div className="section-title">
              <h2>Streams</h2>
              <p>
                {workout.source === "strava"
                  ? "Datos por actividad obtenidos desde Strava."
                  : "Los streams detallados solo estan disponibles para actividades importadas desde Strava."}
              </p>
            </div>
            {workout.source !== "strava" ? (
              <p className="muted">Conecta Strava para ver tendencias de ritmo y frecuencia cardiaca por actividad.</p>
            ) : !shouldLoadStreams ? (
              <div className="stack">
                <p className="muted">
                  El resumen carga rapido desde la base de datos. Las graficas consultan streams de Strava y pueden tardar mas.
                </p>
                <ButtonLink href={`/workouts/${workout.id}?streams=1`}>Cargar graficas de Strava</ButtonLink>
              </div>
            ) : streamsError ? (
              <p className="muted">{streamsError}</p>
            ) : heartRatePoints.length === 0 && pacePoints.length === 0 ? (
              <p className="muted">Esta actividad no devolvio streams utiles de ritmo o frecuencia cardiaca.</p>
            ) : (
              <div className="stack">
                <p className="muted">
                  Eje X: distancia acumulada en km. Las curvas permiten revisar deriva cardiaca y cambios de ritmo a lo largo de la actividad.
                </p>
              </div>
            )}
          </Card>
        </div>

        {shouldLoadStreams && heartRateZoneKpis.length > 0 ? (
          <StatGrid
            items={heartRateZoneKpis.map((zone) => ({
              label: zone.label,
              value: formatMinutes(zone.timeMin),
              helper: `${zone.share}% del tiempo total`,
            }))}
          />
        ) : null}

        {shouldLoadStreams ? (
          <div className="grid grid-2">
            <HeartRateChart
              title="Frecuencia cardiaca"
              subtitle="Valores reales sobre bandas de zona a lo largo de la actividad"
              points={heartRatePoints}
              zones={[
                { label: "Z1", min: Math.round((appUser.profile?.maxHeartRate ?? workout.maxHeartRate ?? 190) * 0.5), max: Math.round((appUser.profile?.maxHeartRate ?? workout.maxHeartRate ?? 190) * 0.6), color: "#2563eb" },
                { label: "Z2", min: Math.round((appUser.profile?.maxHeartRate ?? workout.maxHeartRate ?? 190) * 0.6), max: Math.round((appUser.profile?.maxHeartRate ?? workout.maxHeartRate ?? 190) * 0.7), color: "#0f766e" },
                { label: "Z3", min: Math.round((appUser.profile?.maxHeartRate ?? workout.maxHeartRate ?? 190) * 0.7), max: Math.round((appUser.profile?.maxHeartRate ?? workout.maxHeartRate ?? 190) * 0.8), color: "#ca8a04" },
                { label: "Z4", min: Math.round((appUser.profile?.maxHeartRate ?? workout.maxHeartRate ?? 190) * 0.8), max: Math.round((appUser.profile?.maxHeartRate ?? workout.maxHeartRate ?? 190) * 0.9), color: "#ea580c" },
                { label: "Z5", min: Math.round((appUser.profile?.maxHeartRate ?? workout.maxHeartRate ?? 190) * 0.9), max: appUser.profile?.maxHeartRate ?? workout.maxHeartRate ?? 190, color: "#dc2626" },
              ]}
            />
            <TrendChart
              title="Ritmo por actividad"
              subtitle="Pace calculado a partir del stream de velocidad suave"
              points={pacePoints}
              color="#0f766e"
              yAxisUnit="sec-per-km"
            />
          </div>
        ) : null}
      </div>
    </SiteShell>
  );
}
