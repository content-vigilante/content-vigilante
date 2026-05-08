import type { EmbeddingProvider } from '../embeddings/provider.ts';
import type { GuideStore } from '../store/index.ts';
import type { BrandGuide } from '../types.ts';

export interface IndexGuideResult {
  source: string;
  rulesIndexed: number;
  durationMs: number;
}

/**
 * Embed every rule in a guide and persist it to the store.
 *
 * Idempotent: deletes any existing rows for `guide.source` first, so
 * re-indexing the same guide replaces it cleanly.
 *
 * Each rule's `description` is what gets embedded — for v0.1 that's
 * enough signal. Future versions may also embed examples or the full
 * surrounding section.
 */
export async function indexGuide(
  guide: BrandGuide,
  store: GuideStore,
  embeddings: EmbeddingProvider,
): Promise<IndexGuideResult> {
  const start = Date.now();
  store.deleteSource(guide.source);

  const batchSize = embeddings.maxBatchSize;
  const items: Array<{ rule: (typeof guide.rules)[number]; embedding: Float32Array }> = [];

  for (let i = 0; i < guide.rules.length; i += batchSize) {
    const batch = guide.rules.slice(i, i + batchSize);
    const texts = batch.map((r) => r.description);
    const vectors = await embeddings.embed(texts);
    for (let j = 0; j < batch.length; j++) {
      const rule = batch[j];
      const vec = vectors[j];
      if (rule && vec) items.push({ rule, embedding: vec });
    }
  }

  store.upsertMany(items, guide.source, guide.language);

  return {
    source: guide.source,
    rulesIndexed: items.length,
    durationMs: Date.now() - start,
  };
}

/**
 * Retrieve top-k rules from a previously-indexed guide that are most
 * relevant to a piece of content.
 *
 * Use this to scale tone judging to large guides — rather than passing
 * all 200+ rules in the prompt, pass the top 15-20 most semantically
 * relevant.
 */
export async function retrieveRelevantRules(opts: {
  content: string;
  store: GuideStore;
  embeddings: EmbeddingProvider;
  source: string;
  k?: number;
  category?: 'tone' | 'vocabulary' | 'structure' | 'readability';
}): Promise<Array<{ id: string; description: string; category: string; distance: number }>> {
  const [queryEmbedding] = await opts.embeddings.embed([opts.content]);
  if (!queryEmbedding) return [];
  const rows = opts.store.search({
    embedding: queryEmbedding,
    k: opts.k ?? 15,
    source: opts.source,
    ...(opts.category ? { category: opts.category } : {}),
  });
  return rows.map((r) => ({
    id: r.ruleId,
    description: r.description,
    category: r.category,
    distance: r.distance ?? 1,
  }));
}
