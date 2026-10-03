export type ReportStatus = 'draft' | 'queued' | 'syncing' | 'synced' | 'failed';

export interface StructuredReport {
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'safety' | 'structural' | 'electrical' | 'plumbing' | 'equipment' | 'other';
  summary: string;
  suggested_action: string;
}

export interface InspectionReport {
  id: string; // UUID v4 generated on device (Idempotency key)
  created_at: number; // epoch ms
  note: string;
  photo_path?: string | null;
  status: ReportStatus;
  attempts: number;
  next_retry?: number | null; // epoch ms
  error?: string | null;
  report_json?: StructuredReport | null;
}

export interface IReportRepository {
  init(): Promise<void>;
  insert(report: InspectionReport): Promise<void>;
  update(report: InspectionReport): Promise<void>;
  getById(id: string): Promise<InspectionReport | null>;
  list(offset?: number, limit?: number): Promise<InspectionReport[]>;
  getAll(): Promise<InspectionReport[]>;
  countByStatus(): Promise<Record<ReportStatus, number>>;
  recoverStaleSyncingState(): Promise<number>; // UPDATE status='queued' WHERE status='syncing'
  clearAll(): Promise<void>;
}
