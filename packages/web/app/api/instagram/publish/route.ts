import { unseal } from '@/lib/cookies';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Token {
  accessToken: string;
  expiresAt: number;
  igAccountId?: string;
  pageAccessToken?: string;
}

// Instagram Graph requires media. caller passes a public imageUrl (or videoUrl).
export async function POST(req: Request) {
  const cookieMatch = req.headers.get('cookie')?.match(/cv_ig=([^;]+)/);
  const token = unseal<Token>(cookieMatch?.[1]);
  if (!token) {
    return NextResponse.json({ error: 'Not connected. Visit /api/meta/connect.' }, { status: 401 });
  }
  if (!token.igAccountId) {
    return NextResponse.json(
      { error: 'No Instagram Business account on the connected Page.' },
      { status: 400 },
    );
  }
  if (Date.now() > token.expiresAt) {
    return NextResponse.json({ error: 'Token expired. Reconnect Meta.' }, { status: 401 });
  }
  const { text, imageUrl, videoUrl } = (await req.json().catch(() => ({}))) as {
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
  };
  if (!imageUrl && !videoUrl) {
    return NextResponse.json(
      { error: 'Instagram requires imageUrl or videoUrl (publicly reachable).' },
      { status: 400 },
    );
  }
  const access = token.pageAccessToken ?? token.accessToken;

  // 1. Create media container.
  const createParams = new URLSearchParams({
    access_token: access,
    caption: text ?? '',
    ...(videoUrl ? { media_type: 'REELS', video_url: videoUrl } : { image_url: imageUrl ?? '' }),
  });
  const createRes = await fetch(`https://graph.facebook.com/v20.0/${token.igAccountId}/media`, {
    method: 'POST',
    body: createParams,
  });
  if (!createRes.ok) {
    return NextResponse.json(
      { error: `IG create failed: ${(await createRes.text()).slice(0, 400)}` },
      { status: 502 },
    );
  }
  const created = (await createRes.json()) as { id: string };

  // 2. Publish the container.
  const pubRes = await fetch(
    `https://graph.facebook.com/v20.0/${token.igAccountId}/media_publish`,
    {
      method: 'POST',
      body: new URLSearchParams({ access_token: access, creation_id: created.id }),
    },
  );
  if (!pubRes.ok) {
    return NextResponse.json(
      { error: `IG publish failed: ${(await pubRes.text()).slice(0, 400)}` },
      { status: 502 },
    );
  }
  const pub = (await pubRes.json()) as { id?: string };
  return NextResponse.json({ ok: true, id: pub.id ?? null });
}
