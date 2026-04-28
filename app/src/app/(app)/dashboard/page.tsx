import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { prisma } from "@/lib/db/client";
import { formatPaceFromSeconds } from "@/lib/format/pace";
import { Badge, ButtonLink, Card, PageHeader, SectionTitle, StatGrid } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

export default async function DashboardPage() {
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

  if (!appUser.profile) {
    redirect("/onboarding");
  }

  const metrics = [
    {
      label: "Nivel",
      value: appUser.profile.level,
      helper: `${appUser.profile.availableDays} dias por semana`,
    },
    {
      label: "Ritmo comodo",
      value: formatPaceFromSeconds(appUser.profile.easyPaceSecPerKm) ?? "Pendiente",
      helper: "Formato min/km",
    },
    {
      label: "Strava",
      value: stravaConnection ? "Conectado" : "Pendiente",
      helper: stravaConnection ? "Sincronizacion activa" : "Conectar para importar actividades",
    },
    {
      label: "FC maxima",
      value: appUser.profile.maxHeartRate ? `${appUser.profile.maxHeartRate}` : "Pendiente",
      helper: "Perfil base",
    },
  ];

  return (
    <SiteShell>
      <div className="stack" style={{ gap: 24 }}>
        <PageHeader
          eyebrow="Dashboard"
          title="Tu entrenamiento, ordenado."
          description={`Sesion activa: ${user.email}. Revisa el estado general, entra a workouts o genera la siguiente semana sin pensar en rutas.`}
          actions={
            <>
              <ButtonLink href="/plan">Generar plan</ButtonLink>
              <ButtonLink href="/workouts" variant="secondary">
                Ver entrenos
              </ButtonLink>
            </>
          }
        />

        <StatGrid items={metrics} />

        <div className="two-column">
          <Card>
            <SectionTitle
              title="Perfil base"
              description="Configuracion actual del corredor y estado de integracion."
            />
            <div className="stack">
              <div className="grid grid-2">
                <div className="session">
                  <span className="session-meta">Nombre</span>
                  <strong>{appUser.name ?? "Pendiente"}</strong>
                </div>
                <div className="session">
                  <span className="session-meta">Peso</span>
                  <strong>{appUser.profile.weightKg ?? "Pendiente"} kg</strong>
                </div>
                <div className="session">
                  <span className="session-meta">Altura</span>
                  <strong>{appUser.profile.heightCm ?? "Pendiente"} cm</strong>
                </div>
                <div className="session">
                  <span className="session-meta">Strava</span>
                  <Badge>{stravaConnection ? "Activa" : "No conectada"}</Badge>
                </div>
              </div>

              <div className="hero-actions">
                <ButtonLink href="/onboarding" variant="secondary">
                  Editar perfil
                </ButtonLink>
                <Link href="/auth/logout" className="text-link">
                  Cerrar sesion
                </Link>
              </div>
            </div>
          </Card>

          <Card className="callout">
            <div className="stack">
              <Badge>Accion rapida</Badge>
              <h2 style={{ letterSpacing: "-0.04em", fontSize: "1.7rem" }}>
                Usa el historial real para construir la siguiente semana.
              </h2>
              <p className="muted">
                El flujo principal ya esta armado: perfil, workouts, Strava y plan. Desde aqui puedes saltar al siguiente paso sin escribir endpoints.
              </p>
              <div className="hero-actions">
                <ButtonLink href="/workouts">Registrar entreno</ButtonLink>
                <ButtonLink href="/api/strava/connect?next=/workouts" variant="secondary">
                  Conectar Strava
                </ButtonLink>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </SiteShell>
  );
}
