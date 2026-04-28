import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: ButtonLinkProps) {
  const variantClass =
    variant === "secondary" ? "button-secondary" : variant === "ghost" ? "button-ghost" : "";

  return (
    <Link href={href} className={`button ${variantClass} ${className}`.trim()}>
      {children}
    </Link>
  );
}

type ButtonProps = {
  children: React.ReactNode;
  variant?: ButtonVariant;
  type?: "button" | "submit" | "reset";
  className?: string;
};

export function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
}: ButtonProps) {
  const variantClass =
    variant === "secondary" ? "button-secondary" : variant === "ghost" ? "button-ghost" : "";

  return (
    <button type={type} className={`button ${variantClass} ${className}`.trim()}>
      {children}
    </button>
  );
}

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return <section className={`card ${className}`.trim()}>{children}</section>;
}

export function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge">{children}</span>;
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="hero">
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <div className="split">
        <div className="stack" style={{ gap: 8 }}>
          <h1 className="hero-title">{title}</h1>
          {description ? <p className="hero-copy">{description}</p> : null}
        </div>
        {actions ? <div className="toolbar">{actions}</div> : null}
      </div>
    </header>
  );
}

type Stat = {
  label: string;
  value: string;
  helper?: string;
};

type StatGridProps = {
  items: Stat[];
};

export function StatGrid({ items }: StatGridProps) {
  return (
    <div className="metric-grid">
      {items.map((item) => (
        <Card key={item.label} className="card-compact metric">
          <span className="metric-label">{item.label}</span>
          <strong className="metric-value">{item.value}</strong>
          {item.helper ? <span className="muted">{item.helper}</span> : null}
        </Card>
      ))}
    </div>
  );
}

type SectionTitleProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function SectionTitle({ title, description, actions }: SectionTitleProps) {
  return (
    <div className="split section-title">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="toolbar">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="callout">
      <div className="stack" style={{ gap: 12 }}>
        <div>
          <h3 style={{ marginBottom: 6 }}>{title}</h3>
          <p className="muted">{description}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}
