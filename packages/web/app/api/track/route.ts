import { getSyncStore } from '@/lib/syncStore';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Hit {
  id: string;
  path: string;
  referrer: string | null;
  utm: Record<string, string>;
  channel: string;
  ts: string;
  uaHint: string;
}

function classify(referrer: string | null, utm: Record<string, string>): string {
  if (utm.utm_source) return `paid:${utm.utm_source}`;
  if (!referrer) return 'dark-social';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (/google|bing|duckduckgo|baidu/.test(host)) return 'search';
    if (
      /(twitter|x\.com|linkedin|facebook|instagram|reddit|youtube|tiktok|threads|mastodon)/.test(
        host,
      )
    )
      return `social:${host.split('.')[0]}`;
    return `referral:${host}`;
  } catch {
    return 'dark-social';
  }
}

const KEY = 'cv:track';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    path?: string;
    referrer?: string | null;
    utm?: Record<string, string>;
  };
  const hit: Hit = {
    id: `h${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    path: body.path ?? '/',
    referrer: body.referrer ?? null,
    utm: body.utm ?? {},
    channel: classify(body.referrer ?? null, body.utm ?? {}),
    ts: new Date().toISOString(),
    uaHint: (req.headers.get('user-agent') ?? '').slice(0, 80),
  };

  // Best-effort: keep a rolling window of the last 1000 hits.
  try {
    const store = await getSyncStore();
    const existing = await store.get(KEY);
    const list = ((existing?.data as Hit[]) ?? []).slice(-999);
    list.push(hit);
    await store.set(KEY, list);
  } catch {
    /* swallow */
  }
  return NextResponse.json({ ok: true, channel: hit.channel });
}

export async function GET() {
  const store = await getSyncStore();
  const entry = await store.get(KEY);
  const hits = (entry?.data as Hit[] | undefined) ?? [];
  const by: Record<string, number> = {};
  for (const h of hits) by[h.channel] = (by[h.channel] ?? 0) + 1;
  return NextResponse.json({
    total: hits.length,
    byChannel: by,
    recent: hits.slice(-20).reverse(),
  });
}
