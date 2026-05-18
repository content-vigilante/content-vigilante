import { Owl } from '@/components/Owl';
import { ArrowRight, Github } from 'lucide-react';
import Link from 'next/link';

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
      <p className="mb-8 max-w-[680px] text-[22px] leading-[1.5] text-[var(--color-cv-stone-600)]">
        The local-first, open-source marketing operating system. Cross-channel content, AI brand
        guardrails, unified analytics, and a hybrid CRM — your data stays yours.
      </p>

      <div className="mb-16 flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-cv-ink)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Open the dashboard →
        </Link>
        <a
          href="https://content-vigilante-demo.vercel.app/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-cv-line)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-cv-ink)] transition hover:bg-[var(--color-cv-paper-2)]"
        >
          Try the demo (seeded) ↗
        </a>
        <a
          href="https://github.com/content-vigilante/Content-Vigilante"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-cv-line)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-cv-ink)] transition hover:bg-[var(--color-cv-paper-2)]"
        >
          Star on GitHub ↗
        </a>
      </div>

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
          Drop in content and a brand guide. Get a scored report with line-level deviations, a tone
          match, and suggested rewrites.
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

        <Tile num="06 · PIPELINE" title="Pipeline." href="/dashboard/pipeline" span={4} tone="dark">
          Content kanban + sales pipeline. One hybrid CRM.
        </Tile>

        <Tile
          num="07 · GUARDRAILS"
          title="Brand Guardrails."
          href="/dashboard/guardrails"
          span={12}
        >
          Three judges run in parallel: tone (LLM), vocabulary (deterministic + LLM hybrid),
          structure & readability (deterministic). Multilingual EN · IT · FR · DE.
        </Tile>
      </div>

      {/* How it works */}
      <section className="mt-24">
        <div className="mb-6 font-mono text-[11.5px] uppercase tracking-[0.22em] text-[var(--color-cv-stone-500)]">
          How it works
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              num: '01',
              title: 'Drop in context.',
              body: 'Upload PDFs, transcripts, briefs, research. Or just paste a goal. Everything stays in your browser.',
            },
            {
              num: '02',
              title: 'Generate on-brand.',
              body: 'Studio writes drafts that pass your brand guardrails. Bias, readability, SEO, headline scoring — all live.',
            },
            {
              num: '03',
              title: 'Schedule. Publish. Report.',
              body: 'LinkedIn, X, Facebook, Instagram in one queue. Vercel cron publishes. Live GA4 + dark social in analytics.',
            },
          ].map((s) => (
            <div
              key={s.num}
              className="rounded-[16px] border border-[var(--color-cv-line)] bg-white p-6"
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-cv-stone-500)]">
                Step {s.num}
              </div>
              <h3 className="mt-3 font-display text-2xl font-bold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.55] text-[var(--color-cv-stone-600)]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Compare */}
      <section className="mt-24">
        <div className="mb-6 font-mono text-[11.5px] uppercase tracking-[0.22em] text-[var(--color-cv-stone-500)]">
          Compared
        </div>
        <h2 className="mb-8 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight">
          We&apos;re not Buffer. We&apos;re not Grammarly. We&apos;re the layer between them.
        </h2>
        <div className="overflow-x-auto rounded-[16px] border border-[var(--color-cv-line)] bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.16em] text-[var(--color-cv-stone-500)]">
              <tr>
                <th className="px-5 py-4">Capability</th>
                <th className="px-5 py-4">Vigilante</th>
                <th className="px-5 py-4">Buffer-class</th>
                <th className="px-5 py-4">Grammarly-class</th>
                <th className="px-5 py-4">HubSpot-class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-cv-line)]">
              {[
                ['Brand voice audit with rewrite', '✓', '—', 'partial', 'partial'],
                ['Multi-platform scheduler', '✓', '✓', '—', 'partial'],
                ['Hybrid CRM (content + sales)', '✓', '—', '—', '✓'],
                ['Local-first / BYO LLM', '✓', '—', '—', '—'],
                ['Open source · MIT', '✓', '—', '—', '—'],
                ['Price per seat / month', 'Free', '$15', '$30', '$1,200+'],
              ].map((r, i) => (
                <tr key={i}>
                  <td className="px-5 py-3 font-medium">{r[0]}</td>
                  {r.slice(1).map((c, ci) => (
                    <td
                      key={ci}
                      className={`px-5 py-3 ${
                        c === '✓'
                          ? 'text-[var(--color-cv-green-deep)]'
                          : c === '—'
                            ? 'text-[var(--color-cv-stone-500)]'
                            : ''
                      }`}
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-24">
        <div className="mb-6 font-mono text-[11.5px] uppercase tracking-[0.22em] text-[var(--color-cv-stone-500)]">
          FAQ
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            {
              q: 'Is my data really staying local?',
              a: 'Yes. Posts, leads, workspaces, brand guides — all in localStorage by default. Sync is opt-in and uses a token only you know. The audit engine sends content to your chosen LLM with your key; nothing routes through us.',
            },
            {
              q: 'Do I need any credentials to try it?',
              a: 'No. The dashboard, calendar, guardrails, studio, and PDF brand-guide ingestion all work without any keys. Add a provider key (Anthropic / OpenAI / Ollama) for AI features. Add OAuth credentials when you want to publish or pull live GA4.',
            },
            {
              q: 'Can it actually publish?',
              a: 'Yes. LinkedIn, X, Facebook, Instagram (business) wired against the official APIs. Vercel cron runs every 15 minutes against your queued posts.',
            },
            {
              q: 'What about Instagram Reels / image posts?',
              a: 'IG requires a publicly reachable image or video URL. Drop the asset URL on the queued post and the publish route does the rest. Reels use the same media-container flow.',
            },
            {
              q: 'Is the brand audit actually accurate?',
              a: 'Three judges in parallel — tone (LLM), vocabulary (rules + LLM), structure & readability (deterministic). Regression-tested against 20+ hand-labeled cases on every commit.',
            },
            {
              q: 'Can I self-host?',
              a: 'Yes. Open source under MIT — monorepo with Bun + Next.js 15. KV + cron only matter when you want cross-device sync and unattended publishing.',
            },
          ].map((f) => (
            <div
              key={f.q}
              className="rounded-[16px] border border-[var(--color-cv-line)] bg-white p-5"
            >
              <div className="font-display text-base font-bold tracking-tight">{f.q}</div>
              <p className="mt-2 text-[14px] leading-[1.55] text-[var(--color-cv-stone-600)]">
                {f.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-24 flex items-center justify-between border-t border-[var(--color-cv-line)] pt-16 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-cv-stone-500)]">
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
    default: 'bg-white border-[var(--color-cv-line)] text-[var(--color-cv-ink)]',
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
