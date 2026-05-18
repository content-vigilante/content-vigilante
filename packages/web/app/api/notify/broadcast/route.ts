import { broadcast } from '@/lib/notify';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const syncToken = req.headers.get('x-cv-sync-token');
  if (!syncToken || syncToken.length < 16) {
    return NextResponse.json({ error: 'x-cv-sync-token required.' }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    type?: string;
    title?: string;
    detail?: string;
    url?: string;
    tags?: string[];
  } | null;
  if (!body?.type || !body.title) {
    return NextResponse.json({ error: 'type + title required.' }, { status: 400 });
  }
  const out = await broadcast(syncToken, {
    type: body.type as Parameters<typeof broadcast>[1]['type'],
    title: body.title,
    detail: body.detail,
    url: body.url,
    tags: body.tags,
  });
  return NextResponse.json(out);
}
