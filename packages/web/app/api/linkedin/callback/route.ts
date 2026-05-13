import { COOKIE_OPTS, seal } from '@/lib/cookies';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface UserInfo {
  sub: string;
  name?: string;
  email?: string;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = req.headers.get('cookie')?.match(/cv_li_state=([^;]+)/)?.[1];
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(`${url.origin}/dashboard/settings?linkedin=denied`);
  }
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${url.origin}/dashboard/settings?linkedin=unconfigured`);
  }
  const redirectUri = `${url.origin}/api/linkedin/callback`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${url.origin}/dashboard/settings?linkedin=token_error`);
  }
  const tokens = (await tokenRes.json()) as TokenResponse;

  const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  const me = meRes.ok ? ((await meRes.json()) as UserInfo) : ({ sub: 'unknown' } as UserInfo);

  const sealed = seal({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    sub: me.sub,
    name: me.name ?? '',
  });

  const res = NextResponse.redirect(`${url.origin}/dashboard/settings?linkedin=connected`);
  res.cookies.set('cv_li', sealed, COOKIE_OPTS);
  res.cookies.delete('cv_li_state');
  return res;
}
