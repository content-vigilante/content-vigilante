'use client';

import { Card, PageHeader, Pill } from '@/components/dashboard/ui';
import { type Lead, type Post, type Workspace, seedLeads, seedPosts, useStore } from '@/lib/store';
import { Download, FileText, Printer, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

function randomToken() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function ExportsPage() {
  const [posts] = useStore<Post[]>('posts', seedPosts);
  const [leads] = useStore<Lead[]>('leads', seedLeads);
  const [workspaces] = useStore<Workspace[]>('workspaces', []);
  const [activeWs] = useStore<string>('activeWs', '');
  const activeWorkspace = workspaces.find((w) => w.id === activeWs);

  const [hourly, setHourly] = useState(60);
  const [hours, setHours] = useState(24);
  const [clientName, setClientName] = useState('Client name');
  const [shareToken, setShareToken] = useState('');

  // Hydrate hourly + client name from the active workspace on mount / change.
  useEffect(() => {
    if (!activeWorkspace) return;
    if (activeWorkspace.hourlyRate) setHourly(activeWorkspace.hourlyRate);
    if (activeWorkspace.clientName) setClientName(activeWorkspace.clientName);
  }, [activeWorkspace]);

  const currency = activeWorkspace?.currency ?? '€';

  const published = posts.filter((p) => p.status === 'published');
  const scheduled = posts.filter((p) => p.status === 'scheduled');
  const closedValue = leads
    .filter((l) => l.stage === 'closed')
    .reduce((s, l) => s + (l.value ?? 0), 0);

  const invoiceTotal = hourly * hours;
  const invoiceNumber = useMemo(
    () => `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
    [],
  );

  function publishShare() {
    const tok = shareToken || randomToken();
    setShareToken(tok);
    const payload = {
      client: clientName,
      generatedAt: new Date().toISOString(),
      brand: activeWorkspace
        ? {
            name: activeWorkspace.name,
            color: activeWorkspace.brandColor,
            logoUrl: activeWorkspace.logoUrl,
          }
        : undefined,
      posts: posts
        .filter(
          (p) => p.status === 'scheduled' || p.status === 'in-review' || p.status === 'approved',
        )
        .map(({ id, title, body, platform, scheduledFor, brandScore }) => ({
          id,
          title,
          body,
          platform,
          scheduledFor,
          brandScore,
        })),
    };
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cv-sync-token': `share-${tok}` },
      body: JSON.stringify({ data: payload }),
    }).catch(() => {});
  }

  function exportJSON() {
    const blob = new Blob(
      [JSON.stringify({ posts, leads, exportedAt: new Date().toISOString() }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `content-vigilante-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPage() {
    window.print();
  }

  return (
    <>
      <PageHeader
        title="Exports"
        subtitle="Portfolio snapshots, invoices, and shareable client portals."
        actions={
          <>
            <button
              type="button"
              onClick={exportJSON}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm font-medium"
            >
              <Download className="h-4 w-4" /> JSON
            </button>
            <button
              type="button"
              onClick={printPage}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-cv-ink)] px-3 py-1.5 text-sm font-medium text-white"
            >
              <Printer className="h-4 w-4" /> Print / PDF
            </button>
          </>
        }
      />

      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--color-fg-muted)]" />
          <h2 className="font-semibold">Portfolio summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Campaigns" value={posts.length} />
          <Metric label="Published" value={published.length} />
          <Metric label="Scheduled" value={scheduled.length} />
          <Metric label="Closed revenue" value={`${currency}${closedValue.toLocaleString()}`} />
        </div>
        <div className="mt-4 text-sm">
          <h3 className="mb-2 font-medium">Published work</h3>
          <ul className="divide-y divide-[var(--color-border)]">
            {published.slice(0, 12).map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <Pill tone="good">{p.platform}</Pill>
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                {p.brandScore != null && (
                  <span className="text-xs text-[var(--color-fg-muted)]">
                    score {p.brandScore}/100
                  </span>
                )}
              </li>
            ))}
            {published.length === 0 && (
              <li className="py-3 text-xs text-[var(--color-fg-muted)]">
                Nothing published yet. Schedule and publish from Studio.
              </li>
            )}
          </ul>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--color-fg-muted)]" />
          <h2 className="font-semibold">Freelance invoice</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs text-[var(--color-fg-muted)]">
            Bill to
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-1.5 text-sm text-[var(--color-fg)]"
            />
          </label>
          <label className="text-xs text-[var(--color-fg-muted)]">
            Hours
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-1.5 text-sm text-[var(--color-fg)]"
            />
          </label>
          <label className="text-xs text-[var(--color-fg-muted)]">
            Rate ({currency} / hour)
            <input
              type="number"
              value={hourly}
              onChange={(e) => setHourly(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-1.5 text-sm text-[var(--color-fg)]"
            />
          </label>
        </div>
        <div className="mt-4 rounded-md border border-[var(--color-border)] bg-white p-4 print:border-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-fg-muted)]">
                Invoice · {invoiceNumber}
              </div>
              <div className="mt-1 font-display text-xl font-bold">{clientName}</div>
            </div>
            <div className="text-right text-xs text-[var(--color-fg-muted)]">
              <div>Issued: {new Date().toLocaleDateString()}</div>
              <div>Due: {new Date(Date.now() + 30 * 86400000).toLocaleDateString()}</div>
            </div>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-fg-muted)]">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Hours</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--color-border)]">
                <td className="py-2">
                  Marketing services — {published.length} published pieces, {scheduled.length}{' '}
                  scheduled
                </td>
                <td className="py-2 text-right">{hours}</td>
                <td className="py-2 text-right">
                  {currency}
                  {hourly}
                </td>
                <td className="py-2 text-right">
                  {currency}
                  {invoiceTotal.toLocaleString()}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="py-3 text-right font-semibold">
                  Total
                </td>
                <td className="py-3 text-right font-semibold">
                  {currency}
                  {invoiceTotal.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="mt-4 text-xs text-[var(--color-fg-muted)]">
            Payable to Sai Prathyaksh Kanagat · IBAN on request · Thank you.
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-[var(--color-fg-muted)]" />
          <h2 className="font-semibold">Client approval portal</h2>
        </div>
        <p className="mb-3 text-sm text-[var(--color-fg-muted)]">
          Generates a read-only link your client can open without an account. The link contains a
          random token that maps to a snapshot of your scheduled + drafting posts (stored via the
          sync layer).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={publishShare}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-cv-ink)] px-3 py-1.5 text-sm font-medium text-white"
          >
            <Share2 className="h-4 w-4" /> Generate link
          </button>
          {shareToken && (
            <Link
              href={`/share/${shareToken}`}
              target="_blank"
              className="break-all text-xs text-[var(--color-accent)] underline"
            >
              /share/{shareToken}
            </Link>
          )}
        </div>
      </Card>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
      <div className="text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
