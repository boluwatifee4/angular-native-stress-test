import { Injectable } from '@angular/core';

export const CREATE_REPORTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS reports (
  id           TEXT PRIMARY KEY,
  created_at   INTEGER NOT NULL,
  note         TEXT NOT NULL,
  photo_path   TEXT,
  status       TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  next_retry   INTEGER,
  error        TEXT,
  report_json  TEXT
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
`;

export const RECOVER_STALE_SYNCING_SQL = `
UPDATE reports SET status = 'queued' WHERE status = 'syncing';
`;

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private db: any = null;

  async getDatabase() {
    if (this.db) return this.db;
    try {
      const SQLite = await import('expo-sqlite');
      this.db = await SQLite.openDatabaseAsync('sitelog.db');
      await this.db.execAsync(CREATE_REPORTS_TABLE_SQL);
      return this.db;
    } catch (e) {
      console.warn('Expo SQLite not available in this environment. Falling back to memory state.');
      return null;
    }
  }
}
