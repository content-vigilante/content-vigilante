'use client';

import { Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, PageHeader, Pill } from '@/components/dashboard/ui';
import {
  seedLeads,
  seedPosts,
  useStore,
  type Lead,
  type Post,
  type Workspace,
} from '@/lib/store';

const SEED_WORKSPACES: Workspace[] = [
  { id: 'w1', name: 'Personal — Sai', brandColor: '#3FE07A' },
  { id: 'w2', name: 'Client: BikeWo', brandColor: '#1A1F3A' },
];

export default function SettingsPage() {
  const [workspaces, setWorkspaces] = useStore<Workspace[]>('workspaces', SEED_WORKSPACES);
  const [activeWs, setActiveWs] = useStore<string>('activeWs', SEED_WORKSPACES[0].id);
  const [, setPosts] = useStore<Post[]>('posts', seedPosts);
  const [, setLeads] = useStore<Lead[]>('leads', seedLeads);
  const [reset, setReset] = useState(false);

  function addWorkspace() {
    const name = prompt('Workspace name?');
    if (!name) return;
    setWorkspaces((prev) => [
      ...prev,
      { id: `w${Date.now()}`, name, brandColor: '#3FE07A' },
    ]);
  }

  function resetData() {
    if (!confirm('Reset all local data to seed values?')) return;
    setPosts(seedPosts);
    setLeads(seedLeads);
    setReset(true);
    setTimeout(() => setReset(false), 1500);
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Workspaces, providers, and your local data."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Workspaces</h3>
            <Button onClick={addWorkspace} variant="outline">
              + Add
            </Button>
          </div>
          <div className="space-y-2">
            {workspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setActiveWs(w.id)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition ${
                  activeWs === w.id
                    ? 'border-[var(--color-cv-ink)] bg-[var(--color-cv-paper-2)]'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-bg-elev)]'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: w.brandColor }}
                  />
                  {w.name}
                </span>
                {activeWs === w.id && <Pill tone="good"><Check className="mr-1 h-3 w-3 inline" />active</Pill>}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">LLM provider</h3>
          <p className="mb-3 text-sm text-[var(--color-fg-muted)]">
            Configure your provider on the Guardrails page — your key is stored in browser session
            only and never sent to our servers.
          </p>
          <a
            href="/dashboard/guardrails"
            className="inline-flex rounded-md bg-[var(--color-cv-ink)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Open provider settings →
          </a>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Data</h3>
          <p className="mb-4 text-sm text-[var(--color-fg-muted)]">
            All posts, leads, and workspaces live in your browser (localStorage). Nothing is
            uploaded.
          </p>
          <Button onClick={resetData} variant="outline">
            <Trash2 className="h-4 w-4" /> {reset ? 'Reset' : 'Reset to seed data'}
          </Button>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">About</h3>
          <p className="text-sm text-[var(--color-fg-muted)]">
            Content Vigilante is open source under MIT.{' '}
            <a
              href="https://github.com/content-vigilante/Content-Vigilante"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--color-fg)]"
            >
              GitHub →
            </a>
          </p>
        </Card>
      </div>
    </>
  );
}
