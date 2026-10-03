import { describe, it, expect, beforeEach } from 'vitest';
import { ReportsRepository } from './reports.repo';
import { DatabaseService } from './db.service';
import { InspectionReport } from './models';

describe('ReportsRepository Unit & Performance Tests', () => {
  let repo: ReportsRepository;

  beforeEach(async () => {
    const dbService = new DatabaseService();
    repo = new ReportsRepository(dbService);
    await repo.init();
  });

  it('recovers stale "syncing" items back to "queued" on boot', async () => {
    const report1: InspectionReport = {
      id: 'stale-1',
      created_at: Date.now(),
      note: 'Stale sync item',
      status: 'syncing',
      attempts: 1,
    };
    const report2: InspectionReport = {
      id: 'synced-1',
      created_at: Date.now(),
      note: 'Completed item',
      status: 'synced',
      attempts: 1,
    };

    await repo.insert(report1);
    await repo.insert(report2);

    expect(repo.reports().find((r) => r.id === 'stale-1')?.status).toBe('syncing');

    const recovered = await repo.recoverStaleSyncingState();
    expect(recovered).toBe(1);

    const checkReport = await repo.getById('stale-1');
    expect(checkReport?.status).toBe('queued');
    expect(repo.reports().find((r) => r.id === 'stale-1')?.status).toBe('queued');
  });

  it('can insert 5,000 rows and page through them', async () => {
    const startTime = Date.now();
    const totalRows = 5000;

    for (let i = 0; i < totalRows; i++) {
      const item: InspectionReport = {
        id: `bench-uuid-${i}`,
        created_at: startTime + i,
        note: `Inspection note index ${i}`,
        status: i % 2 === 0 ? 'queued' : 'synced',
        attempts: 0,
      };
      await repo.insert(item);
    }

    const duration = Date.now() - startTime;
    console.log(`Inserted ${totalRows} rows in ${duration}ms`);

    // Paging test
    const page1 = await repo.list(0, 50);
    expect(page1.length).toBe(50);
    expect(page1[0].id).toBe(`bench-uuid-${totalRows - 1}`);

    const page2 = await repo.list(50, 50);
    expect(page2.length).toBe(50);

    const counts = await repo.countByStatus();
    expect(counts.queued + counts.synced).toBe(totalRows);
  });
});
