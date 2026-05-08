import type { Issue, Severity } from '../types.ts';

export interface StructureJudgeTargets {
  /** Max acceptable Flesch-Kincaid grade level (English). Default 8. */
  gradeLevelMax?: number;
  /** Min acceptable Gulpease index (Italian). Default 60. */
  gulpeaseMin?: number;
  /** Max acceptable passive-voice ratio (English). Default 0.25. */
  passiveRatioMax?: number;
}

export interface StructureJudgeInput {
  content: string;
  language: 'en' | 'it';
  targets?: StructureJudgeTargets;
}

export interface StructureMetrics {
  sentenceCount: number;
  wordCount: number;
  longestSentenceWords: number;
  gradeLevel?: number;
  gulpease?: number;
  passiveRatio?: number;
}

export interface StructureJudgeResult {
  structureScore: number;
  readabilityScore: number;
  issues: Issue[];
  metrics: StructureMetrics;
}

const DEFAULT_GRADE_MAX = 8;
const DEFAULT_GULPEASE_MIN = 60;
const DEFAULT_PASSIVE_MAX = 0.25;

const PENALTY: Record<Severity, number> = { high: 15, medium: 8, low: 3 };

const IRREGULAR_PARTICIPLES = new Set([
  'written',
  'spoken',
  'broken',
  'chosen',
  'taken',
  'given',
  'driven',
  'eaten',
  'forgotten',
  'hidden',
  'known',
  'seen',
  'shown',
  'thrown',
  'made',
  'said',
  'sent',
  'built',
  'bought',
  'brought',
  'caught',
  'taught',
  'told',
  'sold',
  'held',
  'left',
  'lost',
  'meant',
  'paid',
  'put',
  'read',
  'set',
  'cut',
  'hit',
  'done',
  'gone',
  'found',
  'heard',
  'kept',
  'led',
  'felt',
]);

const BE_FORMS = new Set(['is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', "'s", "'re"]);

interface SentenceRecord {
  text: string;
  line: number;
  words: string[];
}

export function judgeStructure(input: StructureJudgeInput): StructureJudgeResult {
  const targets = {
    gradeLevelMax: input.targets?.gradeLevelMax ?? DEFAULT_GRADE_MAX,
    gulpeaseMin: input.targets?.gulpeaseMin ?? DEFAULT_GULPEASE_MIN,
    passiveRatioMax: input.targets?.passiveRatioMax ?? DEFAULT_PASSIVE_MAX,
  };

  const proseLines = stripCodeBlocks(input.content);
  const sentences = extractSentences(proseLines);
  const allWords = sentences.flatMap((s) => s.words);

  const structureIssues: Issue[] = [];
  const readabilityIssues: Issue[] = [];

  // 1. Long sentences
  for (const s of sentences) {
    if (s.words.length > 45) {
      structureIssues.push({
        line: s.line,
        type: 'structure',
        severity: 'high',
        text: s.text,
        rule: 'Sentences over 45 words are very hard to follow.',
        suggestion: 'Split this into two or more sentences.',
      });
    } else if (s.words.length > 30) {
      structureIssues.push({
        line: s.line,
        type: 'structure',
        severity: 'medium',
        text: s.text,
        rule: 'Sentences over 30 words tax readers.',
        suggestion: 'Break this into shorter sentences.',
      });
    }
  }

  // 2. Reading grade level
  const metrics: StructureMetrics = {
    sentenceCount: sentences.length,
    wordCount: allWords.length,
    longestSentenceWords: sentences.reduce((m, s) => Math.max(m, s.words.length), 0),
  };

  if (sentences.length > 0 && allWords.length > 0) {
    if (input.language === 'en') {
      const syllables = allWords.reduce((sum, w) => sum + countSyllables(w), 0);
      const grade =
        0.39 * (allWords.length / sentences.length) + 11.8 * (syllables / allWords.length) - 15.59;
      metrics.gradeLevel = round1(grade);
      const over = grade - targets.gradeLevelMax;
      if (over > 0) {
        readabilityIssues.push({
          line: 1,
          type: 'readability',
          severity: over >= 3 ? 'high' : 'medium',
          text: `Document reading level: grade ${metrics.gradeLevel}`,
          rule: `Target reading grade is ${targets.gradeLevelMax} or lower.`,
          suggestion: 'Use shorter sentences and simpler words.',
        });
      }
    } else {
      const letters = allWords.reduce((sum, w) => sum + countLetters(w), 0);
      const gulpease =
        89 - (10 * letters) / allWords.length + (300 * sentences.length) / allWords.length;
      metrics.gulpease = round1(gulpease);
      const under = targets.gulpeaseMin - gulpease;
      if (under > 0) {
        // Roughly: 10 Gulpease points ≈ 1 grade level.
        readabilityIssues.push({
          line: 1,
          type: 'readability',
          severity: under >= 30 ? 'high' : 'medium',
          text: `Indice Gulpease del documento: ${metrics.gulpease}`,
          rule: `Gulpease minimo consigliato: ${targets.gulpeaseMin}.`,
          suggestion: 'Usa frasi più corte e parole più brevi.',
        });
      }
    }
  }

  // 3. Passive voice (English)
  if (input.language === 'en' && sentences.length > 0) {
    let passive = 0;
    for (const s of sentences) {
      if (isPassive(s.words)) passive++;
    }
    const ratio = passive / sentences.length;
    metrics.passiveRatio = round2(ratio);
    if (ratio > targets.passiveRatioMax) {
      const severity: Severity = ratio >= 0.5 ? 'high' : ratio >= 0.35 ? 'medium' : 'low';
      readabilityIssues.push({
        line: 1,
        type: 'readability',
        severity,
        text: `Passive voice in ${Math.round(ratio * 100)}% of sentences`,
        rule: `Keep passive voice under ${Math.round(targets.passiveRatioMax * 100)}%.`,
        suggestion: 'Rewrite passive sentences in active voice.',
      });
    }
  }

  // 4. Long paragraphs
  if (sentences.length > 1) {
    const paragraphs = splitParagraphs(proseLines);
    for (const p of paragraphs) {
      const sentenceCount = extractSentences(p.lines).length;
      if (sentenceCount > 6) {
        structureIssues.push({
          line: p.line,
          type: 'structure',
          severity: 'low',
          text: p.lines.join(' ').slice(0, 120),
          rule: 'Paragraphs over 6 sentences feel like walls of text.',
          suggestion: 'Break this paragraph into smaller chunks.',
        });
      }
    }
  }

  // 5. Repeated sentence starts
  let runStart = 0;
  let runWord = '';
  for (let i = 0; i <= sentences.length; i++) {
    const w = i < sentences.length ? (sentences[i]!.words[0] ?? '').toLowerCase() : '';
    if (w === runWord && w.length > 2) continue;
    const runLen = i - runStart;
    if (runLen >= 3 && runWord.length > 2) {
      structureIssues.push({
        line: sentences[runStart]!.line,
        type: 'structure',
        severity: 'low',
        text: sentences
          .slice(runStart, i)
          .map((s) => s.text)
          .join(' '),
        rule: `${runLen} consecutive sentences start with "${runWord}".`,
        suggestion: 'Vary sentence openings to keep rhythm.',
      });
    }
    runStart = i;
    runWord = w;
  }

  return {
    structureScore: scoreFrom(structureIssues),
    readabilityScore: scoreFrom(readabilityIssues),
    issues: [...structureIssues, ...readabilityIssues],
    metrics,
  };
}

