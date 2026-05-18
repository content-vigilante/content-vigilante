'use client';

import { Link2, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Pill } from './ui';

interface Session {
  user?: { name?: string | null; email?: string | null; id?: string };
}

export function AccountPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkResult, setLinkResult] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then(setSession)
      .catch(() => setSession({}));
  }, []);

  async function linkPlatformsToAccount() {
    const tok = localStorage.getItem('cv:syncToken') ?? '';
    if (tok.length < 16) {
      setLinkResult('Set a 16+ char sync token in the panel above first.');
      return;
    }
    setLinkBusy(true);
    setLinkResult(null);
    try {
      const res = await fetch('/api/account/link', {
        method: 'POST',
        headers: { 'x-cv-sync-token': tok },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'link failed');
      setLinkResult(
        `Linked: ${json.linked.join(', ') || 'none'}${
          json.skipped.length ? ` · skipped: ${json.skipped.join(', ')}` : ''
        }`,
      );
    } catch (err) {
      setLinkResult((err as Error).message);
    } finally {
      setLinkBusy(false);
    }
  }

  const signedIn = !!session?.user?.email;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {signedIn ? (
          <>
            <Pill tone="good">
              <ShieldCheck className="mr-1 inline h-3 w-3" />
              {session?.user?.email}
            </Pill>
            <a
              href="/api/auth/signout"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-bg-elev)]"
            >
              <LogOut className="h-3 w-3" /> Sign out
            </a>
          </>
        ) : (
          <a
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-cv-ink)] px-3 py-1.5 text-sm font-medium text-white"
          >
            <LogIn className="h-4 w-4" /> Sign in with Google
          </a>
        )}
      </div>
      <div className="text-[11px] text-[var(--color-fg-muted)]">
        Optional. NextAuth (Google) only activates when <code>AUTH_SECRET</code>,{' '}
        <code>AUTH_GOOGLE_ID</code>, <code>AUTH_GOOGLE_SECRET</code> are set on Vercel. The
        sync-token model below still works without sign-in.
      </div>

      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-3">
        <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
          <Link2 className="h-4 w-4" />
          Link platform connections to my account
        </div>
        <p className="mb-2 text-[11px] text-[var(--color-fg-muted)]">
          Moves your cookie-sealed OAuth tokens (LinkedIn / X / Meta / GA4) into KV under your sync
          token. The Vercel cron uses these tokens to publish scheduled posts even when no browser
          is open.
        </p>
        <Button onClick={linkPlatformsToAccount} variant="outline">
          {linkBusy ? 'Linking…' : 'Link now'}
        </Button>
        {linkResult && (
          <div className="mt-2 text-[11px] text-[var(--color-fg-muted)]">{linkResult}</div>
        )}
      </div>
    </div>
  );
}
