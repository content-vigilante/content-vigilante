import { ArrowRight, Github, Globe, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-16">
      <header className="mb-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Shield className="h-5 w-5 text-[var(--color-accent)]" />
          Content Vigilante
        </div>
        <a
          className="flex items-center gap-2 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          href="https://github.com/content-vigilante/Content-Vigilante"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github className="h-4 w-4" />
          GitHub
        </a>
      </header>

      <section className="mb-12">
        <h1 className="mb-6 text-5xl font-bold leading-[1.05] tracking-tight">
          Stop shipping
          <br />
          <span className="text-[var(--color-accent)]">off-brand</span> content.
        </h1>
        <p className="max-w-xl text-lg text-[var(--color-fg-muted)]">
          Drop in your brand guidelines and any piece of content. Get a scored report with
          line-level deviations, suggested rewrites, and a proper voice match — in seconds.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/audit"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-5 py-2.5 font-medium text-[var(--color-accent-fg)] transition hover:opacity-90"
          >
            Try the audit
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com/content-vigilante/Content-Vigilante#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-5 py-2.5 font-medium text-[var(--color-fg)] transition hover:bg-[var(--color-bg-elev)]"
          >
            Read the docs
          </a>
        </div>
      </section>

      <section className="mb-16 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card icon={<Zap className="h-5 w-5 text-[var(--color-accent)]" />} title="Hybrid AI">
          Three judges run in parallel: tone (LLM), vocabulary (deterministic + LLM hybrid),
          structure & readability (purely deterministic).
        </Card>
        <Card icon={<Globe className="h-5 w-5 text-[var(--color-accent)]" />} title="Multilingual">
          English and Italian in v0.1. French and German queued. Embeddings via bge-m3 (free) or
          OpenAI when you bring a key.
        </Card>
        <Card icon={<Shield className="h-5 w-5 text-[var(--color-accent)]" />} title="Local-first">
          Your content never leaves your machine without your key. No accounts, no telemetry, no
          tracking.
        </Card>
      </section>

      <footer className="mt-auto border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-fg-muted)]">
        Open source under MIT. Built by{' '}
        <a
          href="https://github.com/Sai-Kanagat"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[var(--color-fg)]"
        >
          Sai Prathyaksh Kanagat
        </a>{' '}
        in Bologna.
      </footer>
    </main>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-[var(--color-fg-muted)]">{children}</p>
    </div>
  );
}
