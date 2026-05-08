import { readFile } from 'node:fs/promises';
import {
  type BrandGuide,
  type BrandRule,
  EmptyGuideError,
  type IssueType,
  type Language,
} from '../types.ts';

/**
 * Load a structured brand guide from a JSON file.
 *
 * Expected shape (matches packages/core/src/guides/data/*.json):
 *
 *   {
 *     "source": "mailchimp",
 *     "language": "en",
 *     "version": "extracted-2026-05-07",
 *     "url": "https://styleguide.mailchimp.com/",
 *     "license": "CC BY-NC 4.0",
 *     "rules": [
 *       { "id": "vocab-utilize", "category": "vocabulary",
 *         "description": "Use \"use\" instead of \"utilize\".",
 *         "examples": { "good": [...], "bad": [...] } }
 *     ]
 *   }
 *
 * Validates that:
 *   - rules array is non-empty
 *   - every rule has id + category + description
 *   - category is one of: tone | vocabulary | structure | readability
 *
 * Throws EmptyGuideError if the file has no rules.
 */
export async function loadGuideFromJSON(path: string): Promise<BrandGuide> {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw) as RawGuide;
  return parseGuide(parsed);
}

/**
 * Same as loadGuideFromJSON but takes a parsed object directly.
 * Useful for embedding guides as imports in tests / examples.
 */
export function parseGuide(raw: RawGuide): BrandGuide {
  if (!Array.isArray(raw.rules) || raw.rules.length === 0) {
    throw new EmptyGuideError(`Guide "${raw.source ?? 'unknown'}" has no rules`);
  }

  const rules: BrandRule[] = raw.rules.map((r, idx) => {
    if (!r.id) throw new Error(`Rule at index ${idx} has no id`);
    if (!r.description) throw new Error(`Rule "${r.id}" has no description`);
    if (!isIssueType(r.category)) {
      throw new Error(`Rule "${r.id}" has invalid category: ${String(r.category)}`);
    }
    return {
      id: r.id,
      category: r.category,
      description: r.description,
      ...(r.examples ? { examples: r.examples } : {}),
    };
  });

  if (!isLanguage(raw.language)) {
    throw new Error(`Guide language must be 'en' or 'it', got: ${String(raw.language)}`);
  }

  return {
    source: raw.source ?? 'unknown',
    language: raw.language,
    rawText: rules.map((r) => `[${r.category}] ${r.description}`).join('\n'),
    rules,
  };
}

interface RawGuide {
  source?: string;
  language?: string;
  version?: string;
  url?: string;
  license?: string;
  rules?: Array<{
    id?: string;
    category?: string;
    description?: string;
    examples?: { good?: string[]; bad?: string[] };
  }>;
}

function isIssueType(v: unknown): v is IssueType {
  return v === 'tone' || v === 'vocabulary' || v === 'structure' || v === 'readability';
}

function isLanguage(v: unknown): v is Language {
  return v === 'en' || v === 'it';
}
