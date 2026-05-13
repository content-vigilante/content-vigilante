import {
  createAnthropicProvider,
  createOllamaProvider,
  createOpenAIProvider,
} from '@content-vigilante/core/llm';
import type { BrandRule, IssueType, LLMProvider, Language } from '@content-vigilante/core/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VALID_CATEGORIES: IssueType[] = ['tone', 'vocabulary', 'structure', 'readability'];

function pickProvider(
  provider: 'anthropic' | 'openai' | 'ollama' | undefined,
  apiKey: string | undefined,
  model: string | undefined,
): LLMProvider {
  switch (provider) {
    case 'anthropic':
      if (!apiKey) throw new Error('API key required for Anthropic.');
      return createAnthropicProvider({ apiKey, ...(model ? { model } : {}) });
    case 'openai':
      if (!apiKey) throw new Error('API key required for OpenAI.');
      return createOpenAIProvider({ apiKey, ...(model ? { model } : {}) });
    case 'ollama':
      return createOllamaProvider({ ...(model ? { model } : {}) });
    default:
      throw new Error(`Unknown provider: ${String(provider)}`);
  }
}

function heuristicRules(text: string): BrandRule[] {
  const rules: BrandRule[] = [];
  const lower = text.toLowerCase();

  const bannedMatches = text.match(
    /(?:avoid|don't use|never use|do not use)[^.]*?["“]([^"”]+)["”]/gi,
  );
  if (bannedMatches) {
    const terms = new Set<string>();
    for (const m of bannedMatches) {
      const q = m.match(/["“]([^"”]+)["”]/);
      if (q?.[1]) terms.add(q[1].toLowerCase().trim());
    }
    for (const t of terms) {
      rules.push({
        id: `vocab-${t.replace(/\s+/g, '-').slice(0, 24)}`,
        category: 'vocabulary',
        description: `Avoid the term "${t}".`,
        examples: { bad: [t] },
      });
    }
  }

  if (/inclusive|gender-neutral|accessible/.test(lower)) {
    rules.push({
      id: 'tone-inclusive',
      category: 'tone',
      description: 'Use inclusive, gender-neutral, accessible language.',
    });
  }
  if (/active voice/.test(lower)) {
    rules.push({
      id: 'structure-active-voice',
      category: 'structure',
      description: 'Prefer active voice over passive voice.',
    });
  }
  if (/short sentence|concise|brevity|plain language/.test(lower)) {
    rules.push({
      id: 'readability-concise',
      category: 'readability',
      description: 'Keep sentences short and concise; prefer plain language.',
    });
  }
  return rules;
}

async function llmExtractRules(text: string, llm: LLMProvider): Promise<BrandRule[]> {
  const system =
    'You extract structured brand-voice rules from a brand guideline document. Output ONLY a JSON array of rule objects. No prose, no markdown fences.';
  const prompt = `Extract 8 to 20 concrete, enforceable brand-voice rules from this document.

Each rule MUST be an object with:
- "id": short kebab-case identifier (e.g. "vocab-utilize")
- "category": one of "tone" | "vocabulary" | "structure" | "readability"
- "description": one sentence, imperative, actionable
- "examples": OPTIONAL { "good": [string], "bad": [string] }

Rules of extraction:
- Skip generic platitudes ("be authentic"). Only rules that can be CHECKED against a piece of text.
- Vocabulary rules should name specific forbidden or preferred terms.
- Output ONLY the JSON array.

DOCUMENT:
"""
${text.slice(0, 18000)}
"""`;

  const { text: out } = await llm.generate({
    system,
    prompt,
    temperature: 0.2,
    maxTokens: 3000,
  });

  const match = out.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is BrandRule =>
          r &&
          typeof r.id === 'string' &&
          typeof r.description === 'string' &&
          VALID_CATEGORIES.includes(r.category),
      )
      .slice(0, 30);
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'multipart/form-data required.' }, { status: 400 });
  }
  const file = form.get('file');
  const provider = (form.get('provider') as Body['provider']) ?? undefined;
  const apiKey = (form.get('apiKey') as string) ?? undefined;
  const model = (form.get('model') as string) ?? undefined;
  const language = ((form.get('language') as string) ?? 'en') as Language;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'PDF file is required (field "file").' }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF uploads are supported.' }, { status: 400 });
  }

  let text: string;
  try {
    const pdfParseMod = (await import('pdf-parse')) as unknown as {
      default?: (b: Buffer) => Promise<{ text?: string }>;
      pdf?: (b: Buffer) => Promise<{ text?: string }>;
    } & ((b: Buffer) => Promise<{ text?: string }>);
    const pdfParse =
      pdfParseMod.default ??
      pdfParseMod.pdf ??
      (pdfParseMod as unknown as (b: Buffer) => Promise<{ text?: string }>);
    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buf);
    text = parsed.text ?? '';
  } catch (err) {
    return NextResponse.json(
      { error: `PDF parse failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }
  if (text.trim().length < 200) {
    return NextResponse.json(
      { error: 'Extracted text is too short to be a brand guide.' },
      { status: 400 },
    );
  }

  const heuristic = heuristicRules(text);
  let llmRules: BrandRule[] = [];
  if (apiKey || provider === 'ollama') {
    try {
      const llm = pickProvider(provider, apiKey, model);
      llmRules = await llmExtractRules(text, llm);
    } catch (err) {
      return NextResponse.json(
        {
          error: `LLM extraction failed: ${(err as Error).message}`,
          partial: { rules: heuristic, rawText: text.slice(0, 20000) },
        },
        { status: 502 },
      );
    }
  }

  const seen = new Set<string>();
  const rules = [...llmRules, ...heuristic].filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return NextResponse.json({
    guide: {
      source: file.name.replace(/\.pdf$/i, ''),
      language,
      rules,
      rawText: text.slice(0, 40000),
    },
    counts: {
      heuristic: heuristic.length,
      llm: llmRules.length,
      total: rules.length,
    },
  });
}

interface Body {
  provider?: 'anthropic' | 'openai' | 'ollama';
}
