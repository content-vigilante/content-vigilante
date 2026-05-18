import type { Lead } from './store';

export interface ScoredLead extends Lead {
  score: number;
  tier: 'hot' | 'warm' | 'cold';
}

const STAGE_W = { lead: 10, discovery: 35, proposal: 65, closed: 100 } as const;

export function scoreLead(lead: Lead): ScoredLead {
  let s: number = STAGE_W[lead.stage] ?? 0;

  // Value contributes up to 30 pts.
  if (lead.value) {
    const v = Math.min(lead.value, 20000) / 20000;
    s += Math.round(v * 30);
  }

  // Source quality.
  const src = lead.source.toLowerCase();
  if (src.includes('referral')) s += 15;
  else if (src.includes('linkedin') || src.includes('email')) s += 8;
  else if (src.includes('cold')) s -= 10;

  // Recency: < 14d = +10, > 60d = -10.
  const ageDays = (Date.now() - new Date(lead.createdAt).getTime()) / 86400000;
  if (ageDays < 14) s += 10;
  else if (ageDays > 60 && lead.stage !== 'closed') s -= 12;

  s = Math.max(0, Math.min(100, s));
  const tier: ScoredLead['tier'] = s >= 70 ? 'hot' : s >= 40 ? 'warm' : 'cold';
  return { ...lead, score: s, tier };
}
