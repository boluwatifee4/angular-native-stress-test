import { Injectable, signal } from '@angular/core';
import { ReportsRepository } from '../data/reports.repo';
import { NetworkService } from './network';
import { ApiClient } from './api.client';
import { ChaosService } from '../chaos/chaos.service';
import { InspectionReport } from '../data/models';

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  readonly isRunning = signal<boolean>(false);
  readonly lastDrainTime = signal<number | null>(null);
  private runningGuard = false;

  constructor(
    private repo: ReportsRepository,
    private network: NetworkService,
    private apiClient: ApiClient,
    private chaos: ChaosService
  ) {}

  async drain(): Promise<void> {
    if (this.runningGuard) {
      console.log('[SyncEngine] Drain already running, skipping re-entry.');
      return;
    }

    if (this.chaos.pauseSync()) {
      console.log('[SyncEngine] Sync paused via Chaos controls.');
      return;
    }

    if (!this.network.isOnline() || this.chaos.offline()) {
      console.log('[SyncEngine] Network is offline, drain aborted.');
      return;
    }

    this.runningGuard = true;
    this.isRunning.set(true);

    try {
      while (true) {
        if (!this.network.isOnline() || this.chaos.offline() || this.chaos.pauseSync()) {
          console.log('[SyncEngine] Sync loop interrupted by network/pause state.');
          break;
        }

        const now = Date.now();
        const candidate = await this.repo.getNextQueuedReport(now);

        if (!candidate) {
          // Queue is empty or remaining queued items are waiting for backoff
          break;
        }

        // Set status to syncing
        const syncingReport: InspectionReport = {
          ...candidate,
          status: 'syncing',
        };
        await this.repo.update(syncingReport);

        try {
          // Execute post request
          const structuredResult = await this.apiClient.postReport({
            id: candidate.id,
            note: candidate.note,
            photoBase64: candidate.photo_path ? 'MOCK_BASE64_IMAGE_DATA' : undefined,
          });

          // Mark synced
          const syncedReport: InspectionReport = {
            ...syncingReport,
            status: 'synced',
            error: null,
            next_retry: null,
            report_json: structuredResult,
          };
          await this.repo.update(syncedReport);
        } catch (err: any) {
          const attempts = candidate.attempts + 1;
          const maxAttempts = 8;

          if (attempts >= maxAttempts) {
            // Permanently fail report after 8 attempts
            const failedReport: InspectionReport = {
              ...syncingReport,
              status: 'failed',
              attempts,
              error: `Failed after ${attempts} attempts: ${err.message}`,
              next_retry: null,
            };
            await this.repo.update(failedReport);
          } else {
            // Exponential backoff + jitter
            const backoffMs = Math.min(Math.pow(2, attempts) * 1000, 5 * 60 * 1000);
            const jitterMs = Math.floor(Math.random() * 500);
            const nextRetry = Date.now() + backoffMs + jitterMs;

            const requeuedReport: InspectionReport = {
              ...syncingReport,
              status: 'queued',
              attempts,
              error: err.message,
              next_retry: nextRetry,
            };
            await this.repo.update(requeuedReport);
          }
        }
      }
    } finally {
      this.lastDrainTime.set(Date.now());
      this.runningGuard = false;
      this.isRunning.set(false);
    }
  }

  async retryFailedReport(id: string): Promise<void> {
    const report = await this.repo.getById(id);
    if (report && report.status === 'failed') {
      const resetReport: InspectionReport = {
        ...report,
        status: 'queued',
        attempts: 0,
        next_retry: null,
        error: null,
      };
      await this.repo.update(resetReport);
      await this.drain();
    }
  }
}
