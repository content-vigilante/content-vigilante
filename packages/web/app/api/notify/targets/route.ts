import { type NotificationTarget, broadcast, listTargets, writeTargets } from '@/lib/notify';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tok(req: Request): string | null {
  const t = req.headers.get('x-cv-sync-token');
  return t && t.length >= 16 ? t : null;
}

export async function GET(req: Request) {
  const t = tok(req);
  if (!t) return NextResponse.json({ error: 'x-cv-sync-token required.' }, { status: 401 });
  return NextResponse.json({ targets: await listTargets(t) });
}

export async function POST(req: Request) {
  const t = tok(req);
  if (!t) return NextResponse.json({ error: 'x-cv-sync-token required.' }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    targets?: NotificationTarget[];
    test?: boolean;
  } | null;
  if (!body?.targets || !Array.isArray(body.targets)) {
    return NextResponse.json({ error: 'targets array required.' }, { status: 400 });
  }
  await writeTargets(t, body.targets);
  if (body.test) {
    await broadcast(t, {
      type: 'post.published',
      title: 'Content Vigilante test notification',
      detail: 'If you see this in your channel, the wiring is live.',
      tags: ['test', new Date().toISOString().slice(0, 10)],
    });
  }
  return NextResponse.json({ saved: body.targets.length, tested: !!body.test });
}
