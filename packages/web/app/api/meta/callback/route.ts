import { COOKIE_OPTS, seal } from '@/lib/cookies';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  token_type?: string;
}

interface Me {
  id: string;
  name?: string;
}

interface PagesResponse {
  data: Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string };
  }>;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = req.headers.get('cookie')?.match(/cv_meta_state=([^;]+)/)?.[1];
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(`${url.origin}/dashboard/settings?meta=denied`);
  }
  const clientId = process.env.META_CLIENT_ID;
  const clientSecret = process.env.META_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${url.origin}/dashboard/settings?meta=unconfigured`);
  }
  const redirectUri = `${url.origin}/api/meta/callback`;

  // Exchange code for short-lived user token, then for long-lived (60d).
  const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', clientId);
  tokenUrl.searchParams.set('client_secret', clientSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);
  const tokenRes = await fetch(tokenUrl);
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${url.origin}/dashboard/settings?meta=token_error`);
  }
  const short = (await tokenRes.json()) as TokenResponse;

  const longUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
  longUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longUrl.searchParams.set('client_id', clientId);
  longUrl.searchParams.set('client_secret', clientSecret);
  longUrl.searchParams.set('fb_exchange_token', short.access_token);
  const longRes = await fetch(longUrl);
  const long = longRes.ok ? ((await longRes.json()) as TokenResponse) : short;
  const expiresIn = long.expires_in ?? 60 * 24 * 60 * 60; // 60 days fallback

  // User info.
  const meRes = await fetch(
    `https://graph.facebook.com/v20.0/me?access_token=${long.access_token}`,
  );
  const me = (meRes.ok ? await meRes.json() : { id: 'unknown' }) as Me;

  // First page + IG business account on that page.
  const pagesRes = await fetch(
    `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${long.access_token}`,
  );
  const pages = (pagesRes.ok ? await pagesRes.json() : { data: [] }) as PagesResponse;
  const page = pages.data[0];

  const baseMeta = {
    accessToken: long.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
    userId: me.id,
    name: me.name,
    pageId: page?.id,
    pageAccessToken: page?.access_token,
    igAccountId: page?.instagram_business_account?.id,
  };

  const res = NextResponse.redirect(`${url.origin}/dashboard/settings?meta=connected`);
  // Two cookies so the existing /api/connections/status logic can show each separately.
  res.cookies.set('cv_fb', seal(baseMeta), COOKIE_OPTS);
  if (baseMeta.igAccountId) {
    res.cookies.set('cv_ig', seal(baseMeta), COOKIE_OPTS);
  }
  res.cookies.delete('cv_meta_state');
  return res;
}
