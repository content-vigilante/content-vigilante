import { readFile } from 'node:fs/promises';
import {
  type BrandGuide,
  type BrandRule,
  EmptyGuideError,
  type IssueType,
  type Language,
} from '../types.ts';

/**
 * Load a brand guide from a markdown file.
 *
 * Expected layout: H2 sections per category, bulleted rules underneath.
 *
 *   # Brand Guide — Source Name
 *
 *   ## Tone
 *   - Avoid corporate jargon. Speak plainly.
 *   - Use contractions for an informal tone.
 *
 *   ## Vocabulary
 *   - Use "use" instead of "utilize".
 *
 *   ## Structure
 *   - Use the Oxford comma.
 *
 *   ## Readability
 *   - Write short sentences.
 *
 * Each bullet becomes one rule. Category comes from the H2 above it.
 * Rule IDs are auto-generated as `{category-prefix}-{slug-of-first-words}`.
 *
 * `meta` block (optional, top of file as front-matter) controls source/language:
 *
 *   ---
 *   source: my-brand
 *   language: en
 *   ---
 */
export async function loadGuideFromMarkdown(
  path: string,
  opts: { source?: string; language?: Language } = {},
): Promise<BrandGuide> {
  const raw = await readFile(path, 'utf8');
  return parseMarkdownGuide(raw, opts);
}

export function parseMarkdownGuide(
  markdown: string,
  opts: { source?: string; language?: Language } = {},
): BrandGuide {
  const { body, frontmatter } = splitFrontmatter(markdown);
  const language = opts.language ?? frontmatter.language ?? 'en';
  const source = opts.source ?? frontmatter.source ?? 'unknown';

  if (language !== 'en' && language !== 'it') {
    throw new Error(`Guide language must be 'en' or 'it', got: ${language}`);
  }

  const rules: BrandRule[] = [];
  let currentCategory: IssueType | null = null;
  let bulletIdx = 0;

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();

    const h2Match = /^##\s+(.+)$/.exec(line);
    if (h2Match) {
      const heading = h2Match[1]?.toLowerCase().trim();
      currentCategory = headingToCategory(heading);
      bulletIdx = 0;
      continue;
    }

    const bulletMatch = /^[-*]\s+(.+)$/.exec(line);
    if (bulletMatch && currentCategory) {
      const description = bulletMatch[1]?.trim();
      if (!description) continue;
      bulletIdx += 1;
      rules.push({
        id: `${categoryPrefix(currentCategory)}-${slug(description)}-${bulletIdx}`,
        category: currentCategory,
        description,
      });
    }
  }

  if (rules.length === 0) {
    throw new EmptyGuideError(
      'No rules found in markdown guide. Expected H2 sections (## Tone, ## Vocabulary, etc.) with bullet points.',
    );
  }

  return {
    source,
    language,
    rawText: rules.map((r) => `[${r.category}] ${r.description}`).join('\n'),
    rules,
  };
}

function splitFrontmatter(markdown: string): {
  body: string;
  frontmatter: { source?: string; language?: Language };
} {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(markdown);
  if (!match) return { body: markdown, frontmatter: {} };

  const fm: Record<string, string> = {};
  for (const line of (match[1] ?? '').split('\n')) {
    const kv = /^(\w+)\s*:\s*(.+)$/.exec(line.trim());
    if (kv?.[1] && kv[2]) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }

  const language = fm['language'] === 'it' ? 'it' : fm['language'] === 'en' ? 'en' : undefined;
  return {
    body: markdown.slice(match[0].length),
    frontmatter: {
      ...(fm['source'] ? { source: fm['source'] } : {}),
      ...(language ? { language } : {}),
    },
  };
}

function headingToCategory(heading: string | undefined): IssueType | null {
  if (!heading) return null;
  if (/(?:^|\s)tone(?:$|\s)/i.test(heading)) return 'tone';
  if (/(?:^|\s)(?:vocab|vocabulary|word|words)(?:$|\s)/i.test(heading)) return 'vocabulary';
  if (/(?:^|\s)(?:structure|grammar|mechanics|formatting)(?:$|\s)/i.test(heading)) {
    return 'structure';
  }
  if (/(?:^|\s)(?:readability|accessibility|clarity)(?:$|\s)/i.test(heading)) return 'readability';
  return null;
}

function categoryPrefix(category: IssueType): string {
  switch (category) {
    case 'tone':
      return 'tone';
    case 'vocabulary':
      return 'vocab';
    case 'structure':
      return 'struct';
    case 'readability':
      return 'read';
  }
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .slice(0, 4)
    .join('-');
}
