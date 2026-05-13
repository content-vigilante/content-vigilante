import { unseal } from '@/lib/cookies';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Token {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  sub: string;
  name?: string;
}

export async function POST(req: Request) {
  const cookieMatch = req.headers.get('cookie')?.match(/cv_li=([^;]+)/);
  const token = unseal<Token>(cookieMatch?.[1]);
  if (!token) {
    return NextResponse.json(
      { error: 'Not connected. Visit /api/linkedin/connect first.' },
      { status: 401 },
    );
  }
  if (Date.now() > token.expiresAt) {
    return NextResponse.json({ error: 'Token expired. Reconnect LinkedIn.' }, { status: 401 });
  }

  const { text, visibility = 'PUBLIC' } = (await req.json().catch(() => ({}))) as {
    text?: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS';
  };
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required.' }, { status: 400 });
  }

  const payload = {
    author: `urn:li:person:${token.sub}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility,
    },
  };

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token.accessToken}`,
      'content-type': 'application/json',
      'x-restli-protocol-version': '2.0.0',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: `LinkedIn publish failed: ${err.slice(0, 400)}` },
      { status: 502 },
    );
  }
  const json = await res.json().catch(() => ({}));
  return NextResponse.json({ ok: true, id: (json as { id?: string }).id ?? null });
}
