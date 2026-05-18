'use client';

import { AccountPanel } from '@/components/dashboard/AccountPanel';
import { Connections } from '@/components/dashboard/Connections';
import { NotifyPanel } from '@/components/dashboard/NotifyPanel';
import { SyncPanel } from '@/components/dashboard/SyncPanel';
import { WorkspacePanel } from '@/components/dashboard/WorkspacePanel';
import { Button, Card, PageHeader } from '@/components/dashboard/ui';
import { type Lead, type Post, seedLeads, seedPosts, useStore } from '@/lib/store';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [, setPosts] = useStore<Post[]>('posts', seedPosts);
  const [, setLeads] = useStore<Lead[]>('leads', seedLeads);
  const [reset, setReset] = useState(false);

  function resetData() {
    if (!confirm('Reset all local data to seed values?')) return;
    setPosts(seedPosts);
    setLeads(seedLeads);
    setReset(true);
    setTimeout(() => setReset(false), 1500);
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Workspaces, providers, and your local data." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-semibold">Workspaces & white-label</h3>
          <WorkspacePanel />
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-semibold">Integrations</h3>
          <Connections />
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

        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-semibold">Account & token linking</h3>
          <AccountPanel />
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-semibold">Cross-device sync</h3>
          <SyncPanel />
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-semibold">Notifications (Slack / Discord / webhook)</h3>
          <NotifyPanel />
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
