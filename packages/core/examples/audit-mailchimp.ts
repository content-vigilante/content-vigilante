/**
 * End-to-end example: audit a piece of content against the Mailchimp brand guide.
 *
 * Run with:
 *   ANTHROPIC_API_KEY=sk-ant-... bun run packages/core/examples/audit-mailchimp.ts
 *
 * What this proves:
 *   - Real Mailchimp guide loads from packages/core/src/guides/data/mailchimp.json
 *   - LLM provider abstraction works against a real API
 *   - Tone judge returns line-level issues with severity, rule, and suggestion
 *   - audit() returns a structured AuditResult
 */

import { join } from 'node:path';
import { audit, createAnthropicProvider, loadGuideFromJSON } from '../src/index.ts';

const SAMPLE_OFF_BRAND = `We are pleased to announce our new synergistic platform.
This best-in-class solution will leverage cutting-edge AI to help our marketing ninjas
crush it across the funnel. We're confident our automagical workflow will utilize
your data to unlock value at scale.

Click here to learn more!!`;

const SAMPLE_ON_BRAND = `Today we're launching a new platform.
We built it to help your team move faster, with less manual work.
The setup is simple: connect your data, pick the templates you want, and you're done.

Read our pricing guide.`;

async function main() {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    console.error('Set ANTHROPIC_API_KEY in your env to run this example.');
    process.exit(1);
  }

  const guidePath = join(import.meta.dir, '..', 'src', 'guides', 'data', 'mailchimp.json');
  console.log(`Loading guide: ${guidePath}`);
  const guide = await loadGuideFromJSON(guidePath);
  console.log(`Loaded ${guide.rules.length} rules from "${guide.source}" (${guide.language})\n`);

  const llm = createAnthropicProvider({ apiKey });

  for (const [label, content] of [
    ['OFF-BRAND sample', SAMPLE_OFF_BRAND],
    ['ON-BRAND sample', SAMPLE_ON_BRAND],
  ] as const) {
    console.log('='.repeat(60));
    console.log(label);
    console.log('='.repeat(60));
    const result = await audit({
      content,
      contentLanguage: 'en',
      guide,
      llm,
    });

    console.log(`Score: ${result.score}/100  (${result.metadata.durationMs}ms)`);
    console.log(`Issues: ${result.issues.length}\n`);

    for (const issue of result.issues) {
      console.log(`  L${issue.line} [${issue.severity.toUpperCase()} ${issue.type}]`);
      console.log(`    text:       "${issue.text}"`);
      console.log(`    rule:       ${issue.rule}`);
      console.log(`    suggestion: ${issue.suggestion}\n`);
    }
  }
}

void main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
