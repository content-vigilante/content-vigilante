'use client';

import { Card, PageHeader, Pill, Stat } from '@/components/dashboard/ui';
import { type Post, seedPosts, useStore } from '@/lib/store';
import { ArrowUpRight, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function OverviewPage() {
  const [posts] = useStore<Post[]>('posts', seedPosts);
  const scheduled = posts.filter((p) => p.status === 'scheduled').length;
  const drafting = posts.filter((p) => p.status === 'drafting').length;
  const published = posts.filter((p) => p.status === 'published').length;
  const avgScore = (() => {
    const scored = posts.filter((p) => typeof p.brandScore === 'number');
    if (!scored.length) return '—';
    return Math.round(scored.reduce((s, p) => s + (p.brandScore ?? 0), 0) / scored.length);
  })();

  return (
    <>
      <PageHeader
        title="Welcome back."
        subtitle="Here's what your marketing stack looks like today."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Brand Score" value={`${avgScore}`} delta="+4" hint="7-day rolling avg" />
        <Stat label="Scheduled" value={scheduled} hint="across all platforms" />
        <Stat label="In drafting" value={drafting} delta="+2" />
        <Stat label="Published 30d" value={published} delta="+1" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent activity</h2>
            <Link
              href="/dashboard/calendar"
              className="flex items-center gap-1 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            >
              Open calendar <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {posts.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-3">
                <Pill tone={p.status === 'published' ? 'good' : 'default'}>{p.platform}</Pill>
                <div className="min-w-0 flex-1 truncate text-sm">{p.title}</div>
                <Pill
                  tone={
                    p.status === 'published'
                      ? 'good'
                      : p.status === 'scheduled'
                        ? 'accent'
                        : 'default'
                  }
                >
                  {p.status}
                </Pill>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Vigilante suggests</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
              <span>
                3 posts use the word <em>“synergy”</em> — flagged by your brand guide.
              </span>
            </li>
            <li className="flex gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-good)]" />
              <span>
                Best post times this week: <strong>Tue 10:00</strong>, <strong>Thu 19:00</strong>.
              </span>
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-good)]" />
              <span>Newsletter #14 is evergreen — schedule a reshare?</span>
            </li>
          </ul>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
            Quick actions
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/dashboard/studio"
              className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-bg-elev)]"
            >
              New post →
            </Link>
            <Link
              href="/dashboard/guardrails"
              className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-bg-elev)]"
            >
              Audit a piece →
            </Link>
            <Link
              href="/dashboard/pipeline"
              className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-bg-elev)]"
            >
              Open pipeline →
            </Link>
            <Link
              href="/dashboard/context"
              className="rounded-md border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3 py-2 text-sm font-medium text-[var(--color-cv-ink)] hover:bg-[var(--color-accent)]/20"
            >
              Ideas from your context →
            </Link>
          </div>
        </Card>
        <Card className="md:col-span-2">
          <div className="text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
            This week
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-fg-muted)]">
            <span className="text-[var(--color-fg)]">Weekly digest:</span> 4 posts shipped, brand
            adherence trending up (+4 vs last week). The Brand Guardrails caught 12 deviations
            before publish — 3 of them critical. Your LinkedIn carousel about local-first AI is your
            top performer; consider repurposing as a newsletter.
          </p>
        </Card>
      </div>
    </>
  );
}
