import { Database } from 'bun:sqlite';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import * as sqliteVec from 'sqlite-vec';
import type { BrandRule, IssueType, Language } from '../types.ts';

export interface RuleRow {
  ruleId: string;
  description: string;
  category: IssueType;
  source: string;
  language: Language;
  /** Cosine distance from the query (lower = closer). Only set on retrieval. */
  distance?: number;
}

export interface GuideStoreOptions {
  /** File path; ":memory:" for in-memory. */
  path: string;
  /** Vector dimensions. Must match the embedding provider. */
  dimensions: number;
  /**
   * Path to a libsqlite3 with loadable extensions enabled.
   * Defaults to auto-detection (homebrew on macOS, system on Linux).
   * Can also be set via CV_SQLITE_LIB env var.
   */
  customSQLitePath?: string;
}

let customSQLiteApplied = false;

/**
 * Local vector store for brand-guide rules.
 *
 * Backed by sqlite-vec on top of bun:sqlite. Bun's bundled SQLite has
 * extension-loading disabled, so we point bun at a system libsqlite3
 * that has it enabled (homebrew on macOS, distro libsqlite3 on Linux).
 *
 * Schema:
 *   CREATE VIRTUAL TABLE guide_chunks USING vec0(
 *     rule_id TEXT PRIMARY KEY,
 *     embedding float[N],
 *     +description TEXT,
 *     +category TEXT,
 *     +source TEXT,
 *     +language TEXT
 *   )
 *
 * The `+` prefix marks columns as auxiliary (stored, not indexed) — fast
 * to read back alongside the vector match.
 */
export class GuideStore {
  private readonly db: Database;
  private readonly dimensions: number;

