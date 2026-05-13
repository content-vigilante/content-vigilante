import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function base64url(buf: Buffer): string {
  return buf.toString('base64url');
}

export async function GET(req: Request) {
  const clientId = process.env.X_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'X not configured. Set X_CLIENT_ID and X_CLIENT_SECRET env vars.' },
      { status: 503 },
    );
  }
  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/x/callback`;
  const state = base64url(randomBytes(16));
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());

  const auth = new URL('https://twitter.com/i/oauth2/authorize');
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
  auth.searchParams.set('state', state);
  auth.searchParams.set('code_challenge', challenge);
  auth.searchParams.set('code_challenge_method', 'S256');

  const res = NextResponse.redirect(auth.toString());
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600,
  };
  res.cookies.set('cv_x_state', state, opts);
  res.cookies.set('cv_x_verifier', verifier, opts);
  return res;
}
