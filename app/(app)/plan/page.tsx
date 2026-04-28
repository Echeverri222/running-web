import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/db/client";
import { formatPaceFromSeconds } from "@/lib/format/pace";
import {
  getAverageRpe,
  getAverageRunsPerWeek,
  getCurrentWeeklyKm,
  getRecentLongestRunKm,
  getRecentQualitySessionsPerWeek,
} from "@/lib/training/metrics";
import { Badge, Button, ButtonLink, Card, EmptyState, PageHeader, SectionTitle, StatGrid } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

interface PlanPageProps {
  searchParams: Promise<{
    error?: string;
    generated?: string;
  }>;
}

const dayLabels: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sabado",
  7: "Domingo",
};

const sessionTypeLabels: Record<string, string> = {
  easy: "Easy run",
  recovery: "Recovery run",
  tempo: "Tempo",
  fartlek: "Fartlek",
  intervals: "Intervalos",
  long: "Long run",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatSessionPace(distanceKm?: number | null, durationMin?: number | null) {
  if (!distanceKm || !durationMin) {
    return "Segun sensacion";
  }

  return formatPaceFromSeconds(Math.round((durationMin * 60) / distanceKm)) ?? "Segun sensacion";
}

function renderSessionNotes(notes?: string | null) {
  if (!notes) {
    return ["Sin notas"];
  }

  return notes.split("\n").filter(Boolean);
}

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await ensureAppUser(user);

  if (!appUser.profile) {
    redirect("/onboarding");
  }

  const workouts = await prisma.workout.findMany({
    where: { userId: appUser.id },
    orderBy: { date: "desc" },
    take: 12,
  });

  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId: appUser.id, isActive: true },
    include: {
      workouts: {
        orderBy: { date: "desc" },
      },
      weeks: {
        orderBy: { weekNumber: "asc" },
        take: 1,
        include: {
          sessions: {
            orderBy: { scheduledDate: "asc" },
            include: {
              workout: true,
            },
          },
        },
      },
    },
  });

  const currentWeeklyKm = getCurrentWeeklyKm(workouts);
  const recentFatigueScore = getAverageRpe(workouts);
  const averageRunsPerWeek = getAverageRunsPerWeek(workouts);
  const recentLongestRunKm = getRecentLongestRunKm(workouts);
  const recentQualitySessionsPerWeek = getRecentQualitySessionsPerWeek(workouts);
  const activeWeek = activePlan?.weeks[0];

  const stats = [
    { label: "Volumen actual", value: `${currentWeeklyKm} km`, helper: "Promedio historico reciente" },
    { label: "Fatiga", value: `${recentFatigueScore} / 10`, helper: "Referencia para ajustar carga" },
    {
      label: "Ritmo comodo",
      value: formatPaceFromSeconds(appUser.profile.easyPaceSecPerKm) ?? "Pendiente",
      helper: "Pace base del plan",
    },
    { label: "Frecuencia", value: `${averageRunsPerWeek} runs/semana`, helper: "Ultimas semanas importadas" },
  ];

  return (
    <SiteShell showAuthActions={false}>
      <div className="stack" style={{ gap: 24 }}>
        <PageHeader
          eyebrow="Plan semanal"
          title="Sesiones mas claras, con ritmo por tramo."
          description="El plan usa tu historial real para ajustar volumen y carga. Las sesiones se muestran con el enfoque que necesitas: tipo, objetivo y ritmos sugeridos."
          actions={
            <>
              <ButtonLink href="/workouts">Ver workouts</ButtonLink>
              <ButtonLink href="/dashboard" variant="secondary">
                Dashboard
              </ButtonLink>
            </>
          }
        />

        {params.error ? (
          <Card className="callout">
            <strong>No fue posible generar el plan.</strong>
          </Card>
        ) : null}

        {params.generated ? (
          <Card className="callout">
            <strong>Plan generado correctamente.</strong>
          </Card>
        ) : null}

        <StatGrid items={stats} />

        <div className="grid grid-3">
          <Card className="card-compact metric">
            <span className="metric-label">Tirada larga reciente</span>
            <strong className="metric-value">{recentLongestRunKm} km</strong>
            <span className="muted">Referencia para el long run de la semana</span>
          </Card>
          <Card className="card-compact metric">
            <span className="metric-label">Calidad reciente</span>
            <strong className="metric-value">{recentQualitySessionsPerWeek} sesiones</strong>
            <span className="muted">Tempo, intervalos o carreras</span>
          </Card>
          <Card className="card-compact metric">
            <span className="metric-label">Estado del plan</span>
            <strong className="metric-value">{activeWeek ? "Activo" : "Pendiente"}</strong>
            <span className="muted">{activeWeek ? "Semana lista para revisar" : "Genera una nueva semana"}</span>
          </Card>
        </div>

        <div className="two-column">
          <Card>
            <SectionTitle
              title="Generar semana"
              description="Ajusta el objetivo y la fatiga para recalcular la carga."
            />
            <form action="/api/plan" method="post" className="form-grid">
              <label>
                Distancia objetivo
                <select className="input select" name="targetDistance" defaultValue="10K">
                  <option value="5K">5K</option>
                  <option value="10K">10K</option>
                  <option value="21K">21K</option>
                  <option value="42K">42K</option>
                </select>
              </label>

              <div className="grid grid-2">
                <label>
                  Semanas hasta la carrera
                  <input className="input" name="weeksToRace" type="number" min="1" max="24" defaultValue="8" />
                </label>

                <label>
                  Fatiga reciente
                  <input className="input" name="recentFatigueScore" type="number" min="1" max="10" defaultValue={recentFatigueScore} />
                </label>
              </div>

              <Button type="submit">Generar plan</Button>
            </form>
          </Card>

          <Card className="callout">
            <div className="stack">
              <Badge>Adaptacion</Badge>
              <h2 style={{ letterSpacing: "-0.04em", fontSize: "1.65rem" }}>
                El plan responde a tu historial real, no a una media genrica.
              </h2>
              <p className="muted">
                Frecuencia, tirada larga y calidad reciente alimentan el generador. Eso permite distinguir entre easy, tempo, fartlek, intervalos y long run con mas contexto.
              </p>
            </div>
          </Card>
        </div>

        <Card>
          <SectionTitle
            title="Semana activa"
            description="Cada sesion muestra tipo, distancia, ritmo estimado y enfoque del dia."
          />

          {!activeWeek ? (
            <EmptyState
              title="Aun no has generado un plan."
              description="Usa el formulario de arriba para crear tu primera semana adaptada."
              action={<ButtonLink href="/workouts">Revisar workouts</ButtonLink>}
            />
          ) : (
            <div className="timeline">
              <div className="split">
                <Badge>Semana {activeWeek.weekNumber}</Badge>
                <span className="muted">{activeWeek.plannedKm} km planificados</span>
              </div>

              {activeWeek.sessions.map((session) => (
                <article key={session.id} className="session">
                  <div className="session-head">
                    <div className="session-title">
                      <strong>
                        {dayLabels[session.dayOfWeek]} · {sessionTypeLabels[session.type] ?? session.type}
                      </strong>
                      <span className="session-meta">
                        {formatDate(session.scheduledDate)} · {session.plannedDistance ?? 0} km · {session.plannedDuration ?? "?"} min
                      </span>
                    </div>
                    <Badge>{session.workout ? "Completada" : formatSessionPace(session.plannedDistance, session.plannedDuration)}</Badge>
                  </div>

                  <div className="session-detail-grid">
                    <div className="stack" style={{ gap: 8 }}>
                      {renderSessionNotes(session.notes).map((line, index) => (
                        <p key={`${session.id}-${index}`} className={index === 0 ? "session-lead" : "session-line"}>
                          {line}
                        </p>
                      ))}
                    </div>
                    <span className="muted">
                      {sessionTypeLabels[session.type] ?? session.type}
                    </span>
                    {session.workout ? (
                      <Link href={`/workouts/${session.workout.id}`} className="text-link">
                        Ver actividad vinculada
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle
            title="Actividades guardadas en este plan"
            description="Cada plan conserva sus actividades vinculadas para revisar ejecucion real contra lo planificado."
          />

          {!activePlan || activePlan.workouts.length === 0 ? (
            <EmptyState
              title="Este plan aun no tiene actividades vinculadas."
              description="Cuando registres o sincronices entrenamientos dentro del rango del plan, quedaran asociados aqui."
              action={<ButtonLink href="/workouts">Ir a workouts</ButtonLink>}
            />
          ) : (
            <div className="timeline">
              {activePlan.workouts.map((workout) => (
                <article key={workout.id} className="session">
                  <div className="session-head">
                    <div className="session-title">
                      <Link href={`/workouts/${workout.id}`}>
                        <strong>{sessionTypeLabels[workout.type] ?? workout.type}</strong>
                      </Link>
                      <span className="session-meta">{formatDate(workout.date)} · {workout.source}</span>
                    </div>
                    <Badge>{formatPaceFromSeconds(workout.paceSecPerKm) ?? "Sin ritmo"}</Badge>
                  </div>
                  <div className="split">
                    <span className="muted">{workout.distanceKm} km · {workout.durationMin} min</span>
                    <span className="muted">RPE {workout.rpe}/10</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SiteShell>
  );
}
