import { NextResponse } from 'next/server';
import { unseal } from '@/lib/cookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') ?? '';
  const ga4 = unseal<{ accessToken: string; expiresAt: number }>(
    cookie.match(/cv_ga4=([^;]+)/)?.[1],
  );
  const li = unseal<{ accessToken: string; expiresAt: number; name?: string }>(
    cookie.match(/cv_li=([^;]+)/)?.[1],
  );
  const x = unseal<{ accessToken: string; expiresAt: number; username?: string }>(
    cookie.match(/cv_x=([^;]+)/)?.[1],
  );
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
    sync: {
      kv: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
    },
  });
}
