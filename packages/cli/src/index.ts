#!/usr/bin/env bun
import { Command } from 'commander';
import kleur from 'kleur';

const program = new Command();

program
  .name('cv')
  .description('Content Vigilante — patrols your content for off-brand violations')
  .version('0.0.1');

program
  .command('audit')
  .description('Audit a piece of content against your brand guide')
  .argument('<content>', 'path to a file, or a URL')
  .option('-g, --guide <path>', 'path to your brand guide (PDF or markdown)')
  .option('-p, --provider <provider>', 'llm provider: anthropic | openai | ollama', 'anthropic')
  .option('-m, --model <model>', 'model name (provider-specific)')
  .option('-j, --json', 'output structured JSON instead of a human-readable report')
  .action((_content: string, _opts: Record<string, unknown>) => {
    console.log(kleur.yellow('audit is not yet implemented (lands week 1 day 5)'));
    process.exit(2);
  });

program
  .command('init')
  .description('Initialize a brand guide index in this directory')
  .option('-g, --guide <path>', 'path to your brand guide')
  .action((_opts: Record<string, unknown>) => {
    console.log(kleur.yellow('init is not yet implemented (lands week 1 day 2)'));
    process.exit(2);
  });

program
  .command('serve')
  .description('Launch the local web UI on http://localhost:3000')
  .action(() => {
    console.log(kleur.yellow('serve is not yet implemented (lands week 3)'));
    process.exit(2);
  });

program.parseAsync().catch((err: Error) => {
  console.error(kleur.red(`✖ ${err.message}`));
  process.exit(1);
});
