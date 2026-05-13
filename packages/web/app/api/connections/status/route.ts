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
  });
}
