import { describe, expect, it } from 'bun:test';
import { join } from 'node:path';
import { loadGuideFromJSON, parseGuide, parseMarkdownGuide } from '../src/guides/index.ts';
import { EmptyGuideError } from '../src/types.ts';

const MAILCHIMP_PATH = join(import.meta.dir, '..', 'src', 'guides', 'data', 'mailchimp.json');

describe('loadGuideFromJSON — real Mailchimp guide', () => {
  it('loads the bundled Mailchimp guide and contains 50+ rules', async () => {
    const guide = await loadGuideFromJSON(MAILCHIMP_PATH);
    expect(guide.source).toBe('mailchimp');
    expect(guide.language).toBe('en');
    expect(guide.rules.length).toBeGreaterThanOrEqual(50);
  });

  it('every rule has id, category, and description', async () => {
    const guide = await loadGuideFromJSON(MAILCHIMP_PATH);
    for (const rule of guide.rules) {
      expect(rule.id).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(['tone', 'vocabulary', 'structure', 'readability']).toContain(rule.category);
    }
  });

  it('covers all four issue categories', async () => {
    const guide = await loadGuideFromJSON(MAILCHIMP_PATH);
    const categories = new Set(guide.rules.map((r) => r.category));
    expect(categories.has('tone')).toBe(true);
    expect(categories.has('vocabulary')).toBe(true);
    expect(categories.has('structure')).toBe(true);
    expect(categories.has('readability')).toBe(true);
  });

  it('rule ids are unique', async () => {
    const guide = await loadGuideFromJSON(MAILCHIMP_PATH);
    const ids = guide.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('parseGuide validation', () => {
  it('throws EmptyGuideError when rules is empty', () => {
    expect(() => parseGuide({ source: 'test', language: 'en', rules: [] })).toThrow(
      EmptyGuideError,
    );
  });

  it('throws when a rule has no description', () => {
    expect(() =>
      parseGuide({
        source: 'test',
        language: 'en',
        rules: [{ id: 'x', category: 'tone' }],
      }),
    ).toThrow(/no description/);
  });

  it('throws on invalid category', () => {
    expect(() =>
      parseGuide({
        source: 'test',
        language: 'en',
        rules: [{ id: 'x', category: 'wrong-category', description: 'x' }],
      }),
    ).toThrow(/invalid category/);
  });

  it('throws on invalid language', () => {
    expect(() =>
      parseGuide({
        source: 'test',
        language: 'xx',
        rules: [{ id: 'x', category: 'tone', description: 'x' }],
      }),
    ).toThrow(/language must be/);
  });
});

describe('parseMarkdownGuide', () => {
  it('parses categorized bullet sections', () => {
    const md = `## Tone
- Speak plainly.
- Use contractions for an informal feel.

## Vocabulary
- Use "use" instead of "utilize".
`;
    const guide = parseMarkdownGuide(md, { source: 'test', language: 'en' });
    expect(guide.rules).toHaveLength(3);
    expect(guide.rules[0]?.category).toBe('tone');
    expect(guide.rules[2]?.category).toBe('vocabulary');
  });

  it('reads frontmatter for source + language', () => {
    const md = `---
source: my-brand
language: it
---

## Tone
- Sii diretto.
`;
    const guide = parseMarkdownGuide(md);
    expect(guide.source).toBe('my-brand');
    expect(guide.language).toBe('it');
  });

  it('throws when no rules are found', () => {
    expect(() => parseMarkdownGuide('# Just a heading\n\nSome prose.')).toThrow(EmptyGuideError);
  });

  it('skips bullets that are not under a recognized H2', () => {
    const md = `## Random Section
- This bullet should be ignored.

## Tone
- This one should be kept.
`;
    const guide = parseMarkdownGuide(md, { source: 'test', language: 'en' });
    expect(guide.rules).toHaveLength(1);
    expect(guide.rules[0]?.category).toBe('tone');
  });
});
