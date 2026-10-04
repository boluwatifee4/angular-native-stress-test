import { Injectable } from '@angular/core';
import { ChaosService } from '../chaos/chaos.service';
import { StructuredReport } from '../data/models';

export interface ReportPayload {
  id: string;
  note: string;
  photoBase64?: string | null;
}

export const DEFAULT_SERVER_URL = 'http://localhost:8787/reports';

@Injectable({
  providedIn: 'root',
})
export class ApiClient {
  private serverUrl = DEFAULT_SERVER_URL;

  constructor(
    protected chaos: ChaosService,
    protected fetchFn: typeof fetch = (url, init) => globalThis.fetch(url, init)
  ) {}

  setServerUrl(url: string) {
    this.serverUrl = url;
  }

  async postReport(payload: ReportPayload, timeoutMs = 20000): Promise<StructuredReport> {
    // 1. Check artificial client offline state
    if (this.chaos.offline()) {
      throw new Error('Network error: syncing is turned off from Diagnostics');
    }

    // 2. Apply artificial latency
    const latency = this.chaos.latencyMs();
    if (latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }

    // 3. Apply artificial client failNext drops
    const remainingFails = this.chaos.failNext();
    if (remainingFails > 0) {
      this.chaos.setFailNext(remainingFails - 1);
      throw new Error('Simulated network connection drop (Diagnostics)');
    }

    // 4. Prepare request headers & server chaos header
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const serverChaosMode = this.chaos.serverChaos();
    if (serverChaosMode !== 'none') {
      headers['x-chaos'] = serverChaosMode;
    }

    // 5. AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchFn(this.serverUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        throw new Error('HTTP 429: Rate limited by server');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Server returned error`);
      }

      const json = await response.json();

      // Validate required report fields
      if (!json || typeof json.title !== 'string' || !json.severity || !json.summary) {
        throw new Error('Malformed JSON output from server');
      }

      return json as StructuredReport;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }
}
