'use client';

import { Card, Pill } from '@/components/dashboard/ui';
import { useEffect, useState } from 'react';

interface Stats {
  total: number;
  byChannel: Record<string, number>;
  recent: Array<{ ts: string; channel: string; path: string; referrer: string | null }>;
}

export function DarkSocial() {
  const [data, setData] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/track')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ total: 0, byChannel: {}, recent: [] }));
  }, []);

  if (!data) return null;
  const channels = Object.entries(data.byChannel).sort((a, b) => b[1] - a[1]);
  const max = channels[0]?.[1] ?? 1;

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Dark social tracker</h3>
        <Pill tone="default">{data.total} hits</Pill>
      </div>
      {channels.length === 0 ? (
        <p className="text-xs text-[var(--color-fg-muted)]">
          No tracked hits yet. Drop a single line in your site head to start tracking:
          <code className="ml-1 rounded bg-[var(--color-bg-elev)] px-1 py-0.5 text-[10px]">
            fetch('/api/track', {'{'} method:'POST', headers:{'{'}'content-type':'application/json'
            {'}'}, body: JSON.stringify({'{'} path: location.pathname, referrer: document.referrer,
            utm: Object.fromEntries(new URLSearchParams(location.search)) {'}'}) {'}'})
          </code>
        </p>
      ) : (
        <div className="space-y-1.5 text-xs">
          {channels.slice(0, 8).map(([ch, n]) => (
            <div key={ch}>
              <div className="mb-0.5 flex justify-between">
                <span>{ch}</span>
                <span className="text-[var(--color-fg-muted)]">{n}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-elev)]">
                <div
                  className="h-full bg-[var(--color-accent)]"
                  style={{ width: `${(n / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
