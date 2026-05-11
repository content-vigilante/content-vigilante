import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type AuditResult,
  type BrandGuide,
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

const PROVIDER_ENV: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  ollama: 'OLLAMA_HOST',
};

interface ServeOpts {
  port?: string;
  host?: string;
}

interface AuditOpts {
  guide?: string;
  provider?: string;
  model?: string;
  json?: boolean;
}

export interface ProgramDeps {
  env: NodeJS.ProcessEnv;
  cwd: () => string;
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  exit: (code: number) => never;
  kill: typeof process.kill;
  spawn: typeof spawn;
  findBundledGuidePath: (slug: string) => string;
  findWebAppDir: () => string;
  loadGuide: (guidePath?: string) => Promise<BrandGuide>;
  pickProvider: (name: string | undefined, model: string | undefined) => LLMProvider;
  readContent: (input: string) => Promise<{ text: string; language: 'en' | 'it' }>;
  auditContent: typeof audit;
}

function autoDetectProvider(env: NodeJS.ProcessEnv): string {
  if (env['ANTHROPIC_API_KEY']) return 'anthropic';
  if (env['OPENAI_API_KEY']) return 'openai';
  return 'ollama';
}

function pickProviderFromEnv(
  env: NodeJS.ProcessEnv,
  name: string | undefined,
  model: string | undefined,
): LLMProvider {
  const provider = (name ?? autoDetectProvider(env)).toLowerCase();
  switch (provider) {
    case 'anthropic': {
      const apiKey = env['ANTHROPIC_API_KEY'];
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set in env');
      return createAnthropicProvider({
        apiKey,
        ...(model ? { model } : {}),
      });
    }
    case 'openai': {
      const apiKey = env['OPENAI_API_KEY'];
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

function findBundledGuidePathImpl(slug: string): string {
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
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Could not find bundled guide "${slug}". Pass --guide <path> with a JSON or markdown brand guide.`,
  );
}

function findWebAppDirImpl(): string {
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

async function loadGuideImpl(
  findBundledGuidePath: (slug: string) => string,
  cwd: () => string,
  guidePath?: string,
) {
  if (!guidePath) {
    return loadGuideFromJSON(findBundledGuidePath('mailchimp'));
  }
  const abs = isAbsolute(guidePath) ? guidePath : resolve(cwd(), guidePath);
  if (!existsSync(abs)) throw new Error(`Guide not found: ${abs}`);
  if (abs.endsWith('.json')) return loadGuideFromJSON(abs);
  if (abs.endsWith('.md') || abs.endsWith('.markdown')) return loadGuideFromMarkdown(abs);
  throw new Error(`Unsupported guide format: ${abs}. Use .json or .md.`);
}

async function readContentImpl(input: string): Promise<{ text: string; language: 'en' | 'it' }> {
  const isURL = /^https?:\/\//i.test(input);
  if (isURL) {
    return extractContent({ type: 'url', value: input });
  }
  if (existsSync(input)) {
    const text = await readFile(input, 'utf8');
    return extractContent({ type: 'text', value: text });
  }
  return extractContent({ type: 'text', value: input });
}

function severityIcon(severity: Issue['severity']): string {
  if (severity === 'high') return kleur.red('●');
  if (severity === 'medium') return kleur.yellow('●');
  return kleur.gray('●');
}

function printReport(log: ProgramDeps['log'], result: AuditResult, sourceLabel: string): void {
  const score = result.score;
  const scoreColor = score >= 80 ? kleur.green : score >= 60 ? kleur.yellow : kleur.red;

  log();
  log(kleur.bold(`${sourceLabel}`));
  log(`Voice match: ${scoreColor(`${score}/100`)}  (${result.metadata.durationMs}ms)`);
  log(
    kleur.dim(
      `  tone ${result.dimensions.tone}  vocab ${result.dimensions.vocabulary}  structure ${result.dimensions.structure}  readability ${result.dimensions.readability}`,
    ),
  );
  log();

  if (result.issues.length === 0) {
    log(kleur.green('  ✓ No issues found.'));
  } else {
    log(kleur.bold(`  Issues (${result.issues.length}):`));
    for (const issue of result.issues) {
      log(
        `    ${severityIcon(issue.severity)} L${issue.line.toString().padStart(3)} ${kleur.bold(issue.type)}  "${issue.text}"`,
      );
      if (issue.rule) log(kleur.dim(`         rule: ${issue.rule}`));
      if (issue.suggestion) log(kleur.dim(`         try:  ${issue.suggestion}`));
    }
  }

  if (result.strengths.length > 0) {
    log();
    log(kleur.bold('  Strengths:'));
    for (const strength of result.strengths) {
      log(kleur.green(`    ✓ ${strength}`));
    }
  }
  log();
}

function buildDefaultDeps(): ProgramDeps {
  return {
    env: process.env,
    cwd: () => process.cwd(),
    log: (...args) => console.log(...args),
    error: (...args) => console.error(...args),
    exit: (code) => process.exit(code),
    kill: process.kill.bind(process),
    spawn,
    findBundledGuidePath: findBundledGuidePathImpl,
    findWebAppDir: findWebAppDirImpl,
    loadGuide: (guidePath) =>
      loadGuideImpl(findBundledGuidePathImpl, () => process.cwd(), guidePath),
    pickProvider: (name, model) => pickProviderFromEnv(process.env, name, model),
    readContent: readContentImpl,
    auditContent: audit,
  };
}

export function createProgram(overrides: Partial<ProgramDeps> = {}): Command {
  const defaults = buildDefaultDeps();
  const deps: ProgramDeps = { ...defaults, ...overrides };
  const program = new Command();

  program
    .name('cv')
    .description('Content Vigilante — patrols your content for off-brand violations')
    .version('0.0.1');

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
        const guide = await deps.loadGuide(opts.guide);
        const llm = deps.pickProvider(opts.provider, opts.model);
        const { text, language } = await deps.readContent(input);
        const result = await deps.auditContent({
          content: text,
          contentLanguage: language,
          guide,
          llm,
        });

        if (opts.json) {
          deps.log(JSON.stringify(result, null, 2));
          return;
        }
        printReport(
          deps.log,
          result,
          `${input}  (${language}, guide: ${guide.source}, llm: ${llm.name})`,
        );
      } catch (err) {
        deps.error(kleur.red(`✖ ${(err as Error).message}`));
        if (deps.env['CV_DEBUG']) deps.error(err);
        deps.exit(1);
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
        const guide = await deps.loadGuide(opts.guide);
        deps.log(kleur.green(`✓ Loaded "${guide.source}" (${guide.language})`));
        deps.log(`  ${guide.rules.length} rules indexed`);
        const byCategory: Record<string, number> = {};
        for (const rule of guide.rules) {
          byCategory[rule.category] = (byCategory[rule.category] ?? 0) + 1;
        }
        for (const [cat, count] of Object.entries(byCategory)) {
          deps.log(kleur.dim(`  - ${cat}: ${count}`));
        }
        deps.log();
        deps.log(
          kleur.dim(
            'Persistence + embedding store land in v0.2. For now, run `cv audit` and the guide is loaded fresh each time.',
          ),
        );
      } catch (err) {
        deps.error(kleur.red(`✖ ${(err as Error).message}`));
        deps.exit(1);
      }
    });

  program
    .command('serve')
    .description('Launch the local web UI')
    .option('-p, --port <port>', 'port to bind', '3000')
    .option('-H, --host <host>', 'host to bind', 'localhost')
    .action((opts: ServeOpts) => {
      try {
        const webDir = deps.findWebAppDir();
        const port = opts.port ?? '3000';
        const host = opts.host ?? 'localhost';
        const urlHost = host === '0.0.0.0' ? 'localhost' : host;
        deps.log(kleur.green(`Starting Content Vigilante web UI at http://${urlHost}:${port}`));
        deps.log(kleur.dim(`Web app: ${webDir}`));

        const child = deps.spawn('bun', ['run', 'dev', '--', '--hostname', host, '--port', port], {
          cwd: webDir,
          stdio: 'inherit',
          env: { ...deps.env, PORT: port, HOSTNAME: host },
        });

        child.on('error', (err) => {
          deps.error(kleur.red(`✖ Failed to start web UI: ${err.message}`));
          deps.exit(1);
        });
        child.on('exit', (code, signal) => {
          if (signal) deps.kill(process.pid, signal);
          deps.exit(code ?? 0);
        });
      } catch (err) {
        deps.error(kleur.red(`✖ ${(err as Error).message}`));
        deps.exit(1);
      }
    });

  return program;
}

export const providerEnv = PROVIDER_ENV;
void providerEnv;
