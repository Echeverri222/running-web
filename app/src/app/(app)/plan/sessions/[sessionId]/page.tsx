import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { Badge, Button, ButtonLink, Card, PageHeader, SectionTitle, StatGrid } from "@/components/ui";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/db/client";
import { formatPaceFromSeconds } from "@/lib/format/pace";
import { createClient } from "@/lib/supabase/server";

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
  race: "Carrera",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatSessionPace(distanceKm?: number | null, durationMin?: number | null) {
  if (!distanceKm || !durationMin) {
    return "Segun sensacion";
  }

  return formatPaceFromSeconds(Math.round((durationMin * 60) / distanceKm)) ?? "Segun sensacion";
}

function renderSessionNotes(notes?: string | null) {
  if (!notes) {
    return ["Sin notas especificas para esta sesion."];
  }

  return notes.split("\n").filter(Boolean);
}

export default async function PlannedSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await ensureAppUser(user);
  const session = await prisma.trainingSession.findFirst({
    where: {
      id: sessionId,
      trainingWeek: {
        trainingPlan: {
          userId: appUser.id,
        },
      },
    },
    include: {
      workout: true,
      trainingWeek: {
        include: {
          trainingPlan: true,
        },
      },
    },
  });

  if (!session) {
    notFound();
  }

  const plan = session.trainingWeek.trainingPlan;
  const sessionName = sessionTypeLabels[session.type] ?? session.type;
  const stats = [
    { label: "Distancia", value: `${session.plannedDistance ?? 0} km`, helper: "Objetivo del plan" },
    { label: "Duracion", value: `${session.plannedDuration ?? "?"} min`, helper: "Tiempo estimado" },
    { label: "Ritmo sugerido", value: formatSessionPace(session.plannedDistance, session.plannedDuration), helper: "Calculado desde distancia y duracion" },
    { label: "Estado", value: session.workout ? "Completada" : session.status, helper: "Relacion con la actividad real" },
  ];
  const canMove = !session.workout && session.scheduledDate >= new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <SiteShell showAuthActions={false}>
      <div className="stack" style={{ gap: 24 }}>
        <PageHeader
          eyebrow="Sesion planificada"
          title={sessionName}
          description={`${formatDate(session.scheduledDate)} · Semana ${session.trainingWeek.weekNumber} de ${plan.name}`}
          actions={
            <>
              <ButtonLink href="/workouts" variant="secondary">
                Volver al calendario
              </ButtonLink>
              {session.workout ? (
                <ButtonLink href={`/workouts/${session.workout.id}`}>Ver actividad realizada</ButtonLink>
              ) : (
                <ButtonLink href="/plan">Ver plan</ButtonLink>
              )}
            </>
          }
        />

        <div className="split">
          <Badge>{dayLabels[session.dayOfWeek] ?? "Plan"}</Badge>
          <Link href="/plan" className="text-link">
            Plan activo: {plan.name}
          </Link>
        </div>

        <StatGrid items={stats} />

        <div className="two-column">
          <Card>
            <SectionTitle
              title="Objetivo de la sesion"
              description="Detalle de lo que debes ejecutar en esta actividad planificada."
            />
            <div className="stack" style={{ gap: 10 }}>
              {renderSessionNotes(session.notes).map((line, index) => (
                <p key={`${session.id}-${index}`} className={index === 0 ? "session-lead" : "session-line"}>
                  {line}
                </p>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle
              title="Programacion"
              description="Puedes mover la sesion si aun no tiene una actividad vinculada."
            />
            {session.workout ? (
              <div className="stack">
                <p className="muted">Esta sesion ya tiene una actividad realizada vinculada.</p>
                <ButtonLink href={`/workouts/${session.workout.id}`}>Abrir workout</ButtonLink>
              </div>
            ) : canMove ? (
              <form action={`/api/plan/sessions/${session.id}`} method="post" className="form-grid">
                <input type="hidden" name="next" value={`/plan/sessions/${session.id}`} />
                <label>
                  Nueva fecha
                  <input
                    className="input"
                    type="date"
                    name="scheduledDate"
                    defaultValue={formatDateInput(session.scheduledDate)}
                    min={formatDateInput(new Date())}
                  />
                </label>
                <Button type="submit">Mover sesion</Button>
              </form>
            ) : (
              <p className="muted">Las sesiones pasadas no se pueden mover desde esta vista.</p>
            )}
          </Card>
        </div>
      </div>
    </SiteShell>
  );
}
