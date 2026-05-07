/**
 * Eval runner — v0.1 skeleton.
 *
 * Scope today:
 *   - Discover cases under cases/<lang>/*.json
 *   - Print case count and structure validation
 *
 * Scope week 1 day 5:
 *   - Wire up real `audit()` calls
 *   - Compute precision / recall / F1 per dimension
 *   - Diff against baselines/<lang>.json, fail CI on >5% F1 drop
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

interface ExpectedFlag {
  lineContains: string;
  type?: string;
}

interface EvalCase {
  id: string;
  guide: string;
  language: 'en' | 'it';
  content: string;
  expected: {
    scoreRange: [number, number];
    mustFlag: ExpectedFlag[];
    mustNotFlag: ExpectedFlag[];
  };
}

const CASES_ROOT = new URL('../cases/', import.meta.url).pathname;

async function loadCases(): Promise<EvalCase[]> {
  const out: EvalCase[] = [];
  for (const lang of await readdir(CASES_ROOT)) {
    const dir = join(CASES_ROOT, lang);
    for (const file of await readdir(dir)) {
      if (!file.endsWith('.json')) continue;
      const raw = await readFile(join(dir, file), 'utf8');
      const parsed = JSON.parse(raw) as EvalCase;
      out.push(parsed);
    }
  }
  return out;
}

async function main(): Promise<void> {
  const cases = await loadCases();
  console.log(`Loaded ${cases.length} eval cases:`);
  for (const c of cases) {
    console.log(`  - [${c.language}] ${c.id} (${c.guide})`);
  }
  console.log('\nRunner is a stub for v0.1 day 1. Real scoring lands week 1 day 5.');
}

void main();
