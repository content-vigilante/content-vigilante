import { describe, expect, mock, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import type { BrandGuide, LLMProvider } from '@content-vigilante/core';
import { createProgram } from '../src/program.ts';

const guide: BrandGuide = {
  source: 'mailchimp',
  language: 'en',
  rawText: '',
  rules: [
    { id: 'tone-1', category: 'tone', description: 'Be direct.' },
    { id: 'vocab-1', category: 'vocabulary', description: 'Avoid jargon.' },
  ],
};

const llm: LLMProvider = {
  name: 'test:llm',
  async generate() {
    return { text: '', tokensUsed: 0 };
  },
};

function createExitStub() {
  return mock((code: number) => {
    throw new Error(`Unexpected exit: ${code}`);
  }) as unknown as (code: number) => never;
}

describe('cv CLI', () => {
  test('init smoke test prints guide summary', async () => {
    const logs: string[] = [];
    const program = createProgram({
      env: {},
      log: (...args) => logs.push(args.join(' ')),
      error: () => undefined,
      exit: createExitStub(),
      loadGuide: async () => guide,
    });

    await program.parseAsync(['bun', 'cv', 'init']);

    expect(logs.some((line) => line.includes('Loaded "mailchimp" (en)'))).toBe(true);
    expect(logs.some((line) => line.includes('2 rules indexed'))).toBe(true);
  });

  test('audit --json smoke test prints structured output', async () => {
    const logs: string[] = [];
    const program = createProgram({
      env: {},
      log: (...args) => logs.push(args.join(' ')),
      error: () => undefined,
      exit: createExitStub(),
      loadGuide: async () => guide,
      pickProvider: () => llm,
      readContent: async () => ({ text: 'Hello world', language: 'en' }),
      auditContent: async () => ({
        score: 82,
        dimensions: { tone: 80, vocabulary: 85, structure: 82, readability: 81 },
        issues: [],
        strengths: ['Clear structure'],
        metadata: { judgeAgreement: 1, tokensUsed: 12, durationMs: 34 },
      }),
    });

    await program.parseAsync(['bun', 'cv', 'audit', 'Hello world', '--json']);

    expect(JSON.parse(logs[0] ?? '{}')).toMatchObject({
      score: 82,
      metadata: { tokensUsed: 12 },
    });
  });

  test('serve smoke test spawns the web dev server with host and port', async () => {
    const logs: string[] = [];
    const calls: Array<{
      cmd: string;
      args: string[];
      cwd?: string;
      env?: Record<string, string>;
    }> = [];
    const program = createProgram({
      env: {},
      log: (...args) => logs.push(args.join(' ')),
      error: () => undefined,
      exit: createExitStub(),
      findWebAppDir: () => '/tmp/content-vigilante-web',
      spawn: ((
        cmd: string,
        args: string[],
        opts?: { cwd?: string; env?: Record<string, string> },
      ) => {
        calls.push({ cmd, args, cwd: opts?.cwd, env: opts?.env });
        return new EventEmitter() as ChildProcessLike;
      }) as typeof process.spawn,
    });

    await program.parseAsync(['bun', 'cv', 'serve', '--port', '4321', '--host', '0.0.0.0']);

    expect(logs.some((line) => line.includes('http://localhost:4321'))).toBe(true);
    expect(calls).toEqual([
      {
        cmd: 'bun',
        args: ['run', 'dev', '--', '--hostname', '0.0.0.0', '--port', '4321'],
        cwd: '/tmp/content-vigilante-web',
        env: { PORT: '4321', HOSTNAME: '0.0.0.0' },
      },
    ]);
  });
});

type ChildProcessLike = EventEmitter & {
  on: EventEmitter['on'];
};
