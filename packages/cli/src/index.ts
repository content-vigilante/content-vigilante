#!/usr/bin/env bun
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type AuditResult,
  type Issue,
  type LLMProvider,
  audit,
  createAnthropicProvider,
  createOllamaProvider,
  createOpenAIProvider,
  extractContent,
  loadGuideFromJSON,
  loadGuideFromMarkdown,
} from '@content-vigilante/core';
import { Command } from 'commander';
import kleur from 'kleur';

const program = new Command();
program
  .name('cv')
  .description('Content Vigilante — patrols your content for off-brand violations')
  .version('0.0.1');

const PROVIDER_ENV: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  ollama: 'OLLAMA_HOST',
};

interface ServeOpts {
  port?: string;
  host?: string;
}

function pickProvider(name: string | undefined, model: string | undefined): LLMProvider {
  const provider = (name ?? autoDetectProvider()).toLowerCase();
  switch (provider) {
    case 'anthropic': {
      const apiKey = process.env['ANTHROPIC_API_KEY'];
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set in env');
      return createAnthropicProvider({
        apiKey,
        ...(model ? { model } : {}),
      });
    }
    case 'openai': {
      const apiKey = process.env['OPENAI_API_KEY'];
      if (!apiKey) throw new Error('OPENAI_API_KEY not set in env');
      return createOpenAIProvider({
        apiKey,
        ...(model ? { model } : {}),
      });
    }
    case 'ollama':
      return createOllamaProvider({
        ...(model ? { model } : {}),
      });
    default:
      throw new Error(`Unknown provider: ${provider}. Use anthropic, openai, or ollama.`);
  }
}

function autoDetectProvider(): string {
  if (process.env['ANTHROPIC_API_KEY']) return 'anthropic';
  if (process.env['OPENAI_API_KEY']) return 'openai';
  return 'ollama';
}

function findBundledGuidePath(slug: string): string {
  // Look up the bundled mailchimp.json (or other guides) shipped with @content-vigilante/core.
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(here, '..', '..', 'core', 'src', 'guides', 'data', `${slug}.json`),
    join(
      here,
      '..',
      'node_modules',
      '@content-vigilante',
      'core',
      'src',
      'guides',
      'data',
      `${slug}.json`,
    ),
    join(
      homedir(),
      'projects',
      'content-vigilante',
      'packages',
      'core',
      'src',
      'guides',
      'data',
      `${slug}.json`,
    ),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error(
    `Could not find bundled guide "${slug}". Pass --guide <path> with a JSON or markdown brand guide.`,
  );
}

function findWebAppDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(process.cwd(), 'packages', 'web'),
    join(here, '..', '..', 'web'),
    join(here, '..', '..', '..', 'packages', 'web'),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'package.json')) && existsSync(join(candidate, 'app'))) {
      return candidate;
    }
  }
  throw new Error(
    'Could not find packages/web. Run `cv serve` from the Content Vigilante repo checkout.',
  );
}

async function loadGuide(guidePath?: string) {
  if (!guidePath) {
    return loadGuideFromJSON(findBundledGuidePath('mailchimp'));
  }
  const abs = isAbsolute(guidePath) ? guidePath : resolve(process.cwd(), guidePath);
  if (!existsSync(abs)) throw new Error(`Guide not found: ${abs}`);
  if (abs.endsWith('.json')) return loadGuideFromJSON(abs);
  if (abs.endsWith('.md') || abs.endsWith('.markdown')) return loadGuideFromMarkdown(abs);
  throw new Error(`Unsupported guide format: ${abs}. Use .json or .md.`);
}

async function readContent(input: string): Promise<{ text: string; language: 'en' | 'it' }> {
  const isURL = /^https?:\/\//i.test(input);
  if (isURL) {
    return extractContent({ type: 'url', value: input });
  }
  if (existsSync(input)) {
    const text = await readFile(input, 'utf8');
    return extractContent({ type: 'text', value: text });
  }
  // Treat as raw text.
  return extractContent({ type: 'text', value: input });
}

function severityIcon(severity: Issue['severity']): string {
  if (severity === 'high') return kleur.red('●');
  if (severity === 'medium') return kleur.yellow('●');
  return kleur.gray('●');
}

