import { unseal } from '@/lib/cookies';
import { type PlatformKey, type StoredToken, setToken } from '@/lib/platformTokens';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Move the cookie-sealed platform tokens into KV under the user's sync token.
// This makes them available to the cron job. Requires:
//   - x-cv-sync-token header (the user's opaque sync token, 16+ chars)
//   - Active OAuth cookies for the platforms they want to link.

const COOKIE_FIELD: Record<PlatformKey, string> = {
  linkedin: 'cv_li',
  x: 'cv_x',
  instagram: 'cv_ig',
  facebook: 'cv_fb',
  ga4: 'cv_ga4',
};

interface SealedLinkedIn {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  sub: string;
  name?: string;
}
interface SealedX {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userId: string;
  username?: string;
}
interface SealedMeta {
  accessToken: string;
  expiresAt: number;
  userId: string;
  pageId?: string;
  igAccountId?: string;
  pageAccessToken?: string;
  name?: string;
}

function extractCookie(cookies: string, field: string): string | undefined {
  const m = cookies.match(new RegExp(`${field}=([^;]+)`));
  return m?.[1];
}

export async function POST(req: Request) {
  const syncToken = req.headers.get('x-cv-sync-token');
  if (!syncToken || syncToken.length < 16) {
    return NextResponse.json({ error: 'x-cv-sync-token required (16+ chars).' }, { status: 401 });
  }
  const cookies = req.headers.get('cookie') ?? '';

  const linked: PlatformKey[] = [];
  const skipped: PlatformKey[] = [];

  for (const platform of Object.keys(COOKIE_FIELD) as PlatformKey[]) {
    const sealed = extractCookie(cookies, COOKIE_FIELD[platform]);
    if (!sealed) {
      skipped.push(platform);
      continue;
    }
    const u = unseal<SealedLinkedIn | SealedX | SealedMeta>(sealed);
    if (!u) {
      skipped.push(platform);
      continue;
    }
    const stored: StoredToken = {
      accessToken: u.accessToken,
      refreshToken: 'refreshToken' in u ? u.refreshToken : undefined,
      expiresAt: u.expiresAt,
      meta:
        platform === 'linkedin'
          ? { sub: (u as SealedLinkedIn).sub, name: (u as SealedLinkedIn).name }
          : platform === 'x'
            ? {
                userId: (u as SealedX).userId,
                username: (u as SealedX).username,
              }
            : {
                userId: (u as SealedMeta).userId,
                pageId: (u as SealedMeta).pageId,
                igAccountId: (u as SealedMeta).igAccountId,
                pageAccessToken: (u as SealedMeta).pageAccessToken,
                name: (u as SealedMeta).name,
              },
    };
    await setToken(syncToken, platform, stored);
    linked.push(platform);
  }

  return NextResponse.json({ linked, skipped });
}
