import { broadcast } from '@/lib/notify';
import {
  type PlatformKey,
  type ScheduledPost,
  type StoredToken,
  listUsers,
  readUser,
  writeUser,
} from '@/lib/platformTokens';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Result {
  syncToken: string;
  platform: PlatformKey;
  postId: string;
  ok: boolean;
  error?: string;
}

async function publishLinkedIn(token: StoredToken, text: string): Promise<string | null> {
  const sub = (token.meta?.sub as string) || '';
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token.accessToken}`,
      'content-type': 'application/json',
      'x-restli-protocol-version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${sub}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  if (!res.ok) throw new Error(`linkedin ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return json.id ?? null;
}

async function publishX(token: StoredToken, text: string): Promise<string | null> {
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`x ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { data?: { id: string } };
  return json.data?.id ?? null;
}

async function publishFacebook(token: StoredToken, text: string): Promise<string | null> {
  const pageId = token.meta?.pageId as string | undefined;
  const pageAccessToken = (token.meta?.pageAccessToken as string | undefined) ?? token.accessToken;
  if (!pageId) throw new Error('facebook: pageId missing — relink the page');
  const params = new URLSearchParams({ message: text, access_token: pageAccessToken });
  const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
    method: 'POST',
    body: params,
  });
  if (!res.ok) throw new Error(`facebook ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { id?: string };
  return json.id ?? null;
}

async function publishInstagram(_token: StoredToken, _text: string): Promise<string | null> {
  // Instagram requires media. Without an image URL we can't publish from text alone.
  // Surface this so the cron logs explain why it skipped.
  throw new Error(
    'instagram: text-only posts are not allowed by Graph API. Add an imageUrl on the queued post.',
  );
  // (Image-flow stub left for v2.3 — needs an asset URL field on ScheduledPost.)
  // const create = await fetch(`https://graph.facebook.com/v20.0/${igAccountId}/media`, {...});
  // const publish = await fetch(`https://graph.facebook.com/v20.0/${igAccountId}/media_publish`, {...});
}

async function publishOne(
  platform: PlatformKey,
  token: StoredToken,
  text: string,
): Promise<string | null> {
  if (Date.now() > token.expiresAt - 60_000) {
    throw new Error(`${platform}: token expired — reconnect`);
  }
  switch (platform) {
    case 'linkedin':
      return publishLinkedIn(token, text);
    case 'x':
      return publishX(token, text);
    case 'facebook':
      return publishFacebook(token, text);
    case 'instagram':
      return publishInstagram(token, text);
    default:
      throw new Error(`${platform}: not implemented`);
  }
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const users = await listUsers();
  const results: Result[] = [];
  const now = Date.now();

  for (const syncToken of users) {
    let blob: Awaited<ReturnType<typeof readUser>>;
    try {
      blob = await readUser(syncToken);
    } catch (err) {
      results.push({
        syncToken,
        platform: 'linkedin',
        postId: '',
        ok: false,
        error: `read fail: ${(err as Error).message}`,
      });
      continue;
    }
    let changed = false;
    for (const post of blob.queue) {
      if (post.publishedAt) continue;
      if (new Date(post.scheduledFor).getTime() > now) continue;
      const token = blob.tokens[post.platform];
      if (!token) {
        results.push({
          syncToken,
          platform: post.platform,
          postId: post.id,
          ok: false,
          error: 'no token linked',
        });
        continue;
      }
      try {
        await publishOne(post.platform, token, post.text);
        post.publishedAt = new Date().toISOString();
        changed = true;
        results.push({
          syncToken,
          platform: post.platform,
          postId: post.id,
          ok: true,
        });
        await broadcast(syncToken, {
          type: 'post.published',
          title: `Published to ${post.platform.toUpperCase()}`,
          detail: post.text.slice(0, 200),
          tags: [post.platform],
        });
      } catch (err) {
        results.push({
          syncToken,
          platform: post.platform,
          postId: post.id,
          ok: false,
          error: (err as Error).message,
        });
        await broadcast(syncToken, {
          type: 'post.publish_failed',
          title: `Publish failed: ${post.platform.toUpperCase()}`,
          detail: (err as Error).message,
          tags: [post.platform],
        });
      }
    }
    if (changed) await writeUser(syncToken, blob);
  }

  return NextResponse.json({
    users: users.length,
    published: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
    ranAt: new Date().toISOString(),
  });
}
