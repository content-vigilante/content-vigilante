import { ArrowRight, Github } from 'lucide-react';
import Link from 'next/link';
import { Owl } from '@/components/Owl';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1280px] px-10 py-16">
      <header className="flex items-end justify-between border-b border-[var(--color-cv-line)] pb-8">
        <div className="flex items-center gap-2.5 font-mono text-[11.5px] uppercase tracking-[0.22em] text-[var(--color-cv-stone-500)]">
          <Owl className="h-[22px] w-[22px]" />
          Content Vigilante · Brand Kit · v1.0
        </div>
        <div className="font-mono text-[11.5px] uppercase tracking-[0.22em] text-[var(--color-cv-stone-500)]">
          May 2026 · EN · IT · FR · DE
        </div>
      </header>

      <h1 className="mt-14 mb-6 max-w-[1200px] font-display text-[clamp(64px,12vw,156px)] font-bold leading-[0.92] tracking-[-0.028em]">
        Stop shipping
        <br />
        <span className="text-[var(--color-cv-green-deep)]">off-brand</span>
        <br />
        content.
      </h1>
      <p className="mb-16 max-w-[680px] text-[22px] leading-[1.5] text-[var(--color-cv-stone-600)]">
        The local-first, open-source marketing operating system. Cross-channel content,
        AI brand guardrails, unified analytics, and a hybrid CRM — your data stays yours.
      </p>

      <div className="grid grid-cols-12 gap-4">
        <Link
          href="/dashboard"
          className="col-span-12 grid grid-cols-[1.2fr_1fr] items-center gap-8 overflow-hidden rounded-[20px] border border-[var(--color-cv-ink)] bg-[var(--color-cv-ink)] p-12 text-white no-underline transition hover:-translate-y-[2px] md:col-span-12"
        >
          <div>
            <span className="font-mono text-[11.5px] uppercase tracking-[0.22em] text-white/50">
              VOLUME 01 · PRODUCT
            </span>
            <h2 className="mt-3 mb-4 font-display text-[clamp(48px,6vw,80px)] font-bold leading-[0.95] tracking-[-0.024em]">
              The marketing
              <br />
              <span className="text-[var(--color-cv-green)]">operating system.</span>
            </h2>
            <p className="max-w-[460px] text-[18px] leading-[1.55] text-white/70">
              Calendar, Studio with brand guardrails, unified analytics, and a content + sales
              pipeline. All local, all yours.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 font-mono text-[16px] font-semibold text-[var(--color-cv-green)]">
              Open the dashboard <ArrowRight className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <Owl className="h-[280px] w-[280px]" />
          </div>
        </Link>

        <Tile num="02 · AUDIT" title="Run an audit." href="/audit" span={6}>
          Drop in content and a brand guide. Get a scored report with line-level deviations, a
          tone match, and suggested rewrites.
        </Tile>

        <Tile num="03 · CALENDAR" title="Calendar." href="/dashboard/calendar" span={3}>
          Drag-and-drop across LinkedIn, IG, X, FB, newsletters.
        </Tile>

        <Tile num="04 · STUDIO" title="Studio." href="/dashboard/studio" span={3}>
          Compose with inline brand guardrails and AI variants.
        </Tile>

        <Tile
          num="05 · ANALYTICS"
          title="Analytics."
          href="/dashboard/analytics"
          span={8}
          tone="green"
        >
          GA4 + LinkedIn + Meta + X in one view. Correlation engine, heatmap, ROI.
        </Tile>

        <Tile
          num="06 · PIPELINE"
          title="Pipeline."
          href="/dashboard/pipeline"
          span={4}
          tone="dark"
        >
          Content kanban + sales pipeline. One hybrid CRM.
        </Tile>

        <Tile num="07 · GUARDRAILS" title="Brand Guardrails." href="/dashboard/guardrails" span={12}>
          Three judges run in parallel: tone (LLM), vocabulary (deterministic + LLM hybrid),
          structure & readability (deterministic). Multilingual EN · IT · FR · DE.
        </Tile>
      </div>

      <footer className="mt-16 flex items-center justify-between border-t border-[var(--color-cv-line)] pt-16 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-cv-stone-500)]">
        <div className="flex items-center gap-2.5 font-display text-base font-bold tracking-[-0.018em] normal-case text-[var(--color-cv-ink)]">
          <Owl className="h-[22px] w-[22px]" />
          Content <span className="font-medium">Vigilante</span>
        </div>
        <a
          href="https://github.com/content-vigilante/Content-Vigilante"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-[var(--color-cv-ink)]"
        >
          <Github className="h-3 w-3" /> Open source · MIT
        </a>
      </footer>
    </main>
  );
}

function Tile({
  num,
  title,
  href,
  span,
  tone = 'default',
  children,
}: {
  num: string;
  title: string;
  href: string;
  span: number;
  tone?: 'default' | 'dark' | 'green';
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    default:
      'bg-white border-[var(--color-cv-line)] text-[var(--color-cv-ink)]',
    dark: 'bg-[var(--color-cv-ink)] border-[var(--color-cv-ink)] text-white',
    green: 'bg-[var(--color-cv-green)] border-[var(--color-cv-green)] text-[var(--color-cv-ink)]',
  };
  const spanClass: Record<number, string> = {
    3: 'col-span-12 md:col-span-3',
    4: 'col-span-12 md:col-span-4',
    6: 'col-span-12 md:col-span-6',
    8: 'col-span-12 md:col-span-8',
    12: 'col-span-12',
  };
  const numTone =
    tone === 'dark'
      ? 'text-white/50'
      : tone === 'green'
        ? 'text-[var(--color-cv-ink)]/60'
        : 'text-[var(--color-cv-stone-500)]';
  const pTone =
    tone === 'dark'
      ? 'text-white/70'
      : tone === 'green'
        ? 'text-[var(--color-cv-ink)]/75'
        : 'text-[var(--color-cv-stone-600)]';

  return (
    <Link
      href={href}
      className={`${spanClass[span]} flex min-h-[280px] flex-col justify-between rounded-[16px] border p-8 no-underline transition hover:-translate-y-[2px] ${tones[tone]}`}
    >
      <div>
        <span className={`font-mono text-[11px] uppercase tracking-[0.2em] ${numTone}`}>{num}</span>
        <h3 className="mt-4 mb-2.5 font-display text-[36px] font-bold leading-none tracking-[-0.022em]">
          {title}
        </h3>
        <p className={`text-[15px] leading-[1.55] ${pTone}`}>{children}</p>
      </div>
      <div
        className={`mt-6 self-end font-mono text-sm font-semibold ${tone === 'dark' ? 'text-[var(--color-cv-green)]' : ''}`}
      >
        Open →
      </div>
    </Link>
  );
}
