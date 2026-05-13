'use client';

import { Button, Card, PageHeader, Pill, Stat } from '@/components/dashboard/ui';
import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

const TRAFFIC = [12, 18, 14, 22, 19, 28, 26, 32, 30, 38, 41, 39, 47, 52];
const SOCIAL = [5, 9, 7, 11, 10, 14, 13, 18, 17, 22, 24, 23, 28, 31];
const HEATMAP = [
  [1, 1, 2, 3, 2, 1, 0],
  [2, 4, 5, 6, 5, 3, 1],
  [3, 7, 9, 8, 7, 4, 2],
  [5, 9, 12, 11, 10, 6, 3],
  [4, 8, 10, 12, 11, 7, 4],
  [3, 6, 8, 9, 8, 5, 3],
  [1, 3, 4, 5, 4, 2, 1],
];
const HOURS = ['6a', '9a', '12p', '3p', '6p', '9p', '12a'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Sparkline({
  data,
  color,
  height = 60,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  const w = 320;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - ((v - min) / (max - min || 1)) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

interface GA4Totals {
  users: number;
  sessions: number;
  pageviews: number;
  engagementRate: number;
}

export default function AnalyticsPage() {
  const max = Math.max(...HEATMAP.flat());
  const [propertyId, setPropertyId] = useState('');
  const [ga4, setGa4] = useState<GA4Totals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setPropertyId(localStorage.getItem('cv:ga4PropertyId') ?? '');
    fetch('/api/connections/status')
      .then((r) => r.json())
      .then((s) => setConnected(!!s.ga4?.connected))
      .catch(() => {});
  }, []);

  async function refresh() {
    if (!propertyId.trim()) {
      setError('Set your GA4 Property ID (e.g. properties/123456789).');
      return;
    }
    localStorage.setItem('cv:ga4PropertyId', propertyId);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ga4/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ propertyId, dateRange: '30daysAgo' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'GA4 report failed');
      const rows = (json.report?.rows ?? []) as Array<{ metricValues: { value: string }[] }>;
      const totals = rows.reduce<GA4Totals>(
        (acc, r) => ({
          users: acc.users + Number(r.metricValues[0]?.value ?? 0),
          sessions: acc.sessions + Number(r.metricValues[1]?.value ?? 0),
          pageviews: acc.pageviews + Number(r.metricValues[2]?.value ?? 0),
          engagementRate: acc.engagementRate + Number(r.metricValues[3]?.value ?? 0),
        }),
        { users: 0, sessions: 0, pageviews: 0, engagementRate: 0 },
      );
      if (rows.length) totals.engagementRate /= rows.length;
      setGa4(totals);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={
          ga4
            ? 'Live GA4 data. Other channels mocked until connected.'
            : 'GA4 connected? Add property ID to pull live numbers.'
        }
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            placeholder="properties/123456789"
            className="min-w-[260px] flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <Button onClick={refresh} variant="outline">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Pull GA4
          </Button>
          {connected ? (
            <Pill tone="good">GA4 connected</Pill>
          ) : (
            <Pill tone="warn">connect GA4 in Settings</Pill>
          )}
        </div>
        {error && <div className="mt-2 text-xs text-[var(--color-bad)]">{error}</div>}
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Users"
          value={ga4 ? ga4.users.toLocaleString() : '48.2K'}
          delta={ga4 ? undefined : '+12%'}
          hint={ga4 ? 'live · GA4 · 30d' : 'sample data'}
        />
        <Stat
          label="Sessions"
          value={ga4 ? ga4.sessions.toLocaleString() : '6.4%'}
          delta={ga4 ? undefined : '+0.8'}
          hint={ga4 ? 'live · GA4 · 30d' : 'sample'}
        />
        <Stat
          label="Pageviews"
          value={ga4 ? ga4.pageviews.toLocaleString() : '3.1%'}
          delta={ga4 ? undefined : '-0.2'}
          hint={ga4 ? 'live · GA4 · 30d' : 'sample'}
        />
        <Stat
          label="Engagement"
          value={ga4 ? `${Math.round(ga4.engagementRate * 100)}%` : '2,847'}
          delta={ga4 ? undefined : '+143'}
          hint={ga4 ? 'live · GA4 · 30d' : 'sample'}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Correlation: social effort × web traffic</h3>
            <Pill tone="good">r = 0.81</Pill>
          </div>
          <div className="mb-3 text-xs text-[var(--color-fg-muted)]">
            Posts per week (orange) vs unique visitors (white)
          </div>
          <Sparkline data={SOCIAL} color="var(--color-accent)" />
          <Sparkline data={TRAFFIC} color="var(--color-fg)" />
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Best time to post</h3>
          <div className="overflow-x-auto">
            <div className="inline-block">
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `40px repeat(${HOURS.length}, 28px)` }}
              >
                <div />
                {HOURS.map((h) => (
                  <div key={h} className="text-center text-[10px] text-[var(--color-fg-muted)]">
                    {h}
                  </div>
                ))}
                {DAYS.map((day, di) => (
                  <ContentRow key={day} day={day} row={HEATMAP[di]} max={max} />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-[var(--color-fg-muted)]">
            Peak: <span className="text-[var(--color-fg)]">Thu 3pm</span> and{' '}
            <span className="text-[var(--color-fg)]">Tue 12pm</span>.
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <h3 className="mb-3 font-semibold">By asset type</h3>
          <BarRow label="Carousel" pct={84} />
          <BarRow label="Video" pct={71} />
          <BarRow label="Image" pct={48} />
          <BarRow label="Text" pct={32} />
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">Audience demographics</h3>
          <div className="space-y-2 text-sm">
            <Demo flag="🇮🇹" label="Italy" pct={42} />
            <Demo flag="🇮🇳" label="India" pct={21} />
            <Demo flag="🇺🇸" label="United States" pct={14} />
            <Demo flag="🇩🇪" label="Germany" pct={9} />
            <Demo flag="🇫🇷" label="France" pct={6} />
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">ROI</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-fg-muted)]">Ad spend</span>
              <span>€420</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-fg-muted)]">Time cost (24h × €60)</span>
              <span>€1,440</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-fg-muted)]">Lead value</span>
              <span>€12,300</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-[var(--color-border)] pt-2 font-semibold">
              <span>ROI</span>
              <span className="text-[var(--color-good)]">6.6×</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function ContentRow({ day, row, max }: { day: string; row: number[]; max: number }) {
  return (
    <>
      <div className="text-[10px] text-[var(--color-fg-muted)] self-center">{day}</div>
      {row.map((v, i) => {
        const op = v / max;
        return (
          <div
            key={i}
            className="h-6 w-7 rounded-sm"
            style={{
              background: `color-mix(in oklab, var(--color-accent) ${op * 100}%, transparent)`,
            }}
            title={`${day} ${i}: ${v}`}
          />
        );
      })}
    </>
  );
}

function BarRow({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span className="text-[var(--color-fg-muted)]">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-elev)]">
        <div
          className="h-full rounded-full bg-[var(--color-accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Demo({ flag, label, pct }: { flag: string; label: string; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <span>{flag}</span>
      <span className="flex-1">{label}</span>
      <span className="text-xs text-[var(--color-fg-muted)]">{pct}%</span>
    </div>
  );
}
