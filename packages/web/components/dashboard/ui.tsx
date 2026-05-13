import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] ${padded ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
}) {
  const positive = delta?.startsWith('+');
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-semibold">{value}</div>
        {delta && (
          <div
            className={`text-xs font-medium ${
              positive ? 'text-[var(--color-good)]' : 'text-[var(--color-bad)]'
            }`}
          >
            {delta}
          </div>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-[var(--color-fg-muted)]">{hint}</div>}
    </Card>
  );
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    default: 'bg-[var(--color-bg-elev)] text-[var(--color-fg-muted)]',
    good: 'bg-[var(--color-good)]/10 text-[var(--color-good)]',
    warn: 'bg-[var(--color-warn)]/10 text-[var(--color-warn)]',
    bad: 'bg-[var(--color-bad)]/10 text-[var(--color-bad)]',
    accent: 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone] ?? tones.default}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline' }) {
  const variants = {
    primary: 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:opacity-90',
    ghost:
      'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-fg)]',
    outline:
      'border border-[var(--color-border)] text-[var(--color-fg)] hover:bg-[var(--color-bg-elev)]',
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export const PLATFORM_META: Record<string, { label: string; tone: string; limit: number }> = {
  linkedin: { label: 'LinkedIn', tone: 'accent', limit: 3000 },
  instagram: { label: 'Instagram', tone: 'warn', limit: 2200 },
  x: { label: 'X', tone: 'default', limit: 280 },
  facebook: { label: 'Facebook', tone: 'good', limit: 5000 },
  newsletter: { label: 'Newsletter', tone: 'accent', limit: 100000 },
};