// ---------- helpers ----------

interface ProseLine {
  text: string;
  line: number;
}

function stripCodeBlocks(content: string): ProseLine[] {
  const lines = content.split('\n');
  const out: ProseLine[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    if (/^```/.test(raw.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^ {4}\S/.test(raw)) continue; // indented code
    out.push({ text: raw, line: i + 1 });
  }
  return out;
}

function extractSentences(lines: ProseLine[]): SentenceRecord[] {
  const out: SentenceRecord[] = [];
  for (const { text, line } of lines) {
    if (!text.trim()) continue;
    // Split on sentence terminators while keeping line attribution.
    const parts = text.split(/(?<=[.!?])\s+/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const words = trimmed
        .replace(/[^\p{L}\p{N}'\-\s]/gu, ' ')
        .split(/\s+/)
        .filter(Boolean);
      if (words.length === 0) continue;
      out.push({ text: trimmed, line, words });
    }
  }
  return out;
}

function splitParagraphs(lines: ProseLine[]): { line: number; lines: ProseLine[] }[] {
  const paras: { line: number; lines: ProseLine[] }[] = [];
  let current: ProseLine[] = [];
  for (const l of lines) {
    if (!l.text.trim()) {
      if (current.length) {
        paras.push({ line: current[0]!.line, lines: current });
        current = [];
      }
    } else {
      current.push(l);
    }
  }
  if (current.length) paras.push({ line: current[0]!.line, lines: current });
  return paras;
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  let stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/u, '');
  if (stripped === w) stripped = w.replace(/e$/u, '');
  const groups = stripped.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

function countLetters(word: string): number {
  return (word.match(/\p{L}/gu) || []).length;
}

function isPassive(words: string[]): boolean {
  for (let i = 0; i < words.length - 1; i++) {
    const cur = words[i]!.toLowerCase();
    if (!BE_FORMS.has(cur)) continue;
    // Allow an adverb between be + participle (e.g. "was quickly written").
    for (let j = i + 1; j <= Math.min(i + 3, words.length - 1); j++) {
      const cand = words[j]!.toLowerCase();
      if (looksLikePastParticiple(cand)) return true;
      if (!cand.endsWith('ly')) break;
    }
  }
  return false;
}

function looksLikePastParticiple(w: string): boolean {
  if (IRREGULAR_PARTICIPLES.has(w)) return true;
  if (w.length > 4 && w.endsWith('ed')) return true;
  return false;
}

function scoreFrom(issues: Issue[]): number {
  const penalty = issues.reduce((sum, i) => sum + PENALTY[i.severity], 0);
  return Math.max(0, 100 - penalty);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
