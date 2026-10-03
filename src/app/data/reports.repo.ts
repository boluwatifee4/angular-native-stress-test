import { Injectable, signal } from '@angular/core';
import { InspectionReport, IReportRepository, ReportStatus } from './models';
import { DatabaseService, RECOVER_STALE_SYNCING_SQL } from './db.service';

@Injectable({
  providedIn: 'root',
})
export class ReportsRepository implements IReportRepository {
  readonly reports = signal<InspectionReport[]>([]);
  private inMemoryMap = new Map<string, InspectionReport>();
  private isNativeDb = false;

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

    const all = await this.getAll();
    for (const r of all) {
      if (counts[r.status] !== undefined) {
        counts[r.status]++;
      }
    }
    return counts;
  }

  private async refreshSignal(): Promise<void> {
    const current = await this.list(0, 1000);
    this.reports.set(current);
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
