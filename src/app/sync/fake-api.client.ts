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
    if (this.chaos.offline()) {
      throw new Error('Network error: syncing is turned off from Diagnostics');
    }

    const latency = this.chaos.latencyMs();
    if (latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }

    const remainingFails = this.chaos.failNext();
    if (remainingFails > 0) {
      this.chaos.setFailNext(remainingFails - 1);
      throw new Error('Simulated network connection drop (Diagnostics)');
    }

    const serverChaos = this.chaos.serverChaos();
    if (serverChaos === 'rate-limit') {
      throw new Error('HTTP 429: Rate limited by server');
    }
    if (serverChaos === 'timeout') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    if (serverChaos === 'malformed') {
      throw new Error('Malformed JSON output from server');
    }

    return {
      title: `Inspection: ${payload.note.slice(0, 40)}`,
      severity: payload.note.toLowerCase().includes('crack') || payload.note.toLowerCase().includes('danger') ? 'high' : 'medium',
      category: payload.note.toLowerCase().includes('concrete') || payload.note.toLowerCase().includes('wall') ? 'structural' : 'safety',
      summary: `Automated assessment based on note: "${payload.note}".`,
      suggested_action: 'Perform safety check.',
    };
  }
}
