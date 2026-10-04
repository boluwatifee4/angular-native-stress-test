import { Injectable } from '@angular/core';
import { ApiClient, ReportPayload } from './api.client';
import { ChaosService } from '../chaos/chaos.service';
import { StructuredReport } from '../data/models';

@Injectable()
export class FakeApiClient extends ApiClient {
  constructor(chaos: ChaosService) {
    super(chaos);
  }

  override async postReport(payload: ReportPayload, timeoutMs = 20000): Promise<StructuredReport> {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const headers = (init?.headers as Record<string, string>) || {};
        const chaosHeader = headers['x-chaos'];

        if (chaosHeader === 'rate-limit') {
          return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
        }
        if (chaosHeader === 'timeout') {
          await new Promise((resolve) => setTimeout(resolve, timeoutMs + 100));
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          throw err;
        }
        if (chaosHeader === 'malformed') {
          return new Response(JSON.stringify({ bad: true }), { status: 200 });
        }

        const bodyObj = JSON.parse((init?.body as string) || '{}');
        return new Response(
          JSON.stringify({
            title: `Inspection: ${(bodyObj.note || '').slice(0, 40)}`,
            severity: (bodyObj.note || '').toLowerCase().includes('crack') ? 'high' : 'medium',
            category: 'safety',
            summary: `Assessment for note: ${bodyObj.note}`,
            suggested_action: 'Perform safety check.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }) as typeof fetch;

      return await super.postReport(payload, timeoutMs);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
}
