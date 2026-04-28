import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/auth/sync-user";
import { saveRunnerProfile } from "./actions";
import { formatPaceFromSeconds } from "@/lib/format/pace";
import { Badge, Button, Card, PageHeader, SectionTitle } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

interface OnboardingPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

const errorMap: Record<string, string> = {
  invalid_profile: "Revisa los datos del perfil. Hay uno o mas campos invalidos.",
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await ensureAppUser(user);
  const profile = appUser.profile;

  return (
    <SiteShell showAuthActions={false}>
      <div className="stack" style={{ gap: 24 }}>
        <PageHeader
          eyebrow="Perfil del corredor"
          title={profile ? "Ajusta tu perfil" : "Configura tu punto de partida"}
          description="Define tu nivel, dias disponibles y ritmo comodo para que el plan sea consistente con tu realidad."
          actions={
            <Badge>
              Ritmo actual: {formatPaceFromSeconds(profile?.easyPaceSecPerKm) ?? "Pendiente"}
            </Badge>
          }
        />

        {params.error ? (
          <Card className="callout">
            <strong>{errorMap[params.error] ?? "No fue posible guardar el perfil."}</strong>
          </Card>
        ) : null}

        <div className="two-column">
          <Card>
            <SectionTitle
              title="Perfil base"
              description="Los cambios aqui ajustan la frecuencia y el contenido de tu plan."
            />
            <div className="grid grid-2">
              <div className="session">
                <span className="session-meta">Nombre</span>
                <strong>{appUser.name ?? "Pendiente"}</strong>
              </div>
              <div className="session">
                <span className="session-meta">Nivel</span>
                <strong className="capitalize">{profile?.level ?? "Pendiente"}</strong>
              </div>
              <div className="session">
                <span className="session-meta">Dias por semana</span>
                <strong>{profile?.availableDays ?? "Pendiente"}</strong>
              </div>
              <div className="session">
                <span className="session-meta">FC maxima</span>
                <strong>{profile?.maxHeartRate ?? "Pendiente"}</strong>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle
              title={profile ? "Actualizar perfil" : "Completar perfil"}
              description="Usa formato min/km, por ejemplo 5:30."
            />

            <form action={saveRunnerProfile} className="form-grid">
              <label>
                Edad
                <input
                  className="input"
                  name="age"
                  type="number"
                  min="12"
                  max="100"
                  placeholder="30"
                  defaultValue={profile?.age ?? ""}
                />
              </label>

              <label>
                Peso (kg)
                <input
                  className="input"
                  name="weightKg"
                  type="number"
                  min="30"
                  max="250"
                  step="0.1"
                  placeholder="68.5"
                  defaultValue={profile?.weightKg ?? ""}
                />
              </label>

              <label>
                Altura (cm)
                <input
                  className="input"
                  name="heightCm"
                  type="number"
                  min="120"
                  max="240"
                  step="0.1"
                  placeholder="175"
                  defaultValue={profile?.heightCm ?? ""}
                />
              </label>

              <label>
                Nivel
                <select className="input select" name="level" defaultValue={profile?.level ?? "intermediate"}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>

              <label>
                Dias disponibles por semana
                <input
                  className="input"
                  name="availableDays"
                  type="number"
                  min="2"
                  max="7"
                  defaultValue={profile?.availableDays ?? 4}
                />
              </label>

              <label>
                Ritmo comodo (min/km)
                <input
                  className="input"
                  name="easyPaceMinPerKm"
                  type="text"
                  placeholder="5:30"
                  defaultValue={formatPaceFromSeconds(profile?.easyPaceSecPerKm)?.replace(" min/km", "") ?? ""}
                />
              </label>

              <label>
                Frecuencia cardiaca maxima
                <input
                  className="input"
                  name="maxHeartRate"
                  type="number"
                  min="120"
                  max="240"
                  placeholder="190"
                  defaultValue={profile?.maxHeartRate ?? ""}
                />
              </label>

              <Button type="submit">{profile ? "Actualizar perfil" : "Guardar perfil"}</Button>
            </form>
          </Card>
        </div>
      </div>
    </SiteShell>
  );
}
