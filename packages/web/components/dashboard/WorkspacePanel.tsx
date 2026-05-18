'use client';

import { type Workspace, type WorkspaceRole, useStore } from '@/lib/store';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, Pill } from './ui';

const SEED: Workspace[] = [
  {
    id: 'w1',
    name: 'Personal — Sai',
    brandColor: '#3FE07A',
    clientName: 'Sai Prathyaksh Kanagat',
    hourlyRate: 60,
    currency: '€',
    role: 'admin',
  },
];

const ROLES: WorkspaceRole[] = ['admin', 'writer', 'reviewer'];

export function WorkspacePanel() {
  const [workspaces, setWorkspaces] = useStore<Workspace[]>('workspaces', SEED);
  const [activeWs, setActiveWs] = useStore<string>('activeWs', SEED[0].id);
  const [editing, setEditing] = useState<string | null>(null);

  const active = useMemo(
    () => workspaces.find((w) => w.id === activeWs) ?? workspaces[0],
    [workspaces, activeWs],
  );

  function add() {
    const name = prompt('Workspace name?')?.trim();
    if (!name) return;
    const id = `w${Date.now()}`;
    setWorkspaces((prev) => [
      ...prev,
      {
        id,
        name,
        brandColor: '#3FE07A',
        clientName: name,
        hourlyRate: 60,
        currency: '€',
        role: 'admin',
      },
    ]);
    setActiveWs(id);
    setEditing(id);
  }

  function remove(id: string) {
    if (workspaces.length === 1) {
      alert('At least one workspace is required.');
      return;
    }
    if (!confirm('Delete this workspace?')) return;
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    if (activeWs === id) setActiveWs(workspaces.find((w) => w.id !== id)?.id ?? '');
  }

  function update<K extends keyof Workspace>(id: string, key: K, value: Workspace[K]) {
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, [key]: value } : w)));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {workspaces.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setActiveWs(w.id)}
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition ${
              activeWs === w.id
                ? 'border-[var(--color-cv-ink)] bg-[var(--color-cv-paper-2)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-bg-elev)]'
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: w.brandColor || '#3FE07A' }}
            />
            {w.name}
            {activeWs === w.id && <Check className="h-3 w-3 text-[var(--color-good)]" />}
          </button>
        ))}
        <Button onClick={add} variant="ghost">
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {active && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{active.name}</span>
              <Pill tone="default">{active.role ?? 'admin'}</Pill>
            </div>
            <div className="flex gap-1">
              <Button
                onClick={() => setEditing(editing === active.id ? null : active.id)}
                variant="ghost"
              >
                <Pencil className="h-3 w-3" />
                {editing === active.id ? 'Done' : 'Edit'}
              </Button>
              <button
                type="button"
                onClick={() => remove(active.id)}
                aria-label="Delete workspace"
                className="rounded-md p-1.5 text-[var(--color-fg-muted)] hover:text-[var(--color-bad)]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {editing === active.id ? (
            <div className="grid gap-2 md:grid-cols-2">
              <Field label="Internal name">
                <input
                  value={active.name}
                  onChange={(e) => update(active.id, 'name', e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-xs"
                />
              </Field>
              <Field label="Client name (on share portal)">
                <input
                  value={active.clientName ?? ''}
                  onChange={(e) => update(active.id, 'clientName', e.target.value)}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-xs"
                />
              </Field>
              <Field label="Brand color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={active.brandColor ?? '#3FE07A'}
                    onChange={(e) => update(active.id, 'brandColor', e.target.value)}
                    className="h-7 w-12 rounded-md border border-[var(--color-border)]"
                  />
                  <code className="text-[11px] text-[var(--color-fg-muted)]">
                    {active.brandColor}
                  </code>
                </div>
              </Field>
              <Field label="Logo URL (for share portal)">
                <input
                  value={active.logoUrl ?? ''}
                  onChange={(e) => update(active.id, 'logoUrl', e.target.value)}
                  placeholder="https://…/logo.svg"
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-xs"
                />
              </Field>
              <Field label="Hourly rate (used by invoice)">
                <div className="flex gap-1">
                  <input
                    value={active.currency ?? '€'}
                    onChange={(e) => update(active.id, 'currency', e.target.value)}
                    className="w-12 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-center text-xs"
                  />
                  <input
                    type="number"
                    value={active.hourlyRate ?? 60}
                    onChange={(e) => update(active.id, 'hourlyRate', Number(e.target.value))}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-xs"
                  />
                </div>
              </Field>
              <Field label="My role">
                <select
                  value={active.role ?? 'admin'}
                  onChange={(e) => update(active.id, 'role', e.target.value as WorkspaceRole)}
                  className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-xs"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : (
            <div className="grid gap-2 text-xs text-[var(--color-fg-muted)] md:grid-cols-2">
              <span>Client: {active.clientName ?? '—'}</span>
              <span>
                Rate: {active.currency ?? '€'}
                {active.hourlyRate ?? '—'}/hr
              </span>
              <span className="md:col-span-2 truncate">
                Logo: {active.logoUrl ?? '— uses owl mark'}
              </span>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-[var(--color-fg-muted)]">
        Roles are advisory in v2.4: <code>reviewer</code> sees an approval prompt on the Pipeline
        instead of a Publish button, <code>writer</code> can't approve their own drafts, and
        <code> admin</code> can do everything. Multi-user enforcement lands when NextAuth is wired
        with a real DB.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-wide text-[var(--color-fg-muted)]">
      <span>{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  );
}
