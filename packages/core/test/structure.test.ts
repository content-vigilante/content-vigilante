import { describe, expect, it } from 'bun:test';
import { judgeStructure } from '../src/judges/structure.ts';

describe('judgeStructure', () => {
  it('counts sentences across . ! and ?', () => {
    const r = judgeStructure({
      content: 'Hello world. Are you there? Yes I am! Good.',
      language: 'en',
    });
    expect(r.metrics.sentenceCount).toBe(4);
  });

  it('flags sentences over 30 words at medium severity', () => {
    const long = `${Array.from({ length: 35 }, (_, i) => `word${i}`).join(' ')}.`;
    const r = judgeStructure({ content: long, language: 'en' });
    const issue = r.issues.find((i) => i.type === 'structure' && i.severity === 'medium');
    expect(issue).toBeDefined();
  });

  it('flags sentences over 45 words at high severity', () => {
    const long = `${Array.from({ length: 50 }, (_, i) => `word${i}`).join(' ')}.`;
    const r = judgeStructure({ content: long, language: 'en' });
    const issue = r.issues.find((i) => i.type === 'structure' && i.severity === 'high');
    expect(issue).toBeDefined();
  });

  it('computes Flesch-Kincaid grade on a Wikipedia-style sample', () => {
    // Wikipedia opener about Albert Einstein.
    const sample =
      'Albert Einstein was a German-born theoretical physicist. He developed the theory of relativity, one of the two pillars of modern physics. His work is also known for its influence on the philosophy of science.';
    const r = judgeStructure({
      content: sample,
      language: 'en',
      targets: { gradeLevelMax: 20 },
    });
    expect(r.metrics.gradeLevel).toBeGreaterThan(5);
    expect(r.metrics.gradeLevel).toBeLessThan(20);
  });

  it('computes Gulpease score on Italian sample', () => {
    const sample =
      'Il gatto dorme sul tetto. La casa è bella. I bambini giocano nel parco. Il sole splende oggi.';
    const r = judgeStructure({ content: sample, language: 'it' });
    expect(r.metrics.gulpease).toBeGreaterThan(60);
    expect(r.metrics.gradeLevel).toBeUndefined();
  });

  it('detects passive voice', () => {
    const r = judgeStructure({
      content:
        'The report was written by the team. The plan was approved by management. The bug was fixed by the engineer. The launch was celebrated by everyone.',
      language: 'en',
      targets: { gradeLevelMax: 99 },
    });
    expect(r.metrics.passiveRatio).toBeGreaterThan(0.5);
    expect(r.issues.some((i) => i.type === 'readability' && /passive/i.test(i.rule))).toBe(true);
  });

  it('does not flag active sentences as passive', () => {
    const r = judgeStructure({
      content: 'The team wrote the report. Management approved the plan. Engineers fixed the bug.',
      language: 'en',
      targets: { gradeLevelMax: 99 },
    });
    expect(r.metrics.passiveRatio).toBe(0);
  });

  it('flags 3+ consecutive sentences with same start word', () => {
    const r = judgeStructure({
      content: 'The cat sat down. The dog ran fast. The bird flew away.',
      language: 'en',
      targets: { gradeLevelMax: 99 },
    });
    expect(r.issues.some((i) => /start with/i.test(i.rule))).toBe(true);
  });

  it('flags paragraphs over 6 sentences', () => {
    const longPara = Array.from({ length: 8 }, (_, i) => `Sentence number ${i} here.`).join(' ');
    const r = judgeStructure({
      content: longPara,
      language: 'en',
      targets: { gradeLevelMax: 99 },
    });
    expect(
      r.issues.some((i) => i.type === 'structure' && /wall of text|6 sentences/i.test(i.rule)),
    ).toBe(true);
  });

  it('respects targets override', () => {
    const sample = 'The report was written. The plan was approved. The bug was fixed.';
    const strict = judgeStructure({
      content: sample,
      language: 'en',
      targets: { passiveRatioMax: 0.1, gradeLevelMax: 99 },
    });
    const lax = judgeStructure({
      content: sample,
      language: 'en',
      targets: { passiveRatioMax: 1, gradeLevelMax: 99 },
    });
    expect(strict.issues.length).toBeGreaterThan(lax.issues.length);
  });

  it('runs synchronously and handles empty content', () => {
    const r = judgeStructure({ content: '', language: 'en' });
    expect(r.metrics.sentenceCount).toBe(0);
    expect(r.metrics.wordCount).toBe(0);
    expect(r.issues).toEqual([]);
    expect(r.structureScore).toBe(100);
    expect(r.readabilityScore).toBe(100);
  });

  it('skips code blocks when counting sentences', () => {
    const content = [
      'This is prose. Another sentence.',
      '',
      '```',
      'const x = 1. const y = 2. const z = 3.',
      '```',
      '',
      'More prose here.',
    ].join('\n');
    const r = judgeStructure({ content, language: 'en', targets: { gradeLevelMax: 99 } });
    expect(r.metrics.sentenceCount).toBe(3);
  });
});
