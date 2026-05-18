'use client';

import { CheckCircle2, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Pill } from './ui';

interface Status {
  ga4: { configured: boolean; connected: boolean };
  linkedin: { configured: boolean; connected: boolean; name?: string | null };
  x: { configured: boolean; connected: boolean; name?: string | null };
  facebook: { configured: boolean; connected: boolean; name?: string | null };
  instagram: { configured: boolean; connected: boolean; name?: string | null };
}

export function Connections() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch('/api/connections/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) {
    return <div className="text-xs text-[var(--color-fg-muted)]">Checking integrations…</div>;
  }

  return (
    <div className="space-y-3">
      <Row
        name="Google Analytics (GA4)"
        configured={status.ga4.configured}
        connected={status.ga4.connected}
        connectHref="/api/ga4/connect"
        envVars={['GA4_CLIENT_ID', 'GA4_CLIENT_SECRET']}
      />
      <Row
        name="LinkedIn"
        configured={status.linkedin.configured}
        connected={status.linkedin.connected}
        accountName={status.linkedin.name ?? undefined}
        connectHref="/api/linkedin/connect"
        envVars={['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET']}
      />
      <Row
        name="X (Twitter)"
        configured={status.x.configured}
        connected={status.x.connected}
        accountName={status.x.name ?? undefined}
        connectHref="/api/x/connect"
        envVars={['X_CLIENT_ID', 'X_CLIENT_SECRET']}
      />
      <Row
        name="Facebook Page"
        configured={status.facebook.configured}
        connected={status.facebook.connected}
        accountName={status.facebook.name ?? undefined}
        connectHref="/api/meta/connect"
        envVars={['META_CLIENT_ID', 'META_CLIENT_SECRET']}
      />
      <Row
        name="Instagram (business)"
        configured={status.instagram.configured}
        connected={status.instagram.connected}
        accountName={status.instagram.name ?? undefined}
        connectHref="/api/meta/connect"
        envVars={['META_CLIENT_ID', 'META_CLIENT_SECRET']}
      />
    </div>
  );
}

function Row({
  name,
  configured,
  connected,
  connectHref,
  envVars,
  accountName,
}: {
  name: string;
  configured: boolean;
  connected: boolean;
  connectHref: string;
  envVars: string[];
  accountName?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          {name}
          {connected && (
            <Pill tone="good">
              <CheckCircle2 className="mr-1 inline h-3 w-3" /> connected
            </Pill>
          )}
          {accountName && (
            <span className="text-xs text-[var(--color-fg-muted)]">{accountName}</span>
          )}
        </div>
        {!configured && (
          <div className="mt-1 text-[11px] text-[var(--color-fg-muted)]">
            Set env vars on Vercel to enable: <code>{envVars.join(', ')}</code>
          </div>
        )}
      </div>
      {configured && !connected && (
        <Button onClick={() => (window.location.href = connectHref)} variant="outline">
          Connect <ExternalLink className="h-3 w-3" />
        </Button>
      )}
      {!configured && <Pill tone="warn">not configured</Pill>}
    </div>
  );
}
