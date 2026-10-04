import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { z } from 'zod';

const ReportSchema = z.object({
  title: z.string().max(80),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.enum(['safety', 'structural', 'electrical', 'plumbing', 'equipment', 'other']),
  summary: z.string().max(400),
  suggested_action: z.string().max(300),
});

const geminiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Short title for the inspection report (max 80 chars)' },
    severity: {
      type: Type.STRING,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    category: {
      type: Type.STRING,
      enum: ['safety', 'structural', 'electrical', 'plumbing', 'equipment', 'other'],
    },
    summary: { type: Type.STRING, description: 'Summary of the inspection findings (max 400 chars)' },
    suggested_action: { type: Type.STRING, description: 'Recommended remediation action (max 300 chars)' },
  },
  required: ['title', 'severity', 'category', 'summary', 'suggested_action'],
};

const apiKey = process.env.GEMINI_API_KEY || 'mock-key-for-test';
const ai = new GoogleGenAI({ apiKey });
const seen = new Map<string, unknown>();
let idempotencyHitCount = 0;
let modelCallCount = 0;

export function resetServerStats() {
  seen.clear();
  idempotencyHitCount = 0;
  modelCallCount = 0;
}

export const app = new Hono();

app.get('/stats', (c) => {
  return c.json({
    modelCalls: modelCallCount,
    idempotencyHits: idempotencyHitCount,
    cachedReportsCount: seen.size,
  });
});

app.post('/reports', async (c) => {
  const chaosEnabled = process.env.CHAOS_ENABLED === 'true';
  if (chaosEnabled) {
    const chaos = c.req.header('x-chaos');
    if (chaos === 'timeout') await new Promise((r) => setTimeout(r, 30_000));
    if (chaos === 'rate-limit') return c.json({ error: 'rate_limited' }, 429);
    if (chaos === 'malformed') return c.json({ bad: true });
  }

  const body = await c.req.json();
  const { id, note, photoBase64 } = body;

  if (!id || !note) {
    return c.json({ error: 'invalid_request', message: 'id and note are required' }, 400);
  }

  // Idempotency check: Return cached report if already processed
  if (seen.has(id)) {
    idempotencyHitCount++;
    console.log(`[Idempotency hit #${idempotencyHitCount}] Returning existing report for id: ${id}`);
    c.header('x-idempotent-hit', 'true');
    return c.json(seen.get(id));
  }

  // Increment modelCallCount for new non-cached processing
  modelCallCount++;

  // If mock key or test mode, return structured mock response
  if (process.env.MOCK_AI === 'true' || apiKey === 'mock-key-for-test') {
    const mockOutput = {
      title: `Inspection: ${note.slice(0, 40)}`,
      severity: note.toLowerCase().includes('crack') || note.toLowerCase().includes('danger') ? 'high' : 'medium',
      category: note.toLowerCase().includes('concrete') || note.toLowerCase().includes('wall') ? 'structural' : 'safety',
      summary: `Automated assessment based on note: "${note}".`,
      suggested_action: 'Perform on-site safety audit and tag out affected component.',
    };
    seen.set(id, mockOutput);
    return c.json(mockOutput);
  }

  try {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    if (photoBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: photoBase64,
        },
      });
    }
    parts.push({ text: `Inspection note: ${note}\nProduce the structured inspection report.` });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: geminiSchema,
        systemInstruction:
          'You are a certified industrial safety and structural inspector. Convert notes and photo evidence into clean JSON.',
      },
    });

    const rawJson = response.text || '{}';
    const parsed = ReportSchema.safeParse(JSON.parse(rawJson));

    if (!parsed.success) {
      console.error('Gemini output validation error:', parsed.error);
      return c.json({ error: 'invalid_model_output', details: parsed.error }, 502);
    }

    seen.set(id, parsed.data);
    return c.json(parsed.data);
  } catch (err: any) {
    console.error('Gemini API error:', err);
    return c.json({ error: 'ai_generation_error', message: err.message }, 500);
  }
});

const port = Number(process.env.PORT) || 8787;
console.log(`SiteLog Hono server starting on port ${port}...`);
serve({ fetch: app.fetch, port });
