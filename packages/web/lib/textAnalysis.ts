// Deterministic text-analysis utilities used by Studio.

export function fleschKincaid(text: string): number {
  const sentences = Math.max(text.split(/[.!?]+/).filter(Boolean).length, 1);
  const words = Math.max(text.trim().split(/\s+/).filter(Boolean).length, 1);
  const syllables = text
    .toLowerCase()
    .split(/\s+/)
    .reduce((sum, w) => sum + Math.max(1, (w.match(/[aeiouy]+/g) ?? []).length), 0);
  return Math.round(206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words));
}

const POWER_WORDS = new Set([
  'how',
  'why',
  'best',
  'guide',
  'simple',
  'easy',
  'new',
  'free',
  'proven',
  'instant',
  'now',
  'avoid',
  'stop',
  'fix',
  'most',
  'never',
  'always',
  'secret',
  'real',
  'truth',
  'mistake',
  'wrong',
  'right',
]);

export interface HeadlineScore {
  score: number;
  reasons: string[];
}

export function scoreHeadline(headline: string): HeadlineScore {
  const reasons: string[] = [];
  let score = 50;
  const trimmed = headline.trim();
  if (!trimmed) return { score: 0, reasons: ['Empty headline.'] };

  const words = trimmed.split(/\s+/);
  if (words.length >= 6 && words.length <= 12) {
    score += 15;
    reasons.push(`Length (${words.length} words) is in the high-CTR band.`);
  } else if (words.length < 6) {
    score -= 5;
    reasons.push('Slightly short — consider adding context.');
  } else {
    score -= 10;
    reasons.push('Long headline — may truncate in feeds.');
  }

  const power = words.filter((w) => POWER_WORDS.has(w.toLowerCase().replace(/[.,!?]/g, ''))).length;
  if (power > 0) {
    score += Math.min(20, power * 7);
    reasons.push(`${power} power word${power > 1 ? 's' : ''}.`);
  } else {
    reasons.push('No power words — try “how”, “why”, “stop”, “avoid”.');
  }

  if (/^\d|\b(\d+)\b/.test(trimmed)) {
    score += 10;
    reasons.push('Contains a number — adds credibility.');
  }
  if (/[?]/.test(trimmed)) {
    score += 6;
    reasons.push('Question form invites engagement.');
  }
  if (/[!]/.test(trimmed)) {
    score -= 5;
    reasons.push('Exclamation marks read salesy.');
  }
  if (/\b[A-Z]{3,}\b/.test(trimmed)) {
    score -= 8;
    reasons.push('ALL-CAPS — reads spammy.');
  }
  if (trimmed.length > 90) {
    score -= 10;
    reasons.push('Over 90 chars — risks truncation on Twitter / search.');
  }
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export interface SeoCheck {
  density: number;
  matches: number;
  hint: string;
}

export function seoDensity(text: string, keyword: string): SeoCheck {
  if (!keyword.trim()) return { density: 0, matches: 0, hint: 'Add a target keyword.' };
  const lower = text.toLowerCase();
  const k = keyword.toLowerCase();
  let count = 0;
  let i = 0;
  while ((i = lower.indexOf(k, i)) !== -1) {
    count++;
    i += k.length;
  }
  const totalWords = Math.max(text.trim().split(/\s+/).filter(Boolean).length, 1);
  const density = count > 0 ? +((count / totalWords) * 100).toFixed(1) : 0;
  let hint = '';
  if (count === 0) hint = 'Keyword not present.';
  else if (density < 0.5) hint = 'Underused — aim for 0.5–2.0%.';
  else if (density > 3) hint = 'Over-stuffed — Google may penalize.';
  else hint = 'Solid density.';
  return { density, matches: count, hint };
}

const BIAS_PATTERNS: Array<{ regex: RegExp; message: string }> = [
  {
    regex: /\b(guys|manpower|mankind|chairman|salesman|spokesman)\b/i,
    message: 'Gendered term — prefer inclusive alternative.',
  },
  { regex: /\b(crazy|insane|lame|dumb)\b/i, message: 'Ableist phrasing.' },
  {
    regex: /\b(blacklist|whitelist|master\/slave)\b/i,
    message: 'Loaded technical metaphor — prefer allowlist / denylist / primary / replica.',
  },
  {
    regex: /\b(ninja|rockstar|guru)\b/i,
    message: 'Tech-bro cliché — alienates non-Western readers.',
  },
  { regex: /\b(third world|illegal alien)\b/i, message: 'Outdated terminology.' },
];

export function detectBias(text: string): Array<{ term: string; message: string }> {
  const hits: Array<{ term: string; message: string }> = [];
  for (const { regex, message } of BIAS_PATTERNS) {
    const m = text.match(regex);
    if (m) hits.push({ term: m[0], message });
  }
  return hits;
}

const POSITIVE_RE = /\b(love|win|launch|new|happy|great|amazing|excited|grateful|build|ship)\b/i;
const NEGATIVE_RE = /\b(broken|fail|fix|bug|issue|problem|down|hate|tired)\b/i;
const QUESTION_RE = /\?/;
const CALL_RE = /\b(read|watch|click|join|reply|subscribe|sign up|try|grab)\b/i;

export function suggestEmojis(text: string): string[] {
  const out = new Set<string>();
  if (POSITIVE_RE.test(text)) out.add('✨');
  if (NEGATIVE_RE.test(text)) out.add('🔧');
  if (QUESTION_RE.test(text)) out.add('❓');
  if (CALL_RE.test(text)) out.add('👇');
  if (/\b(launch|ship|deploy|release)\b/i.test(text)) out.add('🚀');
  if (/\b(brand|guard|protect)\b/i.test(text)) out.add('🛡️');
  if (/\b(idea|think|insight)\b/i.test(text)) out.add('🧠');
  if (/\b(thread|series|part \d)\b/i.test(text)) out.add('🧵');
  if (/\b(data|chart|metric|growth)\b/i.test(text)) out.add('📊');
  if (out.size === 0) out.add('✦');
  return Array.from(out).slice(0, 6);
}
