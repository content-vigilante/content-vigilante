import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const clientId = process.env.GA4_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'GA4 not configured. Set GA4_CLIENT_ID and GA4_CLIENT_SECRET env vars.' },
      { status: 503 },
    );
  }
  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/ga4/callback`;
  const state = randomBytes(16).toString('base64url');

  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set(
    'scope',
    'https://www.googleapis.com/auth/analytics.readonly',
  );
  auth.searchParams.set('access_type', 'offline');
  auth.searchParams.set('prompt', 'consent');
  auth.searchParams.set('state', state);

  const res = NextResponse.redirect(auth.toString());
  res.cookies.set('cv_ga4_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
