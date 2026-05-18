import { getSyncStore } from './syncStore';

export type NotifyChannel = 'slack' | 'discord' | 'webhook';

export interface NotificationTarget {
  id: string;
  channel: NotifyChannel;
  /** Webhook URL */
  url: string;
  /** Which event types to send. Empty = all. */
  events: string[];
  label?: string;
}

export type EventType =
  | 'post.published'
  | 'post.publish_failed'
  | 'watchlist.changed'
  | 'inbox.new_comment'
  | 'lead.hot';

export interface NotifyPayload {
  type: EventType;
  title: string;
  detail?: string;
  url?: string;
  tags?: string[];
}

function key(syncToken: string) {
  return `cv:notify:${syncToken}`;
}

export async function listTargets(syncToken: string): Promise<NotificationTarget[]> {
  const store = await getSyncStore();
  const entry = await store.get(key(syncToken));
  return (entry?.data as NotificationTarget[] | undefined) ?? [];
}

export async function writeTargets(
  syncToken: string,
  targets: NotificationTarget[],
): Promise<void> {
  const store = await getSyncStore();
  await store.set(key(syncToken), targets);
}

const SLACK_EMOJI: Record<EventType, string> = {
  'post.published': '✅',
  'post.publish_failed': '⚠️',
  'watchlist.changed': '👀',
  'inbox.new_comment': '💬',
  'lead.hot': '🔥',
};

export async function deliver(target: NotificationTarget, payload: NotifyPayload): Promise<void> {
  if (target.events.length > 0 && !target.events.includes(payload.type)) return;
  const emoji = SLACK_EMOJI[payload.type] ?? '🔔';
  const lines = [`${emoji} *${payload.title}*`];
  if (payload.detail) lines.push(payload.detail);
  if (payload.url) lines.push(`<${payload.url}>`);
  if (payload.tags && payload.tags.length > 0) lines.push(`_${payload.tags.join(' · ')}_`);

  const body =
    target.channel === 'slack' || target.channel === 'discord'
      ? { text: lines.join('\n') }
      : { ...payload, text: lines.join('\n') };

  try {
    await fetch(target.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    /* swallow — never let a notification take down a publish */
  }
}

export async function broadcast(
  syncToken: string,
  payload: NotifyPayload,
): Promise<{ delivered: number }> {
  const targets = await listTargets(syncToken);
  await Promise.all(targets.map((t) => deliver(t, payload)));
  return { delivered: targets.length };
}
