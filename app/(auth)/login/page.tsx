import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { Badge, ButtonLink, Card, PageHeader, SectionTitle } from "@/components/ui";

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
    error?: string;
    reason?: string;
  }>;
}

const errorMap: Record<string, string> = {
  oauth_start_failed: "No se pudo iniciar sesión con Google.",
  oauth_callback_failed: "No se pudo completar la autenticación.",
  missing_code: "Falta el código de autorización del proveedor.",
  missing_supabase_env: "Falta configurar NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next ?? "/dashboard";
  const error = params.error;
  const reason = params.reason;

  return (
    <SiteShell showAuthActions={false}>
      <div className="stack" style={{ gap: 24 }}>
        <PageHeader
          eyebrow="Acceso"
          title="Entra y vuelve al plan en segundos."
          description="Autentica con Google para abrir tu dashboard, sincronizar Strava y seguir el flujo principal sin pasos manuales."
          actions={
            <ButtonLink href={`/auth/login?next=${encodeURIComponent(next)}`} prefetch={false}>
              Continuar con Google
            </ButtonLink>
          }
        />

        <div className="two-column">
          <Card>
            <SectionTitle
              title="Sesion"
              description="Usamos Google para iniciar sesion y conservar el contexto de entrenamiento."
            />
            <div className="stack">
              {error ? (
                <div
                  className="session"
                  style={{
                    borderColor: "rgba(185, 28, 28, 0.18)",
                    background: "rgba(254, 242, 242, 0.9)",
                  }}
                >
                  <span className="session-meta">Error de autenticacion</span>
                  <strong style={{ color: "#991b1b" }}>
                    {errorMap[error] ?? "Error de autenticación"}
                  </strong>
                  {reason ? <span className="muted">{reason}</span> : null}
                </div>
              ) : (
                <div className="session">
                  <span className="session-meta">Estado</span>
                  <strong>Listo para iniciar sesion</strong>
                </div>
              )}

              <div className="grid grid-2">
                <div className="session">
                  <span className="session-meta">Proveedor</span>
                  <strong>Google</strong>
                </div>
                <div className="session">
                  <span className="session-meta">Destino</span>
                  <strong>{next}</strong>
                </div>
              </div>

              <div className="hero-actions">
                <ButtonLink href={`/auth/login?next=${encodeURIComponent(next)}`} prefetch={false}>
                  Continuar con Google
                </ButtonLink>
                <Link href="/" className="text-link">
                  Volver al inicio
                </Link>
              </div>
            </div>
          </Card>

          <Card className="callout">
            <div className="stack">
              <Badge>Flujo actual</Badge>
              <h2 style={{ letterSpacing: "-0.04em", fontSize: "1.7rem" }}>
                Una sola cuenta para dashboard, workouts y plan semanal.
              </h2>
              <p className="muted">
                Si llegaste aqui al abrir otra ruta, normalmente significa que la sesion expiró o se limpió y el middleware te redirigió a login.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </SiteShell>
  );
}
