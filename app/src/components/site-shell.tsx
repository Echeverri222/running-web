import Link from "next/link";
import { ButtonLink } from "@/components/ui";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/workouts", label: "Workouts" },
  { href: "/plan", label: "Plan" },
  { href: "/onboarding", label: "Perfil" },
];

export function SiteShell({
  children,
  showAuthActions = true,
}: {
  children: React.ReactNode;
  showAuthActions?: boolean;
}) {
  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand" aria-label="Running Web home">
            <span className="brand-mark" />
            <span>Running Web</span>
          </Link>

          <nav className="nav" aria-label="Primary">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </nav>

          {showAuthActions ? (
            <div className="nav" aria-label="Actions">
              <ButtonLink href="/workouts" variant="secondary">
                Strava
              </ButtonLink>
              <ButtonLink href="/login" variant="ghost">
                Login
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </header>

      <main className="page">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
