/**
 * Eval runner.
 *
 * What it does:
 *   1. Loads every JSON case under cases/<lang>/.
 *   2. Loads the bundled brand guides (mailchimp.json, etc.).
 *   3. Runs audit() against each case.
 *   4. Checks: scoreRange, mustFlag, mustNotFlag.
 *   5. Aggregates precision / recall / F1 per dimension.
 *   6. Compares against baselines/<lang>.json — exit 1 on >5% F1 regression.
 *
 * Modes:
 *   - default (deterministic):  no LLM calls. Vocab + structure judges only.
 *                               Tone judge stubbed with an empty-result mock.
 *                               Cheap, fast, runs in CI.
 *   - --with-llm:               full pipeline with real LLM. Set
 *                               ANTHROPIC_API_KEY. Used for development eval
 *                               and (manually) for baseline updates.
 *
 * Usage:
 *   bun run packages/eval/src/runner.ts                       # deterministic
 *   bun run packages/eval/src/runner.ts --filter en           # one language
 *   bun run packages/eval/src/runner.ts --with-llm            # real LLM
 *   bun run packages/eval/src/runner.ts --write-baseline      # update baseline
 */

import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  type AuditResult,
  type LLMProvider,
  audit,
  createAnthropicProvider,
  loadGuideFromJSON,
} from '../../core/src/index.ts';

