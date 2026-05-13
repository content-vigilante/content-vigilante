'use client';

import { Cloud, CloudDownload, CloudUpload, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Pill } from './ui';

const SYNC_KEYS = ['posts', 'leads', 'workspaces', 'activeWs', 'customGuide'];

function randomToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function readSnapshot(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of SYNC_KEYS) {
    const raw = localStorage.getItem(`cv:store:${k}`);
    if (raw) {
      try {
        out[k] = JSON.parse(raw);
      } catch {
        /* skip */
      }
    }
  }
  return out;
}

function writeSnapshot(data: Record<string, unknown>) {
  for (const k of SYNC_KEYS) {
    if (k in data) {
      localStorage.setItem(`cv:store:${k}`, JSON.stringify(data[k]));
      window.dispatchEvent(new CustomEvent(`cv:store:${k}`));
    }
  }
}

export function SyncPanel() {
  const [tok, setTok] = useState('');
  const [busy, setBusy] = useState<'push' | 'pull' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [adapter, setAdapter] = useState<string | null>(null);

  useEffect(() => {
    setTok(localStorage.getItem('cv:syncToken') ?? '');
    setLastSync(localStorage.getItem('cv:lastSync'));
  }, []);

  function saveToken(v: string) {
    setTok(v);
    localStorage.setItem('cv:syncToken', v);
  }

  async function push() {
    if (tok.length < 16) {
      setMsg('Token must be at least 16 chars.');
      return;
    }
    setBusy('push');
    setMsg(null);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-cv-sync-token': tok },
        body: JSON.stringify({ data: readSnapshot() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Push failed.');
      const now = new Date().toISOString();
      localStorage.setItem('cv:lastSync', now);
      setLastSync(now);
      setAdapter(json.adapter ?? null);
      setMsg(`Pushed ✓ (${json.adapter})`);
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function pull() {
    if (tok.length < 16) {
      setMsg('Token must be at least 16 chars.');
      return;
    }
    setBusy('pull');
    setMsg(null);
    try {
      const res = await fetch('/api/sync', {
        headers: { 'x-cv-sync-token': tok },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Pull failed.');
      if (!json.data) {
        setMsg('Nothing to pull yet.');
      } else {
        writeSnapshot(json.data as Record<string, unknown>);
        setMsg(`Pulled snapshot from ${new Date(json.updatedAt).toLocaleString()}`);
        setAdapter(json.adapter ?? null);
      }
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={tok}
          onChange={(e) => saveToken(e.target.value)}
          placeholder="Your sync token (16+ chars, same on every device)"
          className="min-w-[280px] flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <Button onClick={() => saveToken(randomToken())} variant="ghost">
          Generate
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={push} variant="outline">
          {busy === 'push' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CloudUpload className="h-4 w-4" />
          )}
          Push to cloud
        </Button>
        <Button onClick={pull} variant="outline">
          {busy === 'pull' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CloudDownload className="h-4 w-4" />
          )}
          Pull from cloud
        </Button>
        {adapter && (
          <Pill tone={adapter === 'kv' ? 'good' : 'warn'}>
            <Cloud className="mr-1 inline h-3 w-3" />
            {adapter === 'kv' ? 'Vercel KV' : 'in-memory (dev only)'}
          </Pill>
        )}
      </div>

      {lastSync && (
        <div className="text-xs text-[var(--color-fg-muted)]">
          Last sync: {new Date(lastSync).toLocaleString()}
        </div>
      )}
      {msg && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-2 text-xs">
          {msg}
        </div>
      )}
      <div className="text-[11px] text-[var(--color-fg-muted)]">
        Paste the same token on each device to sync your posts, leads, workspaces, and brand
        guide. No accounts. Tokens are opaque — keep yours secret.
      </div>
    </div>
  );
}
