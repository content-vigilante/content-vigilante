import { NextResponse } from 'next/server';
import { seal, COOKIE_OPTS } from '@/lib/cookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = req.headers
    .get('cookie')
    ?.match(/cv_ga4_state=([^;]+)/)?.[1];

  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(`${url.origin}/dashboard/analytics?ga4=denied`);
  }

  const clientId = process.env.GA4_CLIENT_ID;
  const clientSecret = process.env.GA4_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${url.origin}/dashboard/analytics?ga4=unconfigured`);
  }

  const redirectUri = `${url.origin}/api/ga4/callback`;
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${url.origin}/dashboard/analytics?ga4=token_error`);
  }
  const tokens = (await tokenRes.json()) as TokenResponse;
  const sealed = seal({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });

  const res = NextResponse.redirect(`${url.origin}/dashboard/analytics?ga4=connected`);
  res.cookies.set('cv_ga4', sealed, COOKIE_OPTS);
  res.cookies.delete('cv_ga4_state');
  return res;
}