interface ExpectedFlag {
  lineContains: string;
  type?: 'tone' | 'vocabulary' | 'structure' | 'readability';
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

interface CaseOutcome {
  id: string;
  language: 'en' | 'it';
  score: number;
  scoreInRange: boolean;
  truePositives: number;
  falseNegatives: number;
  falsePositives: number;
  precision: number;
  recall: number;
  f1: number;
  issuesFound: number;
  durationMs: number;
}

interface EvalSummary {
  totalCases: number;
  passed: number;
  failed: number;
  weightedF1: number;
  perDimension: Record<string, { precision: number; recall: number; f1: number }>;
  cases: CaseOutcome[];
}

const ROOT = new URL('../../..', import.meta.url).pathname;
const CASES_ROOT = join(ROOT, 'packages/eval/cases');
const BASELINES_ROOT = join(ROOT, 'packages/eval/baselines');
const GUIDES_ROOT = join(ROOT, 'packages/core/src/guides/data');

function emptyToneLLM(): LLMProvider {
  return {
    name: 'eval:empty-tone',
    async generate() {
      return { text: '{ "score": 100, "issues": [] }', tokensUsed: 0 };
    },
  };
}

async function loadCases(filter?: string): Promise<EvalCase[]> {
  const out: EvalCase[] = [];
  for (const lang of await readdir(CASES_ROOT)) {
    if (filter && lang !== filter) continue;
    const dir = join(CASES_ROOT, lang);
    for (const file of await readdir(dir)) {
      if (!file.endsWith('.json')) continue;
      const raw = await readFile(join(dir, file), 'utf8');
      out.push(JSON.parse(raw) as EvalCase);
    }
  }
  return out;
}

function checkExpectations(
  result: AuditResult,
  expected: EvalCase['expected'],
): { tp: number; fn: number; fp: number } {
  const issues = result.issues;
  let tp = 0;
  let fn = 0;
  for (const must of expected.mustFlag) {
    const matched = issues.some((i) => {
      if (must.type && i.type !== must.type) return false;
      return i.text.toLowerCase().includes(must.lineContains.toLowerCase());
    });
    if (matched) tp++;
    else fn++;
  }
  let fp = 0;
  for (const mustNot of expected.mustNotFlag) {
    const wronglyFlagged = issues.some((i) =>
      i.text.toLowerCase().includes(mustNot.lineContains.toLowerCase()),
    );
    if (wronglyFlagged) fp++;
  }
  return { tp, fn, fp };
}

function computeF1(
  tp: number,
  fp: number,
  fn: number,
): {
  precision: number;
  recall: number;
  f1: number;
} {
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision: round3(precision), recall: round3(recall), f1: round3(f1) };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

async function runAll(opts: {
  filter?: string;
  withLLM: boolean;
}): Promise<EvalSummary> {
  const cases = await loadCases(opts.filter);
  const llm = opts.withLLM
    ? createAnthropicProvider({ apiKey: process.env['ANTHROPIC_API_KEY'] ?? '' })
    : emptyToneLLM();

  const guideCache = new Map<string, Awaited<ReturnType<typeof loadGuideFromJSON>> | null>();
  async function getGuide(name: string) {
    if (guideCache.has(name)) return guideCache.get(name) ?? null;
    const path = join(GUIDES_ROOT, `${name}.json`);
    if (!existsSync(path)) {
      guideCache.set(name, null);
      return null;
    }
    const guide = await loadGuideFromJSON(path);
    guideCache.set(name, guide);
    return guide;
  }

  const outcomes: CaseOutcome[] = [];
  let totalTP = 0;
  let totalFP = 0;
  let totalFN = 0;

  let skipped = 0;
  for (const c of cases) {
    const guide = await getGuide(c.guide);
    if (!guide) {
      skipped++;
      console.log(`  [SKIP] ${c.id} — guide "${c.guide}" not yet bundled`);
      continue;
    }
    const t0 = Date.now();
    const result = await audit(
      { content: c.content, contentLanguage: c.language, guide, llm },
      opts.withLLM ? {} : { skipVocabLLM: true },
    );
    const durationMs = Date.now() - t0;

    const { tp, fn, fp } = checkExpectations(result, c.expected);
    const inRange =
      result.score >= c.expected.scoreRange[0] && result.score <= c.expected.scoreRange[1];
    const f1 = computeF1(tp, fp, fn);

    totalTP += tp;
    totalFP += fp;
    totalFN += fn;

    outcomes.push({
      id: c.id,
      language: c.language,
      score: result.score,
      scoreInRange: inRange,
      truePositives: tp,
      falseNegatives: fn,
      falsePositives: fp,
      precision: f1.precision,
      recall: f1.recall,
      f1: f1.f1,
      issuesFound: result.issues.length,
      durationMs,
    });
  }

  const weighted = computeF1(totalTP, totalFP, totalFN);
  const passed = outcomes.filter((o) => o.scoreInRange && o.falseNegatives === 0).length;
  const ranCount = cases.length - skipped;

  return {
    totalCases: ranCount,
    passed,
    failed: ranCount - passed,
    weightedF1: weighted.f1,
    perDimension: { overall: weighted },
    cases: outcomes,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const filter = argv.find((a) => a.startsWith('--filter='))?.slice('--filter='.length);
  const withLLM = argv.includes('--with-llm');
  const writeBaseline = argv.includes('--write-baseline');

  console.log(
    `Running eval suite${filter ? ` [${filter}]` : ''}${withLLM ? ' [with LLM]' : ' [deterministic]'}`,
  );
  const summary = await runAll({ filter: filter ?? undefined, withLLM });

  console.log();
  for (const o of summary.cases) {
    const tag = o.scoreInRange && o.falseNegatives === 0 ? 'PASS' : 'FAIL';
    console.log(
      `  [${tag}] ${o.id.padEnd(8)} score=${String(o.score).padStart(3)}  TP=${o.truePositives} FN=${o.falseNegatives} FP=${o.falsePositives}  F1=${o.f1.toFixed(2)}  ${o.durationMs}ms`,
    );
  }
  console.log();
  console.log(
    `Result: ${summary.passed}/${summary.totalCases} passed.  weighted F1 = ${summary.weightedF1.toFixed(3)}`,
  );

  if (writeBaseline) {
    if (!existsSync(BASELINES_ROOT)) {
      const { mkdir } = await import('node:fs/promises');
      await mkdir(BASELINES_ROOT, { recursive: true });
    }
    const baselinePath = join(BASELINES_ROOT, `${filter ?? 'all'}.json`);
    await writeFile(
      baselinePath,
      `${JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          mode: withLLM ? 'with-llm' : 'deterministic',
          totalCases: summary.totalCases,
          passed: summary.passed,
          weightedF1: summary.weightedF1,
        },
        null,
        2,
      )}\n`,
    );
    console.log(`\nBaseline written to ${baselinePath}`);
    return;
  }

  // Compare against baseline if one exists.
  const baselinePath = join(BASELINES_ROOT, `${filter ?? 'all'}.json`);
  if (existsSync(baselinePath)) {
    const baseline = JSON.parse(await readFile(baselinePath, 'utf8')) as {
      weightedF1: number;
      mode: string;
    };
    if (baseline.mode !== (withLLM ? 'with-llm' : 'deterministic')) {
      console.log(`\nSkipping baseline check: mode mismatch (baseline=${baseline.mode}).`);
      return;
    }
    const drop = baseline.weightedF1 - summary.weightedF1;
    const pctDrop = (drop / baseline.weightedF1) * 100;
    console.log(
      `\nBaseline F1=${baseline.weightedF1.toFixed(3)}  current F1=${summary.weightedF1.toFixed(3)}  delta=${drop >= 0 ? '-' : '+'}${Math.abs(pctDrop).toFixed(1)}%`,
    );
    if (pctDrop > 5) {
      console.error('\nF1 regression > 5%. Failing CI.');
      process.exit(1);
    }
  } else {
    console.log(`\nNo baseline at ${baselinePath} — run with --write-baseline to create one.`);
  }
}

void main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});

// silence ts noise about unused import in some bundler modes
void dirname;
