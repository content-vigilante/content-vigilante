'use client';

import { useEffect, useState } from 'react';

export type Platform = 'linkedin' | 'instagram' | 'x' | 'facebook' | 'newsletter';

export type PostStatus = 'idea' | 'drafting' | 'in-review' | 'approved' | 'scheduled' | 'published';

export interface Post {
  id: string;
  title: string;
  body: string;
  platform: Platform;
  status: PostStatus;
  scheduledFor?: string;
  createdAt: string;
  brandScore?: number;
  /** Workspace this post belongs to. Optional — legacy posts have none. */
  workspaceId?: string;
  /** Campaign tag — used by the Campaigns rollup. */
  campaignId?: string;
  /** Who approved (when status === 'approved'). */
  approvedBy?: string;
  approvedAt?: string;
}

export interface Lead {
  id: string;
  name: string;
  source: string;
  stage: 'lead' | 'discovery' | 'proposal' | 'closed';
  value?: number;
  notes?: string;
  createdAt: string;
  workspaceId?: string;
  campaignId?: string;
}

export interface Campaign {
  id: string;
  name: string;
  goal?: string;
  workspaceId?: string;
  /** Total ad spend across the campaign in EUR. */
  spend?: number;
  createdAt: string;
}

export type WorkspaceRole = 'admin' | 'writer' | 'reviewer';

export interface Workspace {
  id: string;
  name: string;
  brandColor?: string;
  /** White-label client name shown on /share/[token]. */
  clientName?: string;
  /** Public URL for client logo (rendered on the approval portal). */
  logoUrl?: string;
  /** Default hourly rate (€) used by the invoice generator. */
  hourlyRate?: number;
  /** Currency symbol — defaults to € when unset. */
  currency?: string;
  /** Current user's role in this workspace. */
  role?: WorkspaceRole;
}

export interface TimeEntry {
  id: string;
  kind: 'creation' | 'engagement';
  postId?: string;
  label: string;
  startedAt: string;
  endedAt?: string;
  seconds: number;
}

export interface Comment {
  id: string;
  platform: 'linkedin' | 'instagram' | 'x' | 'facebook' | 'newsletter';
  author: string;
  body: string;
  receivedAt: string;
  postTitle: string;
  read?: boolean;
  convertedToLead?: boolean;
}

const KEY = (k: string) => `cv:store:${k}`;

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(KEY(key));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY(key), JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(`cv:store:${key}`));
}

export function useStore<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(read<T>(key, fallback));
    setHydrated(true);
    const handler = () => setValue(read<T>(key, fallback));
    window.addEventListener(`cv:store:${key}`, handler);
    return () => window.removeEventListener(`cv:store:${key}`, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = (v: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      write(key, next);
      return next;
    });
  };

  return [hydrated ? value : fallback, update];
}

export const seedCampaigns: Campaign[] = [
  {
    id: 'cmp-launch',
    name: 'v2 Launch wave',
    goal: 'Drive 500 dashboard signups in 30 days',
    spend: 420,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'cmp-evergreen',
    name: 'Evergreen brand',
    goal: 'Consistent on-brand presence between launches',
    spend: 0,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

export const seedPosts: Post[] = [
  {
    id: 'p1',
    title: 'Local-first launch teaser',
    body: 'We just shipped Content Vigilante v0.2 — full marketing OS, your data stays yours.',
    platform: 'linkedin',
    status: 'scheduled',
    scheduledFor: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    brandScore: 87,
    campaignId: 'cmp-launch',
  },
  {
    id: 'p2',
    title: 'Brand Guardrails demo',
    body: 'Watch our AI flag off-brand content in 2 seconds. Thread 🧵',
    platform: 'x',
    status: 'drafting',
    createdAt: new Date().toISOString(),
    campaignId: 'cmp-launch',
  },
  {
    id: 'p3',
    title: 'Behind the build',
    body: '5 hours. 50 features. One vigilante. Carousel coming soon.',
    platform: 'instagram',
    status: 'idea',
    createdAt: new Date().toISOString(),
    campaignId: 'cmp-launch',
  },
  {
    id: 'p4',
    title: 'Weekly digest #14',
    body: 'This week in local-first marketing — RAG hits the brand stack.',
    platform: 'newsletter',
    status: 'published',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    brandScore: 92,
    campaignId: 'cmp-evergreen',
  },
];

export const seedComments: Comment[] = [
  {
    id: 'c1',
    platform: 'linkedin',
    author: 'Marco R.',
    body: 'Curious — how does the offline mode handle media assets?',
    receivedAt: new Date(Date.now() - 3600000).toISOString(),
    postTitle: 'Local-first launch teaser',
  },
  {
    id: 'c2',
    platform: 'instagram',
    author: 'Aanya P.',
    body: 'This is exactly the workflow I needed. DM me about a 30-day trial?',
    receivedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    postTitle: 'Behind the build',
  },
  {
    id: 'c3',
    platform: 'x',
    author: '@buildwithben',
    body: 'How does it compare to Hypefury for X-only flows?',
    receivedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    postTitle: 'Brand Guardrails demo',
  },
  {
    id: 'c4',
    platform: 'newsletter',
    author: 'reply@bikewo.it',
    body: 'Can we get a 2-seat plan for client onboarding?',
    receivedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    postTitle: 'Weekly digest #14',
  },
];

export const seedLeads: Lead[] = [
  {
    id: 'l1',
    name: 'Carlos Mota — AD Magazine',
    source: 'LinkedIn DM',
    stage: 'discovery',
    value: 4500,
    createdAt: new Date().toISOString(),
    campaignId: 'cmp-launch',
  },
  {
    id: 'l2',
    name: 'BikeWo Bologna',
    source: 'Instagram comment',
    stage: 'proposal',
    value: 1800,
    createdAt: new Date().toISOString(),
    campaignId: 'cmp-launch',
  },
  {
    id: 'l3',
    name: 'Vijay Gas SMM',
    source: 'Referral',
    stage: 'closed',
    value: 6000,
    createdAt: new Date().toISOString(),
    campaignId: 'cmp-evergreen',
  },
  {
    id: 'l4',
    name: 'Nishta partner inquiry',
    source: 'Newsletter reply',
    stage: 'lead',
    createdAt: new Date().toISOString(),
  },
];
