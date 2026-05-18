'use client';

import { Loader2, Plus, Send, Slack, Trash2, Webhook } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Pill } from './ui';

interface Target {
  id: string;
  channel: 'slack' | 'discord' | 'webhook';
  url: string;
  events: string[];
  label?: string;
}

const EVENT_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'post.published', label: 'Post published' },
  { id: 'post.publish_failed', label: 'Publish failed' },
  { id: 'watchlist.changed', label: 'Watchlist change' },
  { id: 'inbox.new_comment', label: 'New comment' },
  { id: 'lead.hot', label: 'Hot lead' },
];

function tokenHeader() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('cv:syncToken') : null;
  return t ?? '';
}

export function NotifyPanel() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [channel, setChannel] = useState<Target['channel']>('slack');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  async function load() {
    const t = tokenHeader();
    if (t.length < 16) return;
    const res = await fetch('/api/notify/targets', { headers: { 'x-cv-sync-token': t } });
    if (res.ok) {
      const j = await res.json();
      setTargets(j.targets ?? []);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save(next: Target[], test = false) {
    const t = tokenHeader();
    if (t.length < 16) {
      setMsg('Set a 16+ char sync token in the Sync card above first.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/notify/targets', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-cv-sync-token': t },
        body: JSON.stringify({ targets: next, test }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'save failed');
      setTargets(next);
      setMsg(test ? 'Sent a test notification ✓' : 'Saved ✓');
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function add() {
    if (!url.trim()) return;
    const t: Target = {
      id: `n${Date.now()}`,
      channel,
      url: url.trim(),
      events: EVENT_OPTIONS.map((e) => e.id),
      label: label.trim() || undefined,
    };
    const next = [...targets, t];
    setUrl('');
    setLabel('');
    save(next);
  }

  function remove(id: string) {
    save(targets.filter((t) => t.id !== id));
  }

  function toggleEvent(id: string, ev: string) {
    const next = targets.map((t) => {
      if (t.id !== id) return t;
      const has = t.events.includes(ev);
      return { ...t, events: has ? t.events.filter((e) => e !== ev) : [...t.events, ev] };
    });
    save(next);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Slack className="h-4 w-4" /> Add a destination
        </div>
        <div className="grid gap-2 md:grid-cols-[110px_1fr_2fr_auto]">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as Target['channel'])}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1.5 text-xs outline-none"
          >
            <option value="slack">Slack</option>
            <option value="discord">Discord</option>
            <option value="webhook">Webhook</option>
          </select>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. #marketing)"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs outline-none"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={
              channel === 'slack'
                ? 'https://hooks.slack.com/services/T0../B0../...'
                : channel === 'discord'
                  ? 'https://discord.com/api/webhooks/...'
                  : 'https://your-endpoint.example.com/hook'
            }
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-xs outline-none"
          />
          <Button onClick={add}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="mt-2 text-[11px] text-[var(--color-fg-muted)]">
          Slack: create an Incoming Webhook in your workspace, paste the URL above. Discord: Server
          settings → Integrations → Webhooks. Generic: any HTTPS endpoint that accepts JSON POST.
        </div>
      </div>

      {targets.length === 0 ? (
        <div className="rounded-md border border-[var(--color-border)] p-3 text-xs text-[var(--color-fg-muted)]">
          No destinations yet. Add one above to start getting publish + watchlist + inbox pings.
        </div>
      ) : (
        <div className="space-y-2">
          {targets.map((t) => (
            <div
              key={t.id}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {t.channel === 'slack' ? (
                    <Slack className="h-4 w-4" />
                  ) : (
                    <Webhook className="h-4 w-4" />
                  )}
                  {t.label || t.channel}
                  <Pill tone="default">{t.channel}</Pill>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => save(targets, true)} variant="ghost">
                    {busy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    Test
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    aria-label="Remove"
                    className="rounded-md p-1 text-[var(--color-fg-muted)] hover:text-[var(--color-bad)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="break-all text-[11px] text-[var(--color-fg-muted)]">{t.url}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EVENT_OPTIONS.map((ev) => (
                  <label
                    key={ev.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                      t.events.includes(ev.id)
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-cv-ink)]'
                        : 'border-[var(--color-border)] text-[var(--color-fg-muted)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={t.events.includes(ev.id)}
                      onChange={() => toggleEvent(t.id, ev.id)}
                    />
                    {ev.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {msg && <div className="text-[11px] text-[var(--color-fg-muted)]">{msg}</div>}
    </div>
  );
}
