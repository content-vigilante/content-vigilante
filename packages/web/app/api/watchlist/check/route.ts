import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface WatchTarget {
  id: string;
  label: string;
  url: string;
}

interface CheckResult {
  id: string;
  label: string;
  url: string;
  ok: boolean;
  status?: number;
  hash?: string;
  excerpt?: string;
  error?: string;
}

function strip(html: string): string {
  // Strip scripts/styles, then tags. Best-effort, not for security.
  const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  const noStyles = noScripts.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const noTags = noStyles.replace(/<[^>]+>/g, ' ');
  return noTags.replace(/\s+/g, ' ').trim();
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { targets?: WatchTarget[] } | null;
  if (!body?.targets?.length) {
    return NextResponse.json({ error: 'targets array required.' }, { status: 400 });
  }
  const out: CheckResult[] = [];
  for (const t of body.targets.slice(0, 30)) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(t.url, {
        signal: ctrl.signal,
        headers: { 'user-agent': 'ContentVigilanteWatch/1.0 (+https://contentvigilante.com)' },
      });
      clearTimeout(timer);
      if (!res.ok) {
        out.push({ id: t.id, label: t.label, url: t.url, ok: false, status: res.status });
        continue;
      }
      const html = await res.text();
      const text = strip(html);
      const hash = createHash('sha1').update(text).digest('hex').slice(0, 16);
      out.push({
        id: t.id,
        label: t.label,
        url: t.url,
        ok: true,
        status: res.status,
        hash,
        excerpt: text.slice(0, 320),
      });
    } catch (err) {
      out.push({
        id: t.id,
        label: t.label,
        url: t.url,
        ok: false,
        error: (err as Error).message,
      });
    }
  }
  return NextResponse.json({ checks: out, ranAt: new Date().toISOString() });
}