function printReport(result: AuditResult, sourceLabel: string): void {
  const score = result.score;
  const scoreColor = score >= 80 ? kleur.green : score >= 60 ? kleur.yellow : kleur.red;

  console.log();
  console.log(kleur.bold(`${sourceLabel}`));
  console.log(`Voice match: ${scoreColor(`${score}/100`)}  (${result.metadata.durationMs}ms)`);
  console.log(
    kleur.dim(
      `  tone ${result.dimensions.tone}  vocab ${result.dimensions.vocabulary}  structure ${result.dimensions.structure}  readability ${result.dimensions.readability}`,
    ),
  );
  console.log();

  if (result.issues.length === 0) {
    console.log(kleur.green('  ✓ No issues found.'));
  } else {
    console.log(kleur.bold(`  Issues (${result.issues.length}):`));
    for (const issue of result.issues) {
      console.log(
        `    ${severityIcon(issue.severity)} L${issue.line.toString().padStart(3)} ${kleur.bold(issue.type)}  "${issue.text}"`,
      );
      if (issue.rule) console.log(kleur.dim(`         rule: ${issue.rule}`));
      if (issue.suggestion) console.log(kleur.dim(`         try:  ${issue.suggestion}`));
    }
  }

  if (result.strengths.length > 0) {
    console.log();
    console.log(kleur.bold('  Strengths:'));
    for (const s of result.strengths) {
      console.log(kleur.green(`    ✓ ${s}`));
    }
  }
  console.log();
}

interface AuditOpts {
  guide?: string;
  provider?: string;
  model?: string;
  json?: boolean;
}

program
  .command('audit')
  .description('Audit a piece of content against your brand guide')
  .argument('<content>', 'path to a file, a URL, or raw text')
  .option(
    '-g, --guide <path>',
    'path to your brand guide (.json or .md). Defaults to bundled Mailchimp.',
  )
  .option(
    '-p, --provider <provider>',
    'llm provider: anthropic | openai | ollama (auto-detected from env if omitted)',
  )
  .option('-m, --model <model>', 'model name (provider-specific)')
  .option('-j, --json', 'output structured JSON instead of a human-readable report')
  .action(async (input: string, opts: AuditOpts) => {
    try {
      const guide = await loadGuide(opts.guide);
      const llm = pickProvider(opts.provider, opts.model);
      const { text, language } = await readContent(input);

      const result = await audit({ content: text, contentLanguage: language, guide, llm });

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      printReport(result, `${input}  (${language}, guide: ${guide.source}, llm: ${llm.name})`);
    } catch (err) {
      console.error(kleur.red(`✖ ${(err as Error).message}`));
      if (process.env['CV_DEBUG']) console.error(err);
      process.exit(1);
    }
  });

program
  .command('init')
  .description(
    'Initialize a brand guide (validates JSON, markdown, or URL — embedding store comes in v0.2)',
  )
  .option('-g, --guide <path>', 'path to your brand guide')
  .action(async (opts: { guide?: string }) => {
    try {
      const guide = await loadGuide(opts.guide);
      console.log(kleur.green(`✓ Loaded "${guide.source}" (${guide.language})`));
      console.log(`  ${guide.rules.length} rules indexed`);
      const byCategory: Record<string, number> = {};
      for (const r of guide.rules) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
      for (const [cat, count] of Object.entries(byCategory)) {
        console.log(kleur.dim(`  - ${cat}: ${count}`));
      }
      console.log();
      console.log(
        kleur.dim(
          'Persistence + embedding store land in v0.2. For now, run `cv audit` and the guide is loaded fresh each time.',
        ),
      );
    } catch (err) {
      console.error(kleur.red(`✖ ${(err as Error).message}`));
      process.exit(1);
    }
  });

program
  .command('serve')
  .description('Launch the local web UI')
  .option('-p, --port <port>', 'port to bind', '3000')
  .option('-H, --host <host>', 'host to bind', 'localhost')
  .action((opts: ServeOpts) => {
    try {
      const webDir = findWebAppDir();
      const port = opts.port ?? '3000';
      const host = opts.host ?? 'localhost';
      const urlHost = host === '0.0.0.0' ? 'localhost' : host;
      console.log(kleur.green(`Starting Content Vigilante web UI at http://${urlHost}:${port}`));
      console.log(kleur.dim(`Web app: ${webDir}`));

      const child = spawn('bun', ['run', 'dev', '--', '--hostname', host, '--port', port], {
        cwd: webDir,
        stdio: 'inherit',
        env: { ...process.env, PORT: port, HOSTNAME: host },
      });

      child.on('error', (err) => {
        console.error(kleur.red(`✖ Failed to start web UI: ${err.message}`));
        process.exit(1);
      });
      child.on('exit', (code, signal) => {
        if (signal) process.kill(process.pid, signal);
        process.exit(code ?? 0);
      });
    } catch (err) {
      console.error(kleur.red(`✖ ${(err as Error).message}`));
      process.exit(1);
    }
  });

program.parseAsync().catch((err: Error) => {
  console.error(kleur.red(`✖ ${err.message}`));
  process.exit(1);
});

const _envHint: Record<string, string> = PROVIDER_ENV;
void _envHint;
