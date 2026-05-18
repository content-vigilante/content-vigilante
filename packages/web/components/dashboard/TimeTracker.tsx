'use client';

import { Pause, Play, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ActiveTimer {
  label: string;
  kind: 'creation' | 'engagement';
  startedAt: string;
}

interface TimeEntry {
  id: string;
  label: string;
  kind: 'creation' | 'engagement';
  seconds: number;
  endedAt: string;
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function readActive(): ActiveTimer | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('cv:store:timeActive');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveTimer;
  } catch {
    return null;
  }
}

function writeActive(t: ActiveTimer | null) {
  if (t) localStorage.setItem('cv:store:timeActive', JSON.stringify(t));
  else localStorage.removeItem('cv:store:timeActive');
}

function readEntries(): TimeEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('cv:store:timeEntries');
  if (!raw) return [];
  try {
    return JSON.parse(raw) as TimeEntry[];
  } catch {
    return [];
  }
}

function writeEntries(e: TimeEntry[]) {
  localStorage.setItem('cv:store:timeEntries', JSON.stringify(e));
  window.dispatchEvent(new CustomEvent('cv:store:timeEntries'));
}

export function TimeTracker() {
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [now, setNow] = useState(Date.now());
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    setActive(readActive());
    setEntries(readEntries());
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const elapsed = active ? Math.floor((now - new Date(active.startedAt).getTime()) / 1000) : 0;

  function start(kind: 'creation' | 'engagement') {
    if (active) return;
    const label = prompt(`Label for ${kind} timer?`)?.trim();
    if (!label) return;
    const t: ActiveTimer = { kind, label, startedAt: new Date().toISOString() };
    setActive(t);
    writeActive(t);
  }

  function stop() {
    if (!active) return;
    const secs = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000);
    const entry: TimeEntry = {
      id: `t${Date.now()}`,
      label: active.label,
      kind: active.kind,
      seconds: secs,
      endedAt: new Date().toISOString(),
    };
    const next = [entry, ...entries].slice(0, 100);
    setEntries(next);
    writeEntries(next);
    setActive(null);
    writeActive(null);
  }

  const totalToday = entries
    .filter((e) => new Date(e.endedAt).toDateString() === new Date().toDateString())
    .reduce((s, e) => s + e.seconds, 0);

  return (
    <div className="fixed bottom-4 right-4 z-30">
      {open && (
        <div className="mb-2 w-72 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold">Time tracker</div>
            <div className="text-[10px] text-[var(--color-fg-muted)]">
              today: {formatDuration(totalToday)}
            </div>
          </div>
          {active ? (
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2">
              <div className="text-[11px] uppercase tracking-wide text-[var(--color-fg-muted)]">
                {active.kind}
              </div>
              <div className="text-sm font-medium">{active.label}</div>
              <div className="font-mono text-xs text-[var(--color-fg-muted)]">
                {formatDuration(elapsed)}
              </div>
              <button
                type="button"
                onClick={stop}
                className="mt-2 inline-flex items-center gap-1 rounded-md bg-[var(--color-cv-ink)] px-2 py-1 text-xs font-medium text-white"
              >
                <Pause className="h-3 w-3" /> Stop
              </button>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => start('creation')}
                className="flex-1 rounded-md border border-[var(--color-border)] px-2 py-1.5 text-[11px] hover:bg-[var(--color-bg-elev)]"
              >
                Creation
              </button>
              <button
                type="button"
                onClick={() => start('engagement')}
                className="flex-1 rounded-md border border-[var(--color-border)] px-2 py-1.5 text-[11px] hover:bg-[var(--color-bg-elev)]"
              >
                Engagement
              </button>
            </div>
          )}
          {entries.length > 0 && (
            <div className="mt-3 max-h-32 space-y-1 overflow-y-auto text-[11px]">
              {entries.slice(0, 8).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-2 text-[var(--color-fg-muted)]"
                >
                  <span className="truncate">{e.label}</span>
                  <span className="shrink-0 font-mono">{formatDuration(e.seconds)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-2 text-xs font-medium shadow-md transition ${
          active
            ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
            : 'bg-[var(--color-bg-card)] text-[var(--color-fg)]'
        }`}
      >
        {active ? <Play className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
        {active ? formatDuration(elapsed) : 'Track time'}
      </button>
    </div>
  );
}
