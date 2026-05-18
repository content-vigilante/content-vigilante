'use client';

import { Button, Card, PageHeader, Pill } from '@/components/dashboard/ui';
import { useStore } from '@/lib/store';
import { Eye, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface WatchTarget {
  id: string;
  label: string;
  url: string;
  lastHash?: string;
  lastExcerpt?: string;
  lastChecked?: string;
  changed?: boolean;
}

export default function WatchlistPage() {
  const [targets, setTargets] = useStore<WatchTarget[]>('watchlist', []);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function add() {
    if (!label.trim() || !url.trim()) return;
    let u = url.trim();
    if (!/^https?:\/\//.test(u)) u = `https://${u}`;
    setTargets((prev) => [...prev, { id: `w${Date.now()}`, label: label.trim(), url: u }]);
    setLabel('');
    setUrl('');
  }

  function remove(id: string) {
    setTargets((prev) => prev.filter((t) => t.id !== id));
  }

  async function checkAll() {
    if (targets.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/watchlist/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targets: targets.map(({ id, label: l, url: u }) => ({ id, label: l, url: u })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'check failed');
      const map: Record<string, { hash?: string; excerpt?: string; error?: string }> = {};
      for (const c of json.checks as Array<{
        id: string;
        hash?: string;
        excerpt?: string;
        error?: string;
      }>) {
        map[c.id] = c;
      }
      setTargets((prev) =>
        prev.map((t) => {
          const r = map[t.id];
          if (!r) return t;
          const changed = !!t.lastHash && !!r.hash && t.lastHash !== r.hash;
          return {
            ...t,
            lastHash: r.hash ?? t.lastHash,
            lastExcerpt: r.excerpt ?? t.lastExcerpt,
            lastChecked: new Date().toISOString(),
            changed,
          };
        }),
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Competitor watchlist"
        subtitle="Track public pages — homepages, blogs, pricing — and get a heads-up when they change."
        actions={
          <Button onClick={checkAll} disabled={targets.length === 0}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Check all
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Competitor X homepage)"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <Button onClick={add}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        {err && <div className="mt-2 text-xs text-[var(--color-bad)]">{err}</div>}
      </Card>

      {targets.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-[var(--color-fg-muted)]">
            No targets yet. Add a competitor URL above.
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {targets.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start gap-3">
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-fg-muted)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{t.label}</span>
                    {t.changed && <Pill tone="warn">changed</Pill>}
                    {t.lastChecked && (
                      <span className="text-[11px] text-[var(--color-fg-muted)]">
                        · last check {new Date(t.lastChecked).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-xs text-[var(--color-accent)] underline"
                  >
                    {t.url}
                  </a>
                  {t.lastExcerpt && (
                    <p className="mt-2 line-clamp-2 text-xs text-[var(--color-fg-muted)]">
                      {t.lastExcerpt}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  aria-label="Remove"
                  className="shrink-0 rounded-md p-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-bad)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
