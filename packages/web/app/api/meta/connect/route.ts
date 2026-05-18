import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Combined Facebook + Instagram OAuth (Meta Graph). One flow grants pages_manage_posts
// (for Facebook page publishing) + instagram_basic + instagram_content_publish.
export async function GET(req: Request) {
  const clientId = process.env.META_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Meta not configured. Set META_CLIENT_ID and META_CLIENT_SECRET.' },
      { status: 503 },
    );
  }
  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/meta/callback`;
  const state = randomBytes(16).toString('base64url');

  const auth = new URL('https://www.facebook.com/v20.0/dialog/oauth');
  auth.searchParams.set('client_id', clientId);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('state', state);
  auth.searchParams.set(
    'scope',
    [
      'public_profile',
      'pages_show_list',
      'pages_manage_posts',
      'pages_read_engagement',
      'instagram_basic',
      'instagram_content_publish',
      'business_management',
    ].join(','),
  );

  const res = NextResponse.redirect(auth.toString());
  res.cookies.set('cv_meta_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
