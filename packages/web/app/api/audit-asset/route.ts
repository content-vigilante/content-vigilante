import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface AuditResult {
  altText: string;
  description: string;
  ocrText: string;
  contextSummary: string;
  brandCompliance: {
    score: number;
    palette?: string[];
    issues: Array<{ kind: string; message: string }>;
  };
}

const SYSTEM = `You are a brand-compliance auditor for marketing creative.
Given an image and (optionally) a brand guide, you return ONE JSON object with this shape:

{
  "altText": "<concise alt text, < 125 chars, no 'image of'>",
  "description": "<2-sentence description for content team>",
  "ocrText": "<any text visible in the image, verbatim, or empty string>",
  "contextSummary": "<1-2 sentences about what this asset would be useful for>",
  "brandCompliance": {
    "score": <0-100>,
    "palette": ["#hex1", "#hex2", ...up to 5],
    "issues": [
      { "kind": "color"|"logo"|"composition"|"text"|"accessibility", "message": "<one sentence>" }
    ]
  }
}

Be strict but practical. Output ONLY the JSON object. No prose, no markdown fences.`;

async function callAnthropic({
  apiKey,
  model,
  imageB64,
  mime,
  brandRules,
}: {
  apiKey: string;
  model: string;
  imageB64: string;
  mime: string;
  brandRules: string[];
}): Promise<string> {
  const userText = brandRules.length
    ? `Brand rules (must respect):\n- ${brandRules.join('\n- ')}\n\nAudit this image.`
    : 'Audit this image. No brand rules provided — use general brand-compliance best practices.';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: imageB64 } },
            { type: 'text', text: userText },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return json.content?.find((c) => c.type === 'text')?.text ?? '';
}

async function callOpenAI({
  apiKey,
  model,
  imageB64,
  mime,
  brandRules,
}: {
  apiKey: string;
  model: string;
  imageB64: string;
  mime: string;
  brandRules: string[];
}): Promise<string> {
  const userText = brandRules.length
    ? `Brand rules (must respect):\n- ${brandRules.join('\n- ')}\n\nAudit this image.`
    : 'Audit this image. Use general brand best practices.';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            {
              type: 'image_url',
              image_url: { url: `data:${mime};base64,${imageB64}` },
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? '';
}

function parseResult(raw: string): AuditResult {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in model output.');
  const obj = JSON.parse(match[0]) as Partial<AuditResult>;
  return {
    altText: obj.altText ?? '',
    description: obj.description ?? '',
    ocrText: obj.ocrText ?? '',
    contextSummary: obj.contextSummary ?? '',
    brandCompliance: {
      score: Math.max(0, Math.min(100, obj.brandCompliance?.score ?? 0)),
      palette: obj.brandCompliance?.palette,
      issues: obj.brandCompliance?.issues ?? [],
    },
  };
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'multipart/form-data required.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file field required.' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Image file required.' }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large (>8 MB).' }, { status: 400 });
  }

  const provider = (form.get('provider') as string) || 'anthropic';
  const apiKey = (form.get('apiKey') as string) || '';
  const model =
    (form.get('model') as string) ||
    (provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-4o-mini');
  const brandRulesRaw = (form.get('brandRules') as string) || '[]';
  let brandRules: string[] = [];
  try {
    const arr = JSON.parse(brandRulesRaw);
    if (Array.isArray(arr)) brandRules = arr.filter((s) => typeof s === 'string').slice(0, 20);
  } catch {
    /* ignore */
  }
  if (!apiKey) {
    return NextResponse.json({ error: 'apiKey required.' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const imageB64 = buf.toString('base64');
  const mime = file.type;

  try {
    const raw =
      provider === 'openai'
        ? await callOpenAI({ apiKey, model, imageB64, mime, brandRules })
        : await callAnthropic({ apiKey, model, imageB64, mime, brandRules });
    const result = parseResult(raw);
    return NextResponse.json({
      ...result,
      meta: { name: file.name, type: file.type, size: file.size },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
