import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cross-device sync. Adapter pattern — current adapter: in-memory (dev only).
 *
 * To make this production-grade, wire one of:
 *   1. Vercel KV       — set KV_REST_API_URL + KV_REST_API_TOKEN, swap adapter for @vercel/kv.
 *   2. Postgres        — set DATABASE_URL, use drizzle-orm.
 *   3. SQLite/Turso    — set TURSO_URL + TURSO_AUTH_TOKEN, use @libsql/client.
 *
 * The contract below is stable; only the storage adapter changes.
 *
 * Auth model (v1.1): user provides their own opaque sync token via header
 * `x-cv-sync-token`. They paste the same token on every device. No accounts,
 * no email/password. For "real" auth wire NextAuth on top.
 */

const memory = new Map<string, { data: unknown; updatedAt: string }>();

interface SyncBody {
  data: unknown;
}

function token(req: Request): string | null {
  const t = req.headers.get('x-cv-sync-token');
  if (!t || t.length < 16) return null;
  return t;
}

export async function GET(req: Request) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'x-cv-sync-token header required (min 16 chars).' }, { status: 401 });
  const entry = memory.get(t);
  if (!entry) return NextResponse.json({ data: null, updatedAt: null });
  return NextResponse.json(entry);
}

export async function POST(req: Request) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'x-cv-sync-token header required (min 16 chars).' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as SyncBody | null;
  if (!body || typeof body.data === 'undefined') {
    return NextResponse.json({ error: 'data field required.' }, { status: 400 });
  }
  const entry = { data: body.data, updatedAt: new Date().toISOString() };
  memory.set(t, entry);
  return NextResponse.json(entry);
}
