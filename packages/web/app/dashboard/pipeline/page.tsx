'use client';

import { Button, Card, PLATFORM_META, PageHeader, Pill } from '@/components/dashboard/ui';
import { type Lead, type Post, seedLeads, seedPosts, useStore } from '@/lib/store';
import { Plus } from 'lucide-react';
import { useState } from 'react';

const POST_STAGES: Post['status'][] = ['idea', 'drafting', 'scheduled', 'published'];
const LEAD_STAGES: Lead['stage'][] = ['lead', 'discovery', 'proposal', 'closed'];

const STAGE_LABEL: Record<string, string> = {
  idea: 'Ideas',
  drafting: 'Drafting',
  scheduled: 'Scheduled',
  published: 'Published',
  lead: 'New leads',
  discovery: 'Discovery',
  proposal: 'Proposal',
  closed: 'Closed won',
};

export default function PipelinePage() {
  const [tab, setTab] = useState<'content' | 'sales'>('content');
  const [posts, setPosts] = useStore<Post[]>('posts', seedPosts);
  const [leads, setLeads] = useStore<Lead[]>('leads', seedLeads);
  const [drag, setDrag] = useState<{ id: string; kind: 'post' | 'lead' } | null>(null);

  function movePost(id: string, status: Post['status']) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }
  function moveLead(id: string, stage: Lead['stage']) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
  }

  function addLead() {
    const name = prompt('Lead name?');
    if (!name) return;
    setLeads((prev) => [
      ...prev,
      {
        id: `l${Date.now()}`,
        name,
        source: 'Manual entry',
        stage: 'lead',
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  return (
    <>
      <PageHeader
        title="Pipeline"
        subtitle="Hybrid CRM. Content kanban + sales pipeline in one place."
        actions={
          <>
            <div className="flex rounded-md border border-[var(--color-border)] p-0.5">
              {(['content', 'sales'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded px-3 py-1 text-xs font-medium transition ${
                    tab === t
                      ? 'bg-[var(--color-bg-card)] text-[var(--color-fg)]'
                      : 'text-[var(--color-fg-muted)]'
                  }`}
                >
                  {t === 'content' ? 'Content' : 'Sales'}
                </button>
              ))}
            </div>
            {tab === 'sales' && (
              <Button onClick={addLead}>
                <Plus className="h-4 w-4" /> Add lead
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {tab === 'content'
          ? POST_STAGES.map((stage) => (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag?.kind === 'post') movePost(drag.id, stage);
                  setDrag(null);
                }}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{STAGE_LABEL[stage]}</h3>
                  <span className="text-xs text-[var(--color-fg-muted)]">
                    {posts.filter((p) => p.status === stage).length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {posts
                    .filter((p) => p.status === stage)
                    .map((p) => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => setDrag({ id: p.id, kind: 'post' })}
                        className="cursor-grab rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2.5 text-xs"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <Pill tone={PLATFORM_META[p.platform]?.tone}>
                            {PLATFORM_META[p.platform]?.label}
                          </Pill>
                          {p.brandScore != null && (
                            <span className="text-[10px] text-[var(--color-fg-muted)]">
                              {p.brandScore}/100
                            </span>
                          )}
                        </div>
                        <div className="font-medium leading-snug">{p.title}</div>
                        {p.body && (
                          <div className="mt-1 line-clamp-2 text-[var(--color-fg-muted)]">
                            {p.body}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))
          : LEAD_STAGES.map((stage) => (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag?.kind === 'lead') moveLead(drag.id, stage);
                  setDrag(null);
                }}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{STAGE_LABEL[stage]}</h3>
                  <span className="text-xs text-[var(--color-fg-muted)]">
                    {leads.filter((l) => l.stage === stage).length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {leads
                    .filter((l) => l.stage === stage)
                    .map((l) => (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={() => setDrag({ id: l.id, kind: 'lead' })}
                        className="cursor-grab rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2.5 text-xs"
                      >
                        <div className="font-medium">{l.name}</div>
                        <div className="mt-1 flex items-center justify-between text-[var(--color-fg-muted)]">
                          <span>{l.source}</span>
                          {l.value != null && (
                            <span className="font-semibold text-[var(--color-fg)]">
                              €{l.value.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
      </div>

      {tab === 'sales' && (
        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold">Pipeline value</h3>
            <div className="flex gap-4 text-sm">
              <span>
                <span className="text-[var(--color-fg-muted)]">Open: </span>
                <span className="font-semibold">
                  €
                  {leads
                    .filter((l) => l.stage !== 'closed')
                    .reduce((s, l) => s + (l.value ?? 0), 0)
                    .toLocaleString()}
                </span>
              </span>
              <span>
                <span className="text-[var(--color-fg-muted)]">Closed: </span>
                <span className="font-semibold text-[var(--color-good)]">
                  €
                  {leads
                    .filter((l) => l.stage === 'closed')
                    .reduce((s, l) => s + (l.value ?? 0), 0)
                    .toLocaleString()}
                </span>
              </span>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
