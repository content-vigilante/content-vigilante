import {
  createAnthropicProvider,
  createOllamaProvider,
  createOpenAIProvider,
} from '@content-vigilante/core/llm';
import type { LLMProvider } from '@content-vigilante/core/types';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ContextSlice {
  name: string;
  text: string;
}

interface Body {
  provider?: 'anthropic' | 'openai' | 'ollama';
  apiKey?: string;
  model?: string;
  /** Free-form goal: "more LinkedIn engagement", "B2B leads in Italy"… */
  goal?: string;
  /** Platform target: linkedin/x/instagram/facebook/newsletter or "all" */
  platform?: string;
  /** Sliced context items — caller decides what to send */
  context?: ContextSlice[];
  /** Optional brand-rule summaries to bias the model */
  brandRules?: string[];
}

function pickProvider(
  provider: Body['provider'],
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

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const llm = pickProvider(body.provider, body.apiKey, body.model);
    const goal = body.goal?.trim() || 'grow engaged audience and convert it into qualified leads';
    const platform = body.platform || 'linkedin';

    const contextBlock = (body.context ?? [])
      .slice(0, 8)
      .map((c, i) => `### Source ${i + 1}: ${c.name}\n${c.text.slice(0, 4000)}`)
      .join('\n\n');

    const rulesBlock =
      (body.brandRules ?? []).length > 0
        ? `\n\nBRAND RULES (must respect):\n- ${body.brandRules?.slice(0, 12).join('\n- ')}`
        : '';

    const system =
      'You are a strategic content planner. You read raw context (research notes, transcripts, articles, brand notes), then propose specific, concrete content ideas. Never generic ("share a tip"). Always tied to something in the context.';

    const prompt = `Goal: ${goal}
Primary platform: ${platform}

CONTEXT FROM THE USER'S OWN FILES (use these — don't invent details):
${contextBlock || '(no context provided — improvise from goal)'}${rulesBlock}

Output ONLY a JSON array of 5 idea objects. Each object:
{
  "title": "<short, punchy hook>",
  "angle": "<one-sentence why this lands>",
  "draft": "<a 2–4 sentence ready-to-edit draft in the user's voice>",
  "sources": ["Source 1", "Source 3"]   // which input chunks back this up
}

No prose outside the JSON. No markdown fences.`;

    const { text } = await llm.generate({
      system,
      prompt,
      temperature: 0.6,
      maxTokens: 2200,
    });

    const match = text.match(/\[[\s\S]*\]/);
    let ideas: unknown[] = [];
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) ideas = parsed;
      } catch {
        /* fall through */
      }
    }
    if (ideas.length === 0) {
      return NextResponse.json(
        { error: 'LLM returned no parseable ideas.', raw: text.slice(0, 500) },
        { status: 502 },
      );
    }
    return NextResponse.json({ ideas });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
