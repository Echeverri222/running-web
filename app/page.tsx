import { redirect } from "next/navigation";
import { ButtonLink, Card, PageHeader, SectionTitle, StatGrid, Badge } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

const metrics = [
  { label: "Volumen semanal", value: "38 km", helper: "Base realista de entrenamiento" },
  { label: "Ritmo promedio", value: "5:22 /km", helper: "Derivado de tus workouts" },
  { label: "Carga estimada", value: "Moderada", helper: "Ajustada por fatiga reciente" },
  { label: "Strava", value: "Conectado", helper: "Importacion y deduplicacion activas" },
];

const features = [
  "Planes semanales adaptados a tu volumen real",
  "Strava conectado para importar actividades automaticamente",
  "Ritmos por tramo y sesiones detalladas",
  "UI minimalista, rapida de navegar y responsive",
];

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  if (typeof params.code === "string") {
    const callbackParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((item) => callbackParams.append(key, item));
      } else if (value) {
        callbackParams.set(key, value);
      }
    }

    if (!callbackParams.has("next")) {
      callbackParams.set("next", "/dashboard");
    }

    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  return (
    <SiteShell>
      <div className="stack" style={{ gap: 24 }}>
        <PageHeader
          eyebrow="Running Web"
          title="Planes de running que leen tu historial, no plantillas."
          description="Una base minimalista para correr con estructura, conectar Strava, registrar entrenamientos y generar semanas utiles sin pelearte con la interfaz."
          actions={
            <>
              <ButtonLink href="/dashboard">Abrir dashboard</ButtonLink>
              <ButtonLink href="/workouts" variant="secondary">
                Ver workouts
              </ButtonLink>
            </>
          }
        />

        <StatGrid items={metrics} />

        <div className="two-column">
          <Card>
            <SectionTitle
              title="Flujo principal"
              description="Todo accesible desde una sola navegacion, sin endpoints manuales."
            />
            <div className="stack">
              <div className="divider" />
              <div className="list">
                {[
                  ["1", "Login con Google y perfil inicial"],
                  ["2", "Importacion desde Strava y workouts manuales"],
                  ["3", "Generacion del plan semanal adaptado"],
                ].map(([step, label]) => (
                  <div key={step} className="split">
                    <Badge>Paso {step}</Badge>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="callout">
            <div className="stack">
              <Badge>Minimal setup</Badge>
              <h2 style={{ letterSpacing: "-0.04em", fontSize: "1.7rem" }}>
                Un solo lugar para revisar plan, cargar entrenos y sincronizar Strava.
              </h2>
              <p className="muted">
                La app prioriza lectura rapida, acciones obvias y bloques visuales claros.
              </p>
              <div className="hero-actions">
              <ButtonLink href="/login">Empezar</ButtonLink>
                <ButtonLink href="/workouts" variant="secondary">
                  Ir a Workouts
                </ButtonLink>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <SectionTitle
            title="Que encuentras dentro"
            description="La UI esta organizada para que no tengas que recordar rutas ni endpoints."
          />
          <div className="grid grid-2">
            {features.map((feature) => (
              <div key={feature} className="session">
                <strong>{feature}</strong>
                <span className="muted">
                  Navegacion visible, acciones directas y componentes repetibles.
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </SiteShell>
  );
}
