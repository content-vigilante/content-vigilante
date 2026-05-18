'use client';

import { Button, Card, PLATFORM_META, PageHeader, Pill } from '@/components/dashboard/ui';
import {
  type Campaign,
  type Lead,
  type Post,
  seedCampaigns,
  seedLeads,
  seedPosts,
  useStore,
} from '@/lib/store';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Rollup {
  campaign: Campaign;
  posts: Post[];
  leads: Lead[];
  pipeline: number;
  closed: number;
  spend: number;
  roi: number | null;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useStore<Campaign[]>('campaigns', seedCampaigns);
  const [posts] = useStore<Post[]>('posts', seedPosts);
  const [leads] = useStore<Lead[]>('leads', seedLeads);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);

  const rollups: Rollup[] = useMemo(() => {
    return campaigns.map((c) => {
      const ps = posts.filter((p) => p.campaignId === c.id);
      const ls = leads.filter((l) => l.campaignId === c.id);
      const pipeline = ls
        .filter((l) => l.stage !== 'closed')
        .reduce((s, l) => s + (l.value ?? 0), 0);
      const closed = ls.filter((l) => l.stage === 'closed').reduce((s, l) => s + (l.value ?? 0), 0);
      const spend = c.spend ?? 0;
      const roi = spend > 0 ? closed / spend : null;
      return { campaign: c, posts: ps, leads: ls, pipeline, closed, spend, roi };
    });
  }, [campaigns, posts, leads]);

  function addCampaign() {
    const name = prompt('Campaign name?')?.trim();
    if (!name) return;
    const goal = prompt('Goal (optional)')?.trim() ?? undefined;
    const spendStr = prompt('Ad spend in EUR (0 if none)') ?? '0';
    setCampaigns((prev) => [
      ...prev,
      {
        id: `cmp-${Date.now()}`,
        name,
        goal,
        spend: Number(spendStr) || 0,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function remove(id: string) {
    if (!confirm('Delete this campaign? Posts and leads stay; they just lose the tag.')) return;
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  function updateSpend(id: string, spend: number) {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, spend } : c)));
  }

  async function explain(rollup: Rollup) {
    setBusy(true);
    setInsight(null);
    setSelected(rollup.campaign.id);
    try {
      const provider = sessionStorage.getItem('cv:provider') ?? 'anthropic';
      const apiKey = sessionStorage.getItem('cv:apiKey') ?? '';
      const model = sessionStorage.getItem('cv:model') ?? '';
      if (!apiKey) throw new Error('Set a provider key on Guardrails first.');
      const summary = {
        campaign: rollup.campaign,
        posts: rollup.posts.map(({ title, platform, status, brandScore }) => ({
          title,
          platform,
          status,
          brandScore,
        })),
        leads: rollup.leads.map(({ name, stage, value, source }) => ({
          name,
          stage,
          value,
          source,
        })),
        spend: rollup.spend,
        pipeline: rollup.pipeline,
        closed: rollup.closed,
        roi: rollup.roi,
      };
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey,
          model,
          goal: `Diagnose this campaign in 5 bullets: what's working, what's not, what to try next. Campaign data:\n${JSON.stringify(summary, null, 2)}`,
          platform: rollup.posts[0]?.platform ?? 'linkedin',
          context: [],
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'failed');
      const ideas = (j.ideas ?? []) as Array<{ title: string; angle: string }>;
      setInsight(
        ideas.map((i, idx) => `${idx + 1}. **${i.title}** — ${i.angle}`).join('\n') ||
          'No insight returned.',
      );
    } catch (err) {
      setInsight(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="Group posts + leads + ad spend under one tag. See ROI roll up automatically."
        actions={
          <Button onClick={addCampaign}>
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        }
      />

      {rollups.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-[var(--color-fg-muted)]">
            No campaigns yet. Add one to start tagging posts and leads.
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {rollups.map((r) => (
            <Card key={r.campaign.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold tracking-tight">
                      {r.campaign.name}
                    </h3>
                    <Pill tone="default">{r.posts.length} posts</Pill>
                    <Pill tone="default">{r.leads.length} leads</Pill>
                    {r.roi !== null && (
                      <Pill tone={r.roi >= 2 ? 'good' : r.roi >= 1 ? 'warn' : 'bad'}>
                        ROI {r.roi.toFixed(1)}×
                      </Pill>
                    )}
                  </div>
                  {r.campaign.goal && (
                    <p className="text-xs italic text-[var(--color-fg-muted)]">{r.campaign.goal}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button onClick={() => explain(r)} variant="outline">
                    {busy && selected === r.campaign.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Diagnose
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(r.campaign.id)}
                    aria-label="Delete"
                    className="rounded-md p-1.5 text-[var(--color-fg-muted)] hover:text-[var(--color-bad)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="Ad spend" value={`€${r.spend.toLocaleString()}`}>
                  <input
                    type="number"
                    defaultValue={r.spend}
                    onBlur={(e) => updateSpend(r.campaign.id, Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1 text-xs"
                  />
                </Metric>
                <Metric label="Pipeline" value={`€${r.pipeline.toLocaleString()}`} />
                <Metric label="Closed" value={`€${r.closed.toLocaleString()}`} />
                <Metric
                  label="Net"
                  value={`€${(r.closed - r.spend).toLocaleString()}`}
                  tone={r.closed - r.spend >= 0 ? 'good' : 'bad'}
                />
              </div>

              {r.posts.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
                    Posts in this campaign
                  </div>
                  <ul className="divide-y divide-[var(--color-border)]">
                    {r.posts.slice(0, 6).map((p) => (
                      <li key={p.id} className="flex items-center gap-2 py-1.5 text-xs">
                        <Pill tone={PLATFORM_META[p.platform]?.tone}>
                          {PLATFORM_META[p.platform]?.label}
                        </Pill>
                        <span className="min-w-0 flex-1 truncate">{p.title}</span>
                        <Pill tone={p.status === 'published' ? 'good' : 'default'}>{p.status}</Pill>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selected === r.campaign.id && insight && (
                <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3 text-xs">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
                    AI diagnosis
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                    {insight}
                  </pre>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <h3 className="mb-2 font-semibold">How to use this</h3>
        <ol className="space-y-1.5 text-xs text-[var(--color-fg-muted)]">
          <li>1. Create a campaign for each push (launch, holiday, ABM round, etc.).</li>
          <li>2. On the Pipeline, drag posts into the campaign or tag them at create time.</li>
          <li>
            3. Drop the ad spend in the field above. Pipeline and closed-revenue roll up
            automatically from your tagged leads.
          </li>
          <li>
            4. Click <em>Diagnose</em> to get an LLM-driven 5-bullet read on what's working and what
            to try next.
          </li>
        </ol>
      </Card>
    </>
  );
}

function Metric({
  label,
  value,
  tone = 'default',
  children,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'bad';
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-semibold ${
          tone === 'good'
            ? 'text-[var(--color-good)]'
            : tone === 'bad'
              ? 'text-[var(--color-bad)]'
              : ''
        }`}
      >
        {value}
      </div>
      {children}
    </div>
  );
}
