import { unseal } from '@/lib/cookies';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Sealed {
  accessToken: string;
  expiresAt: number;
  name?: string;
  username?: string;
  pageId?: string;
  igAccountId?: string;
}

function parse(cookie: string, key: string): Sealed | null {
  const m = cookie.match(new RegExp(`${key}=([^;]+)`));
  return unseal<Sealed>(m?.[1]);
}

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';
  const ga4 = parse(cookie, 'cv_ga4');
  const li = parse(cookie, 'cv_li');
  const x = parse(cookie, 'cv_x');
  const fb = parse(cookie, 'cv_fb');
  const ig = parse(cookie, 'cv_ig');
  return NextResponse.json({
    ga4: {
      configured: !!process.env.GA4_CLIENT_ID,
      connected: !!ga4 && ga4.expiresAt > Date.now(),
    },
    linkedin: {
      configured: !!process.env.LINKEDIN_CLIENT_ID,
      connected: !!li && li.expiresAt > Date.now(),
      name: li?.name ?? null,
    },
    x: {
      configured: !!process.env.X_CLIENT_ID,
      connected: !!x && x.expiresAt > Date.now(),
      name: x?.username ? `@${x.username}` : null,
    },
    facebook: {
      configured: !!process.env.META_CLIENT_ID,
      connected: !!fb && fb.expiresAt > Date.now(),
      name: fb?.name ?? null,
      hasPage: !!fb?.pageId,
    },
    instagram: {
      configured: !!process.env.META_CLIENT_ID,
      connected: !!ig && ig.expiresAt > Date.now() && !!ig.igAccountId,
      name: ig?.name ?? null,
    },
    sync: {
      kv: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
    },
  });
}