  constructor(opts: GuideStoreOptions) {
    ensureCustomSQLite(opts.customSQLitePath);
    this.db = new Database(opts.path);
    this.dimensions = opts.dimensions;
    sqliteVec.load(this.db);
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS guide_chunks USING vec0(
        rule_id TEXT PRIMARY KEY,
        embedding float[${this.dimensions}],
        +description TEXT,
        +category TEXT,
        +source TEXT,
        +language TEXT
      )
    `);
  }

  /**
   * Insert or replace one rule + its embedding.
   * The embedding's length must equal this.dimensions.
   */
  upsert(rule: BrandRule, source: string, language: Language, embedding: Float32Array): void {
    if (embedding.length !== this.dimensions) {
      throw new Error(
        `Embedding length ${embedding.length} does not match store dimensions ${this.dimensions}`,
      );
    }
    this.db
      .prepare(
        'INSERT OR REPLACE INTO guide_chunks (rule_id, embedding, description, category, source, language) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        `${source}::${rule.id}`,
        new Uint8Array(embedding.buffer, embedding.byteOffset, embedding.byteLength),
        rule.description,
        rule.category,
        source,
        language,
      );
  }

  /**
   * Batch upsert. ~10x faster than calling upsert() in a loop on large guides.
   */
  upsertMany(
    items: ReadonlyArray<{ rule: BrandRule; embedding: Float32Array }>,
    source: string,
    language: Language,
  ): void {
    const insert = this.db.prepare(
      'INSERT OR REPLACE INTO guide_chunks (rule_id, embedding, description, category, source, language) VALUES (?, ?, ?, ?, ?, ?)',
    );
    const tx = this.db.transaction(
      (
        rows: ReadonlyArray<{
          ruleId: string;
          embedding: Uint8Array;
          description: string;
          category: string;
          source: string;
          language: string;
        }>,
      ) => {
        for (const r of rows) {
          insert.run(r.ruleId, r.embedding, r.description, r.category, r.source, r.language);
        }
      },
    );
    tx(
      items.map((i) => {
        if (i.embedding.length !== this.dimensions) {
          throw new Error(
            `Embedding length ${i.embedding.length} does not match store dimensions ${this.dimensions}`,
          );
        }
        return {
          ruleId: `${source}::${i.rule.id}`,
          embedding: new Uint8Array(
            i.embedding.buffer,
            i.embedding.byteOffset,
            i.embedding.byteLength,
          ),
          description: i.rule.description,
          category: i.rule.category,
          source,
          language,
        };
      }),
    );
  }

  /**
   * Top-k nearest rules to the query embedding, optionally filtered by source
   * and/or category. Results are ordered by distance ascending.
   *
   * sqlite-vec's vec0 doesn't allow WHERE constraints on auxiliary columns
   * inside the KNN query, so we oversample (request 4x the asked-for k) then
   * filter and trim in memory. Plenty fast for guide-sized stores (<10k rules).
   */
  search(query: {
    embedding: Float32Array;
    k: number;
    source?: string;
    category?: IssueType;
  }): RuleRow[] {
    if (query.embedding.length !== this.dimensions) {
      throw new Error(
        `Query embedding length ${query.embedding.length} does not match store dimensions ${this.dimensions}`,
      );
    }
    const oversampleK = query.source || query.category ? query.k * 4 : query.k;
    const sql = `
      SELECT rule_id, description, category, source, language, distance
      FROM guide_chunks
      WHERE embedding MATCH ?
        AND k = ?
      ORDER BY distance
    `;
    const rows = this.db
      .prepare(sql)
      .all(
        new Uint8Array(
          query.embedding.buffer,
          query.embedding.byteOffset,
          query.embedding.byteLength,
        ),
        oversampleK,
      ) as Array<{
      rule_id: string;
      description: string;
      category: string;
      source: string;
      language: string;
      distance: number;
    }>;
    let results: RuleRow[] = rows.map((r) => ({
      ruleId: stripSourcePrefix(r.rule_id),
      description: r.description,
      category: r.category as IssueType,
      source: r.source,
      language: r.language as Language,
      distance: r.distance,
    }));
    if (query.source) results = results.filter((r) => r.source === query.source);
    if (query.category) results = results.filter((r) => r.category === query.category);
    return results.slice(0, query.k);
  }

  /** How many rules are indexed for a given source. */
  countForSource(source: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM guide_chunks WHERE source = ?')
      .get(source) as { count: number };
    return row.count;
  }

  /** Drop every row for a given source. Used when re-indexing. */
  deleteSource(source: string): void {
    this.db.prepare('DELETE FROM guide_chunks WHERE source = ?').run(source);
  }

  close(): void {
    this.db.close();
  }
}

function ensureCustomSQLite(explicitPath?: string): void {
  if (customSQLiteApplied) return;
  const path = explicitPath ?? process.env['CV_SQLITE_LIB'] ?? findSystemSQLite();
  if (!path) {
    throw new Error(
      'Could not locate a libsqlite3 with extension loading enabled. ' +
        'On macOS install homebrew sqlite (`brew install sqlite`); on Linux install libsqlite3-dev. ' +
        'Or set CV_SQLITE_LIB to a libsqlite3 path explicitly.',
    );
  }
  Database.setCustomSQLite(path);
  customSQLiteApplied = true;
}

function findSystemSQLite(): string | null {
  const candidates: string[] = [];
  if (platform() === 'darwin') {
    candidates.push(
      '/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib',
      '/usr/local/opt/sqlite/lib/libsqlite3.dylib',
    );
  } else if (platform() === 'linux') {
    candidates.push(
      '/usr/lib/x86_64-linux-gnu/libsqlite3.so',
      '/usr/lib/x86_64-linux-gnu/libsqlite3.so.0',
      '/usr/lib/aarch64-linux-gnu/libsqlite3.so',
      '/usr/lib/aarch64-linux-gnu/libsqlite3.so.0',
      '/usr/lib64/libsqlite3.so',
      '/usr/lib/libsqlite3.so',
    );
  }
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function stripSourcePrefix(prefixedId: string): string {
  const idx = prefixedId.indexOf('::');
  return idx === -1 ? prefixedId : prefixedId.slice(idx + 2);
}
