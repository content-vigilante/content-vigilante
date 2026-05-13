import { COOKIE_OPTS, seal, unseal } from '@/lib/cookies';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Token {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

async function refresh(token: Token): Promise<Token | null> {
  if (!token.refreshToken) return null;
  const clientId = process.env.GA4_CLIENT_ID;
  const clientSecret = process.env.GA4_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const body = new URLSearchParams({
    refresh_token: token.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: json.access_token,
    refreshToken: token.refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export async function POST(req: Request) {
  const cookieMatch = req.headers.get('cookie')?.match(/cv_ga4=([^;]+)/);
  let token = unseal<Token>(cookieMatch?.[1]);
  if (!token) {
    return NextResponse.json(
      { error: 'Not connected. Visit /api/ga4/connect first.' },
      { status: 401 },
    );
  }

  const { propertyId, dateRange = '30daysAgo' } = (await req.json().catch(() => ({}))) as {
    propertyId?: string;
    dateRange?: string;
  };
  if (!propertyId) {
    return NextResponse.json(
      { error: 'propertyId required (e.g. "properties/12345").' },
      { status: 400 },
    );
  }

  let refreshed: Token | null = null;
  if (Date.now() > token.expiresAt - 60_000) {
    refreshed = await refresh(token);
    if (refreshed) token = refreshed;
  }

  const reportRes = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: dateRange, endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
        ],
      }),
    },
  );

  if (!reportRes.ok) {
    const err = await reportRes.text();
    return NextResponse.json({ error: `GA4 report failed: ${err.slice(0, 300)}` }, { status: 502 });
  }
  const report = await reportRes.json();
  const res = NextResponse.json({ report });
  if (refreshed) {
    res.cookies.set('cv_ga4', seal(refreshed), COOKIE_OPTS);
  }
  return res;
}
