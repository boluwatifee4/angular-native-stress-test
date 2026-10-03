import { ReportStatus } from './models';

/** User-facing wording for each stored status. The enum stays machine-facing. */
export const STATUS_LABEL: Record<ReportStatus, string> = {
  draft: 'Draft',
  queued: 'Queued',
  syncing: 'Sending',
  synced: 'Sent',
  failed: 'Failed',
};

export function statusLabel(status?: ReportStatus | null): string {
  return status ? STATUS_LABEL[status] : '';
}
