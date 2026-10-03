import { Injectable, signal } from '@angular/core';
import { InspectionReport, IReportRepository, ReportStatus } from './models';
import { DatabaseService, RECOVER_STALE_SYNCING_SQL } from './db.service';

@Injectable({
  providedIn: 'root',
})
export class ReportsRepository implements IReportRepository {
  readonly reports = signal<InspectionReport[]>([]);
  readonly total = signal<number>(0);
  readonly statusCounts = signal<Record<ReportStatus, number>>({
    draft: 0,
    queued: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
  });
  private inMemoryMap = new Map<string, InspectionReport>();
  private isNativeDb = false;
  private loadingMore = false;

  constructor(private dbService: DatabaseService) {}

  async init(): Promise<void> {
    const db = await this.dbService.getDatabase();
    if (db) {
      this.isNativeDb = true;
      await this.recoverStaleSyncingState();
    }
    await this.refreshSignal();
  }

  async recoverStaleSyncingState(): Promise<number> {
    if (this.isNativeDb) {
      const db = await this.dbService.getDatabase();
      const res = await db.runAsync(RECOVER_STALE_SYNCING_SQL);
      await this.refreshSignal();
      return res.changes;
    } else {
      let recoveredCount = 0;
      for (const [id, r] of this.inMemoryMap.entries()) {
        if (r.status === 'syncing') {
          this.inMemoryMap.set(id, { ...r, status: 'queued' });
          recoveredCount++;
        }
      }
      await this.refreshSignal();
      return recoveredCount;
    }
  }

  async insert(report: InspectionReport): Promise<void> {
    if (this.isNativeDb) {
      const db = await this.dbService.getDatabase();
      await db.runAsync(
        `INSERT INTO reports (id, created_at, note, photo_path, status, attempts, next_retry, error, report_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          report.id,
          report.created_at,
          report.note,
          report.photo_path || null,
          report.status,
          report.attempts,
          report.next_retry || null,
          report.error || null,
          report.report_json ? JSON.stringify(report.report_json) : null,
        ]
      );
    } else {
      this.inMemoryMap.set(report.id, { ...report });
    }
    await this.refreshSignal();
  }

  async update(report: InspectionReport): Promise<void> {
    if (this.isNativeDb) {
      const db = await this.dbService.getDatabase();
      await db.runAsync(
        `UPDATE reports SET note = ?, photo_path = ?, status = ?, attempts = ?, next_retry = ?, error = ?, report_json = ?
         WHERE id = ?`,
        [
          report.note,
          report.photo_path || null,
          report.status,
          report.attempts,
          report.next_retry || null,
          report.error || null,
          report.report_json ? JSON.stringify(report.report_json) : null,
          report.id,
        ]
      );
    } else {
      if (this.inMemoryMap.has(report.id)) {
        this.inMemoryMap.set(report.id, { ...report });
      }
    }
    await this.refreshSignal();
  }

  async delete(id: string): Promise<void> {
    if (this.isNativeDb) {
      const db = await this.dbService.getDatabase();
      await db.runAsync('DELETE FROM reports WHERE id = ?', [id]);
    } else {
      this.inMemoryMap.delete(id);
    }
    await this.refreshSignal();
  }

  async getById(id: string): Promise<InspectionReport | null> {
    if (this.isNativeDb) {
      const db = await this.dbService.getDatabase();
      const row = await db.getFirstAsync('SELECT * FROM reports WHERE id = ?', [id]);
      if (!row) return null;
      return this.mapRowToReport(row);
    } else {
      return this.inMemoryMap.get(id) || null;
    }
  }

  async list(offset = 0, limit = 50): Promise<InspectionReport[]> {
    if (this.isNativeDb) {
      const db = await this.dbService.getDatabase();
      const rows = await db.getAllAsync(
        'SELECT * FROM reports ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      return rows.map((r: any) => this.mapRowToReport(r));
    } else {
      const sorted = Array.from(this.inMemoryMap.values()).sort(
        (a, b) => b.created_at - a.created_at
      );
      return sorted.slice(offset, offset + limit);
    }
  }

  async getAll(): Promise<InspectionReport[]> {
    return this.list(0, 100000);
  }

  async countByStatus(): Promise<Record<ReportStatus, number>> {
    const counts: Record<ReportStatus, number> = {
      draft: 0,
      queued: 0,
      syncing: 0,
      synced: 0,
      failed: 0,
    };

    if (this.isNativeDb) {
      const db = await this.dbService.getDatabase();
      const rows = await db.getAllAsync('SELECT status, COUNT(*) as cnt FROM reports GROUP BY status');
      for (const row of rows as any[]) {
        const st = row.status as ReportStatus;
        if (counts[st] !== undefined) {
          counts[st] = Number(row.cnt);
        }
      }
    } else {
      for (const r of this.inMemoryMap.values()) {
        if (counts[r.status] !== undefined) {
          counts[r.status]++;
        }
      }
    }
    return counts;
  }

  async getNextQueuedReport(now: number): Promise<InspectionReport | null> {
    if (this.isNativeDb) {
      const db = await this.dbService.getDatabase();
      const row = await db.getFirstAsync(
        `SELECT * FROM reports 
         WHERE status = 'queued' AND (next_retry IS NULL OR next_retry <= ?) 
         ORDER BY created_at ASC LIMIT 1`,
        [now]
      );
      if (!row) return null;
      return this.mapRowToReport(row);
    } else {
      const queued = Array.from(this.inMemoryMap.values())
        .filter(
          (r) =>
            r.status === 'queued' &&
            (r.next_retry === null || r.next_retry === undefined || r.next_retry <= now)
        )
        .sort((a, b) => a.created_at - b.created_at);
      return queued[0] || null;
    }
  }

  async clearAll(): Promise<void> {
    if (this.isNativeDb) {
      const db = await this.dbService.getDatabase();
      await db.runAsync('DELETE FROM reports');
    } else {
      this.inMemoryMap.clear();
    }
    await this.refreshSignal();
  }

  /** Next page of reports, appended for the list's endReached. */
  async loadMore(): Promise<void> {
    if (this.loadingMore) return;
    const offset = this.reports().length;
    if (offset >= this.total()) return;
    this.loadingMore = true;
    try {
      const next = await this.list(offset, 50);
      this.reports.set([...this.reports(), ...next]);
    } finally {
      this.loadingMore = false;
    }
  }

  private async refreshSignal(): Promise<void> {
    const keep = Math.max(50, this.reports().length);
    const current = await this.list(0, keep);
    this.reports.set(current);
    const counts = await this.countByStatus();
    this.statusCounts.set(counts);
    this.total.set(
      counts.draft + counts.queued + counts.syncing + counts.synced + counts.failed
    );
  }

  private mapRowToReport(row: any): InspectionReport {
    return {
      id: row.id,
      created_at: Number(row.created_at),
      note: row.note,
      photo_path: row.photo_path || null,
      status: row.status as ReportStatus,
      attempts: Number(row.attempts || 0),
      next_retry: row.next_retry ? Number(row.next_retry) : null,
      error: row.error || null,
      report_json: row.report_json ? JSON.parse(row.report_json) : null,
    };
  }
}
