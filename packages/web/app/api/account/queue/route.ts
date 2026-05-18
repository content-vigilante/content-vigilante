import { type ScheduledPost, readUser, writeUser } from '@/lib/platformTokens';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface QueueBody {
  posts: ScheduledPost[];
}

export async function POST(req: Request) {
  const syncToken = req.headers.get('x-cv-sync-token');
  if (!syncToken || syncToken.length < 16) {
    return NextResponse.json({ error: 'x-cv-sync-token required (16+ chars).' }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as QueueBody | null;
  if (!body?.posts || !Array.isArray(body.posts)) {
    return NextResponse.json({ error: 'posts array required.' }, { status: 400 });
  }
  const blob = await readUser(syncToken);
  // De-dup by id.
  const seen = new Set(blob.queue.map((p) => p.id));
  for (const p of body.posts) {
    if (!seen.has(p.id) && !p.publishedAt) {
      blob.queue.push(p);
      seen.add(p.id);
    }
  }
  await writeUser(syncToken, blob);
  return NextResponse.json({ queued: blob.queue.filter((p) => !p.publishedAt).length });
}

export async function GET(req: Request) {
  const syncToken = req.headers.get('x-cv-sync-token');
  if (!syncToken || syncToken.length < 16) {
    return NextResponse.json({ error: 'x-cv-sync-token required.' }, { status: 401 });
  }
  const blob = await readUser(syncToken);
  return NextResponse.json({ queue: blob.queue, tokens: Object.keys(blob.tokens) });
}
