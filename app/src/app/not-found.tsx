import { SiteShell } from "@/components/site-shell";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";

export default function NotFound() {
  return (
    <SiteShell showAuthActions={false}>
      <div className="stack" style={{ gap: 24 }}>
        <PageHeader
          eyebrow="404"
          title="Esta ruta no existe en la app."
          description="Vuelve al dashboard, revisa workouts o entra al plan sin caer en la pantalla generica de Next."
          actions={
            <>
              <ButtonLink href="/dashboard">Dashboard</ButtonLink>
              <ButtonLink href="/workouts" variant="secondary">
                Workouts
              </ButtonLink>
            </>
          }
        />

        <Card className="callout">
          <div className="stack">
            <Badge>Ruta no encontrada</Badge>
            <p className="muted">
              Si llegaste aqui desde un enlace roto, vuelve a la navegacion principal y repite el flujo.
            </p>
          </div>
        </Card>
      </div>
    </SiteShell>
  );
}
