import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/db/client";
import { formatPaceFromSeconds } from "@/lib/format/pace";
import { formatMonthKey, getCalendarGrid, getCalendarMonthStart } from "@/lib/training/calendar";
import { Badge, Button, ButtonLink, Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

interface WorkoutsPageProps {
  searchParams: Promise<{
    error?: string;
    synced?: string;
    connected?: string;
    disconnected?: string;
    month?: string;
  }>;
}

const errorMap: Record<string, string> = {
  invalid_workout: "Revisa los datos del entrenamiento. Hay uno o mas campos invalidos.",
  strava_access_denied: "La conexion con Strava fue cancelada.",
  strava_missing_code: "Strava no devolvio el codigo de autorizacion.",
  strava_invalid_athlete: "No fue posible leer el atleta autorizado de Strava.",
  strava_not_configured: "Faltan STRAVA_CLIENT_ID o STRAVA_CLIENT_SECRET en .env.",
  strava_sync_failed: "No fue posible sincronizar actividades de Strava.",
  invalid_schedule: "La nueva fecha no es valida para esa sesion.",
  outside_plan: "La actividad futura debe mantenerse dentro del rango del plan activo.",
  duplicate_day: "Ya tienes otra actividad planificada para ese dia.",
  session_completed: "No puedes mover una sesion que ya fue completada.",
  session_not_found: "La sesion planificada ya no existe o no te pertenece.",
};

const sessionTypeLabels: Record<string, string> = {
  easy: "Easy",
  recovery: "Recovery",
  tempo: "Tempo",
  fartlek: "Fartlek",
  intervals: "Intervalos",
  long: "Long",
  race: "Carrera",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCalendarDay(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function WorkoutsPage({ searchParams }: WorkoutsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await ensureAppUser(user);
  const stravaConnection = await prisma.stravaConnection.findUnique({
    where: { userId: appUser.id },
  });
  const monthStart = getCalendarMonthStart(params.month);
  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const calendarDays = getCalendarGrid(monthStart);
  const calendarStart = calendarDays[0];
  const calendarEnd = new Date(calendarDays[calendarDays.length - 1]);
  calendarEnd.setHours(23, 59, 59, 999);

  const [recentWorkouts, calendarWorkouts, activePlan] = await Promise.all([
    prisma.workout.findMany({
      where: { userId: appUser.id },
      orderBy: { date: "desc" },
      take: 12,
    }),
    prisma.workout.findMany({
      where: {
        userId: appUser.id,
        date: {
          gte: calendarStart,
          lte: calendarEnd,
        },
      },
      orderBy: { date: "asc" },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId: appUser.id, isActive: true },
      include: {
        weeks: {
          orderBy: { weekNumber: "asc" },
          include: {
            sessions: {
              where: {
                scheduledDate: {
                  gte: calendarStart,
                  lte: calendarEnd,
                },
              },
              orderBy: { scheduledDate: "asc" },
              include: {
                workout: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);
  const plannedSessions = activePlan?.weeks.flatMap((week) => week.sessions) ?? [];
  const workoutsByDay = new Map<string, typeof calendarWorkouts>();
  const sessionsByDay = new Map<string, typeof plannedSessions>();
  const todayKey = dateKey(new Date());
  const currentMonthKey = formatMonthKey(monthStart);
  const calendarReturnPath = `/workouts?month=${currentMonthKey}`;

  for (const workout of calendarWorkouts) {
    const key = dateKey(workout.date);
    workoutsByDay.set(key, [...(workoutsByDay.get(key) ?? []), workout]);
  }

  for (const session of plannedSessions) {
    const key = dateKey(session.scheduledDate);
    sessionsByDay.set(key, [...(sessionsByDay.get(key) ?? []), session]);
  }

  return (
    <SiteShell showAuthActions={false}>
      <div className="stack" style={{ gap: 24 }}>
        <PageHeader
          eyebrow="Workouts"
          title="Registro manual, Strava y calendario en un solo lugar."
          description="Revisa lo ya hecho, ve lo que viene del plan activo y mueve sesiones futuras sin salir del calendario."
          actions={
            <>
              <ButtonLink href="/plan">Ir al plan</ButtonLink>
              <ButtonLink href="/dashboard" variant="secondary">
                Dashboard
              </ButtonLink>
            </>
          }
        />

        {params.error ? (
          <Card className="callout">
            <strong>{errorMap[params.error] ?? "No fue posible guardar el entrenamiento."}</strong>
          </Card>
        ) : null}

        {params.synced ? (
          <Card className="callout">
            <strong>Strava sincronizado correctamente.</strong>
          </Card>
        ) : null}

        {params.connected ? (
          <Card className="callout">
            <strong>Strava conectado. Actividades importadas y listas para usar.</strong>
          </Card>
        ) : null}

        <Card>
          <SectionTitle
            title="Calendario vivo"
            description="Historial hecho y sesiones futuras del plan activo, todo en la misma vista."
            actions={
              <div className="toolbar">
                <ButtonLink href={`/workouts?month=${formatMonthKey(prevMonth)}`} variant="ghost">
                  Mes anterior
                </ButtonLink>
                <ButtonLink href={`/workouts?month=${formatMonthKey(nextMonth)}`} variant="ghost">
                  Mes siguiente
                </ButtonLink>
              </div>
            }
          />
          <div className="calendar-title-row">
            <strong>{formatMonthLabel(monthStart)}</strong>
            <span className="muted">
              {activePlan ? `Plan activo: ${activePlan.name}` : "Sin plan activo"}
            </span>
          </div>
          <div className="calendar-scroll">
            <div className="calendar-grid calendar-grid-head">
              {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((label) => (
                <span key={label} className="calendar-head-cell">
                  {label}
                </span>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarDays.map((day) => {
                const key = dateKey(day);
                const dayWorkouts = workoutsByDay.get(key) ?? [];
                const daySessions = sessionsByDay.get(key) ?? [];
                const isCurrentMonth = day.getMonth() === monthStart.getMonth();
                const isToday = key === todayKey;

                return (
                  <article
                    key={key}
                    className={`calendar-day ${isCurrentMonth ? "" : "calendar-day-muted"} ${isToday ? "calendar-day-today" : ""}`.trim()}
                  >
                    <div className="calendar-day-head">
                      <strong>{day.getDate()}</strong>
                      <span className="session-meta">{formatCalendarDay(day)}</span>
                    </div>

                    <div className="calendar-day-body">
                      {daySessions.map((session) => {
                        const canMove = !session.workout && key >= todayKey;

                        return (
                          <div key={session.id} className="calendar-item calendar-item-plan">
                            <Link href={`/plan/sessions/${session.id}`} className="calendar-plan-link">
                              <span className="calendar-item-kicker">
                                {session.workout ? "Completada" : "Planificada"}
                              </span>
                              <span className="calendar-item-title">
                                {sessionTypeLabels[session.type] ?? session.type} · {session.plannedDistance ?? 0} km
                              </span>
                              <span className="muted">
                                {session.plannedDuration ?? "?"} min · {session.status}
                              </span>
                            </Link>
                            {session.workout ? (
                              <Link href={`/workouts/${session.workout.id}`} className="text-link">
                                Ver actividad realizada
                              </Link>
                            ) : null}
                            {canMove ? (
                              <form
                                action={`/api/plan/sessions/${session.id}`}
                                method="post"
                                className="calendar-move-form"
                              >
                                <input type="hidden" name="next" value={calendarReturnPath} />
                                <input
                                  className="input"
                                  type="date"
                                  name="scheduledDate"
                                  defaultValue={formatDateInput(session.scheduledDate)}
                                  min={formatDateInput(new Date())}
                                  aria-label="Nueva fecha de la sesion"
                                />
                                <Button type="submit" variant="ghost">
                                  Mover
                                </Button>
                              </form>
                            ) : null}
                          </div>
                        );
                      })}

                      {dayWorkouts.map((workout) => (
                        <Link key={workout.id} href={`/workouts/${workout.id}`} className="calendar-item calendar-item-workout">
                          <span className="calendar-item-title">
                            {sessionTypeLabels[workout.type] ?? workout.type} · {workout.distanceKm} km
                          </span>
                          <span className="muted">
                            {formatPaceFromSeconds(workout.paceSecPerKm) ?? "Sin ritmo"} · {workout.source}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="two-column">
          <Card>
            <SectionTitle
              title="Strava"
              description="Importa actividades y vuelve a sincronizar cuando quieras."
            />
            <div className="stack">
              {stravaConnection ? (
                <>
                  <div className="grid grid-2">
                    <div className="session">
                      <span className="session-meta">Conectado como</span>
                      <strong>
                        {stravaConnection.athleteFirstname ?? stravaConnection.athleteUsername ?? "athlete"}
                      </strong>
                    </div>
                    <div className="session">
                      <span className="session-meta">Scope</span>
                      <strong>{stravaConnection.scope ?? "read"}</strong>
                    </div>
                  </div>
                  <div className="hero-actions">
                    <form action="/api/strava/sync" method="post">
                      <Button type="submit">Sincronizar actividades</Button>
                    </form>
                    <form action="/api/strava/disconnect" method="post">
                      <Button type="submit" variant="secondary">
                        Desconectar
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <EmptyState
                  title="Aun no conectas Strava."
                  description="Conecta para importar actividades automaticas y evitar doble registro."
                  action={
                    <ButtonLink href="/api/strava/connect?next=/workouts">Conectar con Strava</ButtonLink>
                  }
                />
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle
              title="Nuevo entrenamiento"
              description="El ritmo promedio se calcula automaticamente por distancia y duracion."
            />
            <form action="/api/workouts" method="post" className="form-grid">
              <label>
                Fecha
                <input className="input" name="date" type="date" required />
              </label>

              <label>
                Tipo
                <select className="input select" name="type" defaultValue="easy">
                  <option value="easy">Easy</option>
                  <option value="recovery">Recovery</option>
                  <option value="long">Long run</option>
                  <option value="tempo">Tempo</option>
                  <option value="fartlek">Fartlek</option>
                  <option value="intervals">Intervals</option>
                  <option value="race">Race</option>
                </select>
              </label>

              <div className="grid grid-2">
                <label>
                  Distancia (km)
                  <input className="input" name="distanceKm" type="number" step="0.1" min="0.1" required />
                </label>

                <label>
                  Duracion (min)
                  <input className="input" name="durationMin" type="number" step="0.1" min="1" required />
                </label>
              </div>

              <div className="grid grid-2">
                <label>
                  FC promedio
                  <input className="input" name="avgHeartRate" type="number" min="40" max="240" />
                </label>

                <label>
                  FC maxima
                  <input className="input" name="maxHeartRate" type="number" min="40" max="240" />
                </label>
              </div>

              <label>
                RPE (1-10)
                <input className="input" name="rpe" type="number" min="1" max="10" defaultValue="5" required />
              </label>

              <label>
                Notas
                <textarea className="input textarea" name="notes" rows={4} placeholder="Sensaciones, clima, terreno..." />
              </label>

              <Button type="submit">Guardar entrenamiento</Button>
            </form>
          </Card>
        </div>

        <Card>
          <SectionTitle
            title="Historial reciente"
            description={`Ultimas ${recentWorkouts.length} sesiones con ritmo calculado, fuente de origen y enlace al detalle.`}
          />

          {recentWorkouts.length === 0 ? (
            <EmptyState
              title="Aun no tienes entrenamientos guardados."
              description="Importa desde Strava o registra tu primera salida manual."
              action={<ButtonLink href="/api/strava/connect?next=/workouts">Conectar Strava</ButtonLink>}
            />
          ) : (
            <div className="timeline">
              {recentWorkouts.map((workout) => (
                <article key={workout.id} className="session">
                  <div className="session-head">
                    <div className="session-title">
                      <Link href={`/workouts/${workout.id}`}>
                        <strong className="capitalize">{workout.type}</strong>
                      </Link>
                      <span className="session-meta">{formatDate(workout.date)}</span>
                    </div>
                    <Badge>{workout.source}</Badge>
                  </div>

                  <div className="grid grid-3">
                    <div className="session">
                      <span className="session-meta">Distancia</span>
                      <strong>{workout.distanceKm} km</strong>
                    </div>
                    <div className="session">
                      <span className="session-meta">Duracion</span>
                      <strong>{workout.durationMin} min</strong>
                    </div>
                    <div className="session">
                      <span className="session-meta">Ritmo</span>
                      <strong>{formatPaceFromSeconds(workout.paceSecPerKm) ?? "Sin ritmo"}</strong>
                    </div>
                  </div>

                  <div className="split">
                    <span className="muted">RPE {workout.rpe}/10</span>
                    {workout.notes ? <span className="muted">{workout.notes}</span> : null}
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
