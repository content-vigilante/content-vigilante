'use client';

import { Button, Card, PLATFORM_META, PageHeader, Pill } from '@/components/dashboard/ui';
import { type Platform, type Post, seedPosts, useStore } from '@/lib/store';
import { Loader2, Plus, Send } from 'lucide-react';
import { useMemo, useState } from 'react';

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function CalendarPage() {
  const [posts, setPosts] = useStore<Post[]>('posts', seedPosts);
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [dragId, setDragId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishLog, setPublishLog] = useState<string[]>([]);

  const due = posts.filter(
    (p) =>
      p.status === 'scheduled' &&
      p.scheduledFor &&
      new Date(p.scheduledFor) <= new Date() &&
      (p.platform === 'linkedin' || p.platform === 'x'),
  );

  async function publishDue() {
    setPublishing(true);
    setPublishLog([]);
    const log: string[] = [];
    for (const p of due) {
      try {
        const endpoint = p.platform === 'linkedin' ? '/api/linkedin/publish' : '/api/x/publish';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: p.body || p.title }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'failed');
        setPosts((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, status: 'published' as const } : x)),
        );
        log.push(`✓ ${p.platform.toUpperCase()}: ${p.title}`);
      } catch (err) {
        log.push(`✗ ${p.platform.toUpperCase()}: ${p.title} — ${(err as Error).message}`);
      }
      setPublishLog([...log]);
    }
    setPublishing(false);
  }

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(anchor);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [anchor],
  );

  const byDay = (d: Date) =>
    posts.filter((p) => {
      if (!p.scheduledFor) return false;
      const sd = new Date(p.scheduledFor);
      return (
        sd.getFullYear() === d.getFullYear() &&
        sd.getMonth() === d.getMonth() &&
        sd.getDate() === d.getDate()
      );
    });

  const unscheduled = posts.filter((p) => !p.scheduledFor);

  function moveTo(id: string, d: Date) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, scheduledFor: d.toISOString(), status: 'scheduled' as const } : p,
      ),
    );
  }

  function addPost(d: Date) {
    const id = `p${Date.now()}`;
    setPosts((prev) => [
      ...prev,
      {
        id,
        title: 'New post',
        body: '',
        platform: 'linkedin' as Platform,
        status: 'scheduled',
        scheduledFor: d.toISOString(),
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Drag posts across days. Unified across LinkedIn, Instagram, X, Facebook, and Newsletters."
        actions={
          <>
            {due.length > 0 && (
              <Button onClick={publishDue}>
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Publish {due.length} due
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                const n = new Date(anchor);
                n.setDate(n.getDate() - 7);
                setAnchor(n);
              }}
            >
              ←
            </Button>
            <Button variant="outline" onClick={() => setAnchor(startOfWeek(new Date()))}>
              Today
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const n = new Date(anchor);
                n.setDate(n.getDate() + 7);
                setAnchor(n);
              }}
            >
              →
            </Button>
          </>
        }
      />

      {publishLog.length > 0 && (
        <Card className="mb-4">
          <h3 className="mb-2 font-semibold">Publish results</h3>
          <div className="space-y-1 font-mono text-xs">
            {publishLog.map((l, i) => (
              <div
                key={i}
                className={
                  l.startsWith('✓') ? 'text-[var(--color-good)]' : 'text-[var(--color-bad)]'
                }
              >
                {l}
              </div>
            ))}
          </div>
        </Card>
      )}
      <div className="grid grid-cols-7 gap-2">
        {days.map((d, i) => {
          const dayPosts = byDay(d);
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div
              key={i}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) moveTo(dragId, d);
                setDragId(null);
              }}
              className={`min-h-[260px] rounded-lg border bg-[var(--color-bg-card)] p-2 transition ${
                isToday ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="text-xs">
                  <div className="text-[var(--color-fg-muted)]">
                    {d.toLocaleDateString(undefined, { weekday: 'short' })}
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      isToday ? 'text-[var(--color-accent)]' : ''
                    }`}
                  >
                    {d.getDate()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addPost(d)}
                  className="rounded p-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-fg)]"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {dayPosts.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    className="cursor-grab rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2 py-1.5 text-xs active:cursor-grabbing"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <Pill tone={PLATFORM_META[p.platform]?.tone}>
                        {PLATFORM_META[p.platform]?.label ?? p.platform}
                      </Pill>
                      {p.brandScore != null && (
                        <span className="text-[10px] text-[var(--color-fg-muted)]">
                          {p.brandScore}
                        </span>
                      )}
                    </div>
                    <div className="line-clamp-2 text-[var(--color-fg)]">{p.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {unscheduled.length > 0 && (
        <Card className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Unscheduled</h2>
            <span className="text-xs text-[var(--color-fg-muted)]">drag onto a day</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => setDragId(p.id)}
                className="cursor-grab rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-xs"
              >
                <div className="mb-1 flex items-center gap-2">
                  <Pill tone={PLATFORM_META[p.platform]?.tone}>
                    {PLATFORM_META[p.platform]?.label}
                  </Pill>
                  <span>{p.title}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
