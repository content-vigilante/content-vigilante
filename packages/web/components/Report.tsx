'use client';

import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { AuditResult, Issue } from './types';

export function Report({ result }: { result: AuditResult }) {
  return (
    <div className="mt-8">
      <ScoreBlock result={result} />
      <DimensionBars dims={result.dimensions} />
      {result.strengths.length > 0 && <Strengths strengths={result.strengths} />}
      <IssueList issues={result.issues} />
    </div>
  );
}

function ScoreBlock({ result }: { result: AuditResult }) {
  const score = result.score;
  const color = score >= 80 ? 'good' : score >= 60 ? 'warn' : 'bad';
  const colorMap = { good: '--color-good', warn: '--color-warn', bad: '--color-bad' } as const;
  return (
    <div className="mb-6 flex items-baseline gap-4">
      <div className="text-6xl font-bold" style={{ color: `var(${colorMap[color]})` }}>
        {score}
        <span className="text-2xl text-[var(--color-fg-muted)]">/100</span>
      </div>
      <div className="text-sm text-[var(--color-fg-muted)]">
        Voice match · {result.metadata.durationMs}ms · {result.issues.length} issue
        {result.issues.length === 1 ? '' : 's'}
      </div>
    </div>
  );
}

function DimensionBars({
  dims,
}: {
  dims: { tone: number; vocabulary: number; structure: number; readability: number };
}) {
  const entries = [
    { label: 'Tone', value: dims.tone },
    { label: 'Vocabulary', value: dims.vocabulary },
    { label: 'Structure', value: dims.structure },
    { label: 'Readability', value: dims.readability },
  ];
  return (
    <div className="mb-8 grid grid-cols-2 gap-4">
      {entries.map((e) => (
        <div key={e.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-[var(--color-fg-muted)]">{e.label}</span>
            <span className="font-mono">{e.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-elev)]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, e.value))}%`,
                background: barColor(e.value),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function barColor(v: number): string {
  if (v >= 80) return 'var(--color-good)';
  if (v >= 60) return 'var(--color-warn)';
  return 'var(--color-bad)';
}

function Strengths({ strengths }: { strengths: string[] }) {
  return (
    <div className="mb-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <CheckCircle2 className="h-4 w-4 text-[var(--color-good)]" />
        Strengths
      </h3>
      <ul className="space-y-1 text-sm text-[var(--color-fg-muted)]">
        {strengths.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

function IssueList({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 font-semibold">Issues ({issues.length})</h3>
      <div className="space-y-3">
        {issues.map((issue, idx) => (
          <IssueRow key={`${issue.line}-${issue.type}-${idx}`} issue={issue} />
        ))}
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const Icon =
    issue.severity === 'high' ? AlertCircle : issue.severity === 'medium' ? AlertTriangle : Info;
  const color =
    issue.severity === 'high'
      ? 'var(--color-bad)'
      : issue.severity === 'medium'
        ? 'var(--color-warn)'
        : 'var(--color-fg-muted)';
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--color-fg-muted)]">
        <Icon className="h-4 w-4" style={{ color }} />
        Line {issue.line} · {issue.type} · {issue.severity}
      </div>
      <div className="font-mono text-sm">"{issue.text}"</div>
      {issue.rule && (
        <div className="mt-2 text-xs text-[var(--color-fg-muted)]">
          <span className="font-semibold">Rule:</span> {issue.rule}
        </div>
      )}
      {issue.suggestion && (
        <div className="mt-1 text-xs">
          <span className="font-semibold text-[var(--color-fg-muted)]">Try:</span>{' '}
          <span className="text-[var(--color-good)]">{issue.suggestion}</span>
        </div>
      )}
    </div>
  );
}
