import { unseal } from '@/lib/cookies';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Token {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userId: string;
  username?: string;
}

export async function POST(req: Request) {
  const cookieMatch = req.headers.get('cookie')?.match(/cv_x=([^;]+)/);
  const token = unseal<Token>(cookieMatch?.[1]);
  if (!token) {
    return NextResponse.json({ error: 'Not connected. Visit /api/x/connect.' }, { status: 401 });
  }
  if (Date.now() > token.expiresAt) {
    return NextResponse.json({ error: 'Token expired. Reconnect X.' }, { status: 401 });
  }
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text required.' }, { status: 400 });
  }
  if (text.length > 280) {
    return NextResponse.json({ error: `Tweet too long (${text.length}/280).` }, { status: 400 });
  }

  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `X publish failed: ${err.slice(0, 400)}` }, { status: 502 });
  }
  const json = (await res.json()) as { data?: { id: string } };
  return NextResponse.json({ ok: true, id: json.data?.id ?? null });
}
