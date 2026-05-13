import { NextResponse } from 'next/server';
import { getSyncStore } from '@/lib/syncStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const store = await getSyncStore();
  const entry = await store.get(t);
  if (!entry) return NextResponse.json({ data: null, updatedAt: null, adapter: store.kind });
  return NextResponse.json({ ...entry, adapter: store.kind });
}

export async function POST(req: Request) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'x-cv-sync-token header required (min 16 chars).' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as SyncBody | null;
  if (!body || typeof body.data === 'undefined') {
    return NextResponse.json({ error: 'data field required.' }, { status: 400 });
  }
  const store = await getSyncStore();
  const entry = await store.set(t, body.data);
  return NextResponse.json({ ...entry, adapter: store.kind });
}

export async function DELETE(req: Request) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'x-cv-sync-token header required.' }, { status: 401 });
  const store = await getSyncStore();
  await store.delete(t);
  return NextResponse.json({ ok: true, adapter: store.kind });
}
