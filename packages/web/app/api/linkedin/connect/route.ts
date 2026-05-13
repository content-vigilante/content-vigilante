import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'LinkedIn not configured. Set LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET.' },
      { status: 503 },
    );
  }
  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/linkedin/callback`;
  const state = randomBytes(16).toString('base64url');

  const auth = new URL('https://www.linkedin.com/oauth/v2/authorization');
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('state', state);
  auth.searchParams.set('scope', 'openid profile w_member_social');

  const res = NextResponse.redirect(auth.toString());
  res.cookies.set('cv_li_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
