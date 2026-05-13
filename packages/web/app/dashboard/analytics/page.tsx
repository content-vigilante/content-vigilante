'use client';

import { Card, PageHeader, Pill, Stat } from '@/components/dashboard/ui';

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

export default function AnalyticsPage() {
  const max = Math.max(...HEATMAP.flat());

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="GA4, LinkedIn, Meta, X — unified. Plus your correlation engine."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Impressions" value="48.2K" delta="+12%" hint="last 30 days" />
        <Stat label="Engagement" value="6.4%" delta="+0.8" hint="vs prior period" />
        <Stat label="Click-through" value="3.1%" delta="-0.2" />
        <Stat label="Followers" value="2,847" delta="+143" />
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
                  <ContentRow
                    key={day}
                    day={day}
                    row={HEATMAP[di]}
                    max={max}
                  />
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
            style={{ background: `color-mix(in oklab, var(--color-accent) ${op * 100}%, transparent)` }}
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
