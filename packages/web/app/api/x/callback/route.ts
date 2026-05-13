import { COOKIE_OPTS, seal } from '@/lib/cookies';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface MeResponse {
  data?: { id: string; name?: string; username?: string };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = req.headers.get('cookie') ?? '';
  const cookieState = cookies.match(/cv_x_state=([^;]+)/)?.[1];
  const verifier = cookies.match(/cv_x_verifier=([^;]+)/)?.[1];

  if (!code || !state || state !== cookieState || !verifier) {
    return NextResponse.redirect(`${url.origin}/dashboard/settings?x=denied`);
  }
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId) {
    return NextResponse.redirect(`${url.origin}/dashboard/settings?x=unconfigured`);
  }
  const redirectUri = `${url.origin}/api/x/callback`;

  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const auth = clientSecret
    ? `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    : '';

  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...(auth ? { authorization: auth } : {}),
    },
    body,
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${url.origin}/dashboard/settings?x=token_error`);
  }
  const tokens = (await tokenRes.json()) as TokenResponse;

  const meRes = await fetch('https://api.twitter.com/2/users/me', {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  const me = meRes.ok ? ((await meRes.json()) as MeResponse) : ({} as MeResponse);

  const sealed = seal({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    userId: me.data?.id ?? '',
    username: me.data?.username ?? '',
  });

  const res = NextResponse.redirect(`${url.origin}/dashboard/settings?x=connected`);
  res.cookies.set('cv_x', sealed, COOKIE_OPTS);
  res.cookies.delete('cv_x_state');
  res.cookies.delete('cv_x_verifier');
  return res;
}
