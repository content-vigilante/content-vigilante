'use client';

import { Button, Card, PageHeader, Pill } from '@/components/dashboard/ui';
import { type Comment, type Lead, seedComments, seedLeads, useStore } from '@/lib/store';
import { Check, Filter, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

const PLATFORM_LABEL: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  x: 'X',
  facebook: 'Facebook',
  newsletter: 'Newsletter',
};

export default function InboxPage() {
  const [comments, setComments] = useStore<Comment[]>('comments', seedComments);
  const [, setLeads] = useStore<Lead[]>('leads', seedLeads);
  const [filter, setFilter] = useState<string>('all');
  const [showRead, setShowRead] = useState(false);

  const filtered = useMemo(
    () =>
      comments
        .filter((c) => filter === 'all' || c.platform === filter)
        .filter((c) => showRead || !c.read)
        .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()),
    [comments, filter, showRead],
  );

  const platforms = Array.from(new Set(comments.map((c) => c.platform)));
  const unreadCount = comments.filter((c) => !c.read).length;

  function markRead(id: string) {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, read: true } : c)));
  }

  function toLead(c: Comment) {
    setLeads((prev) => [
      ...prev,
      {
        id: `l${Date.now()}`,
        name: c.author,
        source: `${PLATFORM_LABEL[c.platform]} reply`,
        stage: 'lead',
        notes: c.body,
        createdAt: new Date().toISOString(),
      },
    ]);
    setComments((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, read: true, convertedToLead: true } : x)),
    );
  }

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle="Unified comments and replies across every channel."
        actions={<Pill tone="accent">{unreadCount} unread</Pill>}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--color-fg-muted)]" />
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                : 'border border-[var(--color-border)] text-[var(--color-fg-muted)]'
            }`}
          >
            All
          </button>
          {platforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilter(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                filter === p
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                  : 'border border-[var(--color-border)] text-[var(--color-fg-muted)]'
              }`}
            >
              {PLATFORM_LABEL[p]}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)]">
            <input
              type="checkbox"
              checked={showRead}
              onChange={(e) => setShowRead(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Show read
          </label>
        </div>
      </Card>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <div className="py-6 text-center text-sm text-[var(--color-fg-muted)]">
              Inbox zero. Nice patrol.
            </div>
          </Card>
        )}
        {filtered.map((c) => (
          <Card key={c.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Pill tone="default">{PLATFORM_LABEL[c.platform]}</Pill>
                  <span className="font-medium">{c.author}</span>
                  {!c.read && <Pill tone="accent">new</Pill>}
                  {c.convertedToLead && <Pill tone="good">→ CRM</Pill>}
                  <span className="text-xs text-[var(--color-fg-muted)]">on “{c.postTitle}”</span>
                </div>
                <p className="text-sm text-[var(--color-fg)]">{c.body}</p>
                <div className="mt-1 text-[11px] text-[var(--color-fg-muted)]">
                  {new Date(c.receivedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {!c.convertedToLead && (
                  <Button onClick={() => toLead(c)} variant="outline">
                    <UserPlus className="h-3 w-3" /> To CRM
                  </Button>
                )}
                {!c.read && (
                  <Button onClick={() => markRead(c.id)} variant="ghost">
                    <Check className="h-3 w-3" /> Mark read
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
