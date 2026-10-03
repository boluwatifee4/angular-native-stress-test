import { describe, it, expect, beforeEach } from 'vitest';
import { SyncService } from './sync.service';
import { ReportsRepository } from '../data/reports.repo';
import { DatabaseService } from '../data/db.service';
import { NetworkService } from './network';
import { ApiClient, ReportPayload } from './api.client';
import { ChaosService } from '../chaos/chaos.service';
import { InspectionReport, StructuredReport } from '../data/models';

import { FakeApiClient } from './fake-api.client';

describe('SyncEngine Architecture Tests', () => {
  let syncService: SyncService;
  let repo: ReportsRepository;
  let network: NetworkService;
  let apiClient: ApiClient;
  let chaos: ChaosService;

  beforeEach(async () => {
    const dbService = new DatabaseService();
    repo = new ReportsRepository(dbService);
    await repo.init();

    chaos = new ChaosService();
    chaos.reset();

    network = new NetworkService();
    network.setOnline(true);

    apiClient = new FakeApiClient(chaos);
    syncService = new SyncService(repo, network, apiClient, chaos);
  });

  it('drains queued reports successfully when online', async () => {
    const report: InspectionReport = {
      id: 'sync-test-1',
      created_at: Date.now(),
      note: 'Wall cracking near pillar B',
      status: 'queued',
      attempts: 0,
    };
    await repo.insert(report);

    await syncService.drain();

    const result = await repo.getById('sync-test-1');
    expect(result?.status).toBe('synced');
    expect(result?.report_json?.title).toBeDefined();
    expect(result?.report_json?.severity).toBeDefined();
  });

  it('aborts drain when network is offline', async () => {
    const report: InspectionReport = {
      id: 'offline-test-1',
      created_at: Date.now(),
      note: 'Offline report test',
      status: 'queued',
      attempts: 0,
    };
    await repo.insert(report);

    network.setOnline(false);
    await syncService.drain();

    const result = await repo.getById('offline-test-1');
    expect(result?.status).toBe('queued');
  });

  it('applies backoff and re-queues report when server returns error', async () => {
    const report: InspectionReport = {
      id: 'error-test-1',
      created_at: Date.now(),
      note: 'Fail test note',
      status: 'queued',
      attempts: 0,
    };
    await repo.insert(report);

    chaos.setFailNext(1); // Force failure on next request

    await syncService.drain();

    const result = await repo.getById('error-test-1');
    expect(result?.status).toBe('queued');
    expect(result?.attempts).toBe(1);
    expect(result?.next_retry).toBeGreaterThan(Date.now());
    expect(result?.error).toContain('Simulated network connection drop');
  });

  it('transitions report to "failed" state after 8 consecutive failures', async () => {
    const report: InspectionReport = {
      id: 'max-retry-test',
      created_at: Date.now(),
      note: 'Persistent error note',
      status: 'queued',
      attempts: 7, // Already tried 7 times
    };
    await repo.insert(report);

    chaos.setFailNext(1); // 8th attempt fails

    await syncService.drain();

    const result = await repo.getById('max-retry-test');
    expect(result?.status).toBe('failed');
    expect(result?.attempts).toBe(8);
    expect(result?.next_retry).toBeNull();
  });

  it('allows manual retry of a failed report', async () => {
    const report: InspectionReport = {
      id: 'manual-retry-test',
      created_at: Date.now(),
      note: 'Manual retry note',
      status: 'failed',
      attempts: 8,
      error: 'Max retries reached',
    };
    await repo.insert(report);

    await syncService.retryFailedReport('manual-retry-test');

    const result = await repo.getById('manual-retry-test');
    expect(result?.status).toBe('synced');
    expect(result?.attempts).toBe(0);
  });
});
