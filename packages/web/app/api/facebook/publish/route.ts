import { unseal } from '@/lib/cookies';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Token {
  accessToken: string;
  expiresAt: number;
  pageId?: string;
  pageAccessToken?: string;
  name?: string;
}

export async function POST(req: Request) {
  const cookieMatch = req.headers.get('cookie')?.match(/cv_fb=([^;]+)/);
  const token = unseal<Token>(cookieMatch?.[1]);
  if (!token) {
    return NextResponse.json({ error: 'Not connected. Visit /api/meta/connect.' }, { status: 401 });
  }
  if (!token.pageId) {
    return NextResponse.json(
      { error: 'No Facebook Page linked to this account. Create one and reconnect.' },
      { status: 400 },
    );
  }
  if (Date.now() > token.expiresAt) {
    return NextResponse.json({ error: 'Token expired. Reconnect Meta.' }, { status: 401 });
  }
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text required.' }, { status: 400 });
  }
  const params = new URLSearchParams({
    message: text,
    access_token: token.pageAccessToken ?? token.accessToken,
  });
  const res = await fetch(`https://graph.facebook.com/v20.0/${token.pageId}/feed`, {
    method: 'POST',
    body: params,
  });
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json(
      { error: `Facebook publish failed: ${err.slice(0, 400)}` },
      { status: 502 },
    );
  }
  const json = (await res.json()) as { id?: string };
  return NextResponse.json({ ok: true, id: json.id ?? null });
}
