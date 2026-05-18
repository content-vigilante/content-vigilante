'use client';

import { useEffect } from 'react';

const SYNC_KEYS = ['posts', 'leads', 'workspaces', 'activeWs', 'customGuide'];

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

/**
 * Mounts once at the dashboard root. If the user has set a sync token AND
 * auto-sync is enabled, any change to a synced key is pushed up after a 4s
 * debounce. The UI status is read by SyncPanel from `cv:lastSync`.
 */
export function AutoSync() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;

    async function flush() {
      const token = localStorage.getItem('cv:syncToken');
      const enabled = localStorage.getItem('cv:autoSync') === '1';
      if (!token || token.length < 16 || !enabled || inFlight) return;
      inFlight = true;
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-cv-sync-token': token },
          body: JSON.stringify({ data: readSnapshot() }),
        });
        if (res.ok) {
          localStorage.setItem('cv:lastSync', new Date().toISOString());
        }
      } catch {
        /* network — try again next tick */
      } finally {
        inFlight = false;
      }
    }

    function schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 4000);
    }

    const handlers = SYNC_KEYS.map((k) => {
      const ev = `cv:store:${k}`;
      const h = () => schedule();
      window.addEventListener(ev, h);
      return [ev, h] as const;
    });

    return () => {
      for (const [ev, h] of handlers) window.removeEventListener(ev, h);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
