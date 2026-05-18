import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
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

const MAX_URL_LENGTH = 2048;

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  const a = parts[0]!;
  const b = parts[1]!;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function isPrivateIPv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const firstHextet = Number.parseInt(normalized.split(':', 1)[0] ?? '', 16);
  const isLinkLocal = !Number.isNaN(firstHextet) && firstHextet >= 0xfe80 && firstHextet <= 0xfebf;
  const isSiteLocal = !Number.isNaN(firstHextet) && firstHextet >= 0xfec0 && firstHextet <= 0xfeff;

  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    isLinkLocal ||
    isSiteLocal
  );
}

function isPrivateAddress(hostname: string): boolean {
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) return isPrivateIPv4(hostname);
  if (ipVersion === 6) return isPrivateIPv6(hostname);
  return false;
}

async function assertSafeTarget(target: string): Promise<URL> {
  if (target.length > MAX_URL_LENGTH) {
    throw new Error('URL too long.');
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    throw new Error(`Invalid URL: "${target}".`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol: "${parsed.protocol}"`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error(`Refusing to fetch local or private URL host: "${parsed.hostname}"`);
  }

  if (isPrivateAddress(hostname)) {
    throw new Error(`Refusing to fetch private network address: "${parsed.hostname}"`);
  }

  if (isIP(hostname)) return parsed;

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (addresses.some((address) => isPrivateAddress(address.address))) {
      throw new Error(`Refusing to fetch private network host: "${parsed.hostname}"`);
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code && code !== 'ENOTFOUND' && code !== 'EAI_AGAIN') {
      throw new Error(`Could not resolve ${parsed.hostname}: ${(err as Error).message}`);
    }
  }

  return parsed;
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
      if (!t.url || typeof t.url !== 'string') {
        throw new Error('url required.');
      }
      const parsedURL = await assertSafeTarget(t.url);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(parsedURL.toString(), {
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
