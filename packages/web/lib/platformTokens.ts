import { getSyncStore } from './syncStore';

export type PlatformKey = 'linkedin' | 'x' | 'instagram' | 'facebook' | 'ga4';

export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  /** platform-specific extras (sub / userId / pageId / igAccountId / username) */
  meta?: Record<string, unknown>;
}

export interface ScheduledPost {
  id: string;
  platform: PlatformKey;
  text: string;
  scheduledFor: string;
  /** Set by the cron when it picks the post up. */
  publishedAt?: string;
  /** Where to mark as published in the user's queue if reachable. */
  source?: { kind: 'browser-queue' };
}

export interface UserBlob {
  /** Platform token map. */
  tokens: Partial<Record<PlatformKey, StoredToken>>;
  /** Posts queued for server-driven publishing. */
  queue: ScheduledPost[];
  updatedAt: string;
}

const USERS_INDEX = 'cv:users';

function key(syncToken: string) {
  return `cv:user:${syncToken}`;
}

export async function readUser(syncToken: string): Promise<UserBlob> {
  const store = await getSyncStore();
  const entry = await store.get(key(syncToken));
  if (!entry?.data) {
    return { tokens: {}, queue: [], updatedAt: new Date().toISOString() };
  }
  const blob = entry.data as Partial<UserBlob>;
  return {
    tokens: blob.tokens ?? {},
    queue: blob.queue ?? [],
    updatedAt: blob.updatedAt ?? new Date().toISOString(),
  };
}

export async function writeUser(syncToken: string, blob: UserBlob): Promise<void> {
  const store = await getSyncStore();
  await store.set(key(syncToken), { ...blob, updatedAt: new Date().toISOString() });
  // Track every sync token we've ever seen so cron can iterate.
  const idx = await store.get(USERS_INDEX);
  const list = (idx?.data as string[] | undefined) ?? [];
  if (!list.includes(syncToken)) {
    list.push(syncToken);
    await store.set(USERS_INDEX, list);
  }
}

export async function setToken(
  syncToken: string,
  platform: PlatformKey,
  token: StoredToken,
): Promise<void> {
  const blob = await readUser(syncToken);
  blob.tokens[platform] = token;
  await writeUser(syncToken, blob);
}

export async function listUsers(): Promise<string[]> {
  const store = await getSyncStore();
  const idx = await store.get(USERS_INDEX);
  return (idx?.data as string[] | undefined) ?? [];
}
