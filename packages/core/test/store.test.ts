import { describe, expect, it } from 'bun:test';
import type { EmbeddingProvider } from '../src/embeddings/provider.ts';
import { indexGuide, retrieveRelevantRules } from '../src/guides/indexGuide.ts';
import { GuideStore } from '../src/store/sqlite-vec.ts';
import type { BrandGuide } from '../src/types.ts';

/**
 * Deterministic mock embedding provider — produces vectors that depend
 * on the input text in a way we can assert against (lexical overlap with
 * a small bag-of-words vocabulary).
 *
 * Useful so retrieval tests can assert "rule A came back before rule B"
 * without spinning up Ollama or burning OpenAI tokens.
 */
function lexicalEmbeddingProvider(dimensions = 16): EmbeddingProvider {
  const vocab = [
    'use',
    'utilize',
    'tone',
    'voice',
    'jargon',
    'leverage',
    'sentence',
    'short',
    'long',
    'oxford',
    'comma',
    'list',
    'click',
    'here',
    'link',
    'plain',
  ];
  const dim = Math.max(dimensions, vocab.length);
  return {
    id: 'mock:lexical',
    dimensions: dim,
    maxBatchSize: 32,
    async embed(texts: string[]): Promise<Float32Array[]> {
      return texts.map((text) => {
        const v = new Float32Array(dim);
        const lower = text.toLowerCase();
        for (let i = 0; i < vocab.length; i++) {
          const word = vocab[i];
          if (word && lower.includes(word)) v[i] = 1;
        }
        return v;
      });
    },
  };
}

const tinyGuide: BrandGuide = {
  source: 'mock-guide',
  language: 'en',
  rawText: '',
  rules: [
    { id: 'vocab-utilize', category: 'vocabulary', description: 'Use "use" instead of "utilize".' },
    { id: 'vocab-leverage', category: 'vocabulary', description: 'Avoid "leverage" as a verb.' },
    { id: 'tone-plain', category: 'tone', description: 'Use plain language. Avoid jargon.' },
    { id: 'struct-oxford', category: 'structure', description: 'Use the Oxford comma in a list.' },
    {
      id: 'read-link-text',
      category: 'readability',
      description: 'Avoid "Click here" — use descriptive link text.',
    },
  ],
};

describe('GuideStore (sqlite-vec)', () => {
  it('inserts rules and queries them back', async () => {
    const embeddings = lexicalEmbeddingProvider();
    const store = new GuideStore({ path: ':memory:', dimensions: embeddings.dimensions });

    const result = await indexGuide(tinyGuide, store, embeddings);
    expect(result.rulesIndexed).toBe(5);
    expect(store.countForSource('mock-guide')).toBe(5);

    store.close();
  });

  it('retrieves the most relevant rule for a query', async () => {
    const embeddings = lexicalEmbeddingProvider();
    const store = new GuideStore({ path: ':memory:', dimensions: embeddings.dimensions });
    await indexGuide(tinyGuide, store, embeddings);

    const hits = await retrieveRelevantRules({
      content: 'We need to utilize this template.',
      store,
      embeddings,
      source: 'mock-guide',
      k: 3,
    });
    expect(hits.length).toBeGreaterThan(0);
    const ids = hits.map((h) => h.id);
    expect(ids).toContain('vocab-utilize');
    store.close();
  });

  it('filters retrieval by category', async () => {
    const embeddings = lexicalEmbeddingProvider();
    const store = new GuideStore({ path: ':memory:', dimensions: embeddings.dimensions });
    await indexGuide(tinyGuide, store, embeddings);

    const hits = await retrieveRelevantRules({
      content: 'Use plain language and avoid jargon.',
      store,
      embeddings,
      source: 'mock-guide',
      category: 'tone',
      k: 5,
    });
    for (const h of hits) {
      expect(h.category).toBe('tone');
    }
    store.close();
  });

  it('re-indexing the same source replaces old rows', async () => {
    const embeddings = lexicalEmbeddingProvider();
    const store = new GuideStore({ path: ':memory:', dimensions: embeddings.dimensions });
    await indexGuide(tinyGuide, store, embeddings);
    expect(store.countForSource('mock-guide')).toBe(5);

    const fewerRules: BrandGuide = {
      ...tinyGuide,
      rules: tinyGuide.rules.slice(0, 2),
    };
    await indexGuide(fewerRules, store, embeddings);
    expect(store.countForSource('mock-guide')).toBe(2);
    store.close();
  });

  it('rejects mismatched embedding dimensions on upsert', () => {
    const embeddings = lexicalEmbeddingProvider();
    const store = new GuideStore({ path: ':memory:', dimensions: embeddings.dimensions });
    expect(() =>
      store.upsert(
        tinyGuide.rules[0]!,
        'mock-guide',
        'en',
        new Float32Array(4), // wrong size
      ),
    ).toThrow(/dimensions/);
    store.close();
  });

  it('different sources are isolated', async () => {
    const embeddings = lexicalEmbeddingProvider();
    const store = new GuideStore({ path: ':memory:', dimensions: embeddings.dimensions });

    await indexGuide(tinyGuide, store, embeddings);
    await indexGuide({ ...tinyGuide, source: 'other-guide' }, store, embeddings);

    expect(store.countForSource('mock-guide')).toBe(5);
    expect(store.countForSource('other-guide')).toBe(5);

    const hits = await retrieveRelevantRules({
      content: 'utilize',
      store,
      embeddings,
      source: 'other-guide',
      k: 5,
    });
    for (const h of hits) {
      expect(h.id).not.toBe('mock-guide::vocab-utilize');
    }
    store.close();
  });
});
