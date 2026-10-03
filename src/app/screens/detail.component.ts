import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pressable, ScrollView, Text, TextInput, View } from '@ng-native/components';
import { ReportsRepository } from '../data/reports.repo';
import { SyncService } from '../sync/sync.service';
import { InspectionReport } from '../data/models';

@Component({
  selector: 'app-detail',
  imports: [CommonModule, Pressable, ScrollView, Text, TextInput, View],
  template: `
    <view class="container">
      <view class="header">
        <pressable class="btn-back" (press)="backPressed.emit()">
          <text class="back-text">← Back to List</text>
        </pressable>
        <text class="title">Inspection Detail</text>
      </view>

      @if (report()) {
        <scroll-view class="detail-scroll">
          <view class="card">
            <view class="card-row">
              <text class="id-text">ID: {{ report()?.id }}</text>
              <text [class]="'badge badge-' + report()?.status">
                {{ report()?.status | uppercase }}
              </text>
            </view>

            <text class="label">Created Date:</text>
            <text class="val-text">{{ report()?.created_at | date: 'medium' }}</text>

            <text class="label">Original Note:</text>
            <text class="val-note">{{ report()?.note }}</text>

            @if (report()?.photo_path) {
              <text class="label">Attached Photo:</text>
              <text class="val-photo">{{ report()?.photo_path }}</text>
            }

            @if (report()?.error) {
              <view class="error-box">
                <text class="error-title">Sync Error Log:</text>
                <text class="error-text">{{ report()?.error }}</text>
                <pressable class="btn-retry" (press)="retrySync()">
                  <text class="retry-text">⚡ Manual Retry Sync</text>
                </pressable>
              </view>
            }
          </view>

          @if (report()?.report_json) {
            <view class="card report-card">
              <text class="card-title">Structured Gemini AI Report</text>

              <text class="label">Title (Editable):</text>
              <text-input
                class="edit-input"
                [value]="editTitle()"
                (changeText)="editTitle.set($event)"
              />

              <view class="meta-row">
                <view class="meta-item">
                  <text class="meta-label">Severity:</text>
                  <text class="meta-val">{{ report()?.report_json?.severity | uppercase }}</text>
                </view>
                <view class="meta-item">
                  <text class="meta-label">Category:</text>
                  <text class="meta-val">{{ report()?.report_json?.category | uppercase }}</text>
                </view>
              </view>

              <text class="label">AI Summary (Editable):</text>
              <text-input
                class="edit-input-multiline"
                [value]="editSummary()"
                (changeText)="editSummary.set($event)"
                [multiline]="true"
                [numberOfLines]="3"
              />

              <text class="label">Suggested Action:</text>
              <text class="val-action">{{ report()?.report_json?.suggested_action }}</text>

              <pressable class="btn-save" (press)="saveEdits()">
                <text class="btn-save-text">Save Local Edits</text>
              </pressable>
            </view>
          }
        </scroll-view>
      } @else {
        <view class="not-found">
          <text class="not-found-text">Report ID not found.</text>
        </view>
      }
    </view>
  `,
  styles: `
    :host {
      flex: 1;
    }
    .container {
      flex: 1;
      background-color: #f4f5f8;
      padding: 16px;
    }
    .header {
      margin-bottom: 14px;
    }
    .btn-back {
      padding: 6px 0;
      margin-bottom: 8px;
    }
    .back-text { font-size: 14px; font-weight: 700; color: #2563eb; }
    .title { font-size: 26px; font-weight: 800; color: #111827; }

    .detail-scroll { flex: 1; }
    .card {
      background-color: #ffffff;
      padding: 16px;
      border-radius: 10px;
      margin-bottom: 14px;
      border: 1px solid #e5e7eb;
    }
    .card-row {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .id-text { font-size: 12px; font-weight: 700; color: #6b7280; }

    .badge { font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; }
    .badge-queued { background-color: #fef3c7; color: #92400e; }
    .badge-syncing { background-color: #dbeafe; color: #1e40af; }
    .badge-synced { background-color: #d1fae5; color: #065f46; }
    .badge-failed { background-color: #fee2e2; color: #991b1b; }

    .label { font-size: 13px; font-weight: 700; color: #4b5563; margin-top: 10px; margin-bottom: 4px; }
    .val-text { font-size: 14px; color: #111827; }
    .val-note { font-size: 15px; color: #1f2937; font-weight: 500; background-color: #f9fafb; padding: 10px; border-radius: 6px; }
    .val-photo { font-size: 12px; color: #059669; font-weight: 600; }
    .val-action { font-size: 14px; color: #111827; background-color: #fef3c7; padding: 10px; border-radius: 6px; }

    .error-box { background-color: #fee2e2; padding: 12px; border-radius: 8px; margin-top: 14px; }
    .error-title { font-size: 13px; font-weight: 700; color: #991b1b; }
    .error-text { font-size: 12px; color: #7f1d1d; margin-top: 2px; margin-bottom: 8px; }
    .btn-retry { background-color: #dc2626; padding: 8px; border-radius: 6px; align-items: center; }
    .retry-text { color: #ffffff; font-weight: 700; font-size: 12px; }

    .report-card { border-left: 4px solid #2563eb; }
    .card-title { font-size: 17px; font-weight: 800; color: #111827; margin-bottom: 8px; }

    .edit-input { background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; font-size: 14px; color: #111827; }
    .edit-input-multiline { background-color: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; font-size: 14px; color: #111827; min-height: 70px; }

    .meta-row { flex-direction: row; gap: 16px; margin-top: 8px; }
    .meta-item { flex: 1; background-color: #f3f4f6; padding: 8px; border-radius: 6px; }
    .meta-label { font-size: 11px; font-weight: 700; color: #6b7280; }
    .meta-val { font-size: 13px; font-weight: 800; color: #1f2937; margin-top: 2px; }

    .btn-save { background-color: #059669; padding: 12px; border-radius: 8px; align-items: center; margin-top: 16px; }
    .btn-save-text { color: #ffffff; font-weight: 700; font-size: 14px; }
    .not-found { padding: 40px; align-items: center; }
    .not-found-text { font-size: 16px; color: #6b7280; }
  `,
})
export class DetailComponent {
  @Input() set reportId(id: string | null) {
    if (id) {
      this.loadReport(id);
    }
  }

  @Output() backPressed = new EventEmitter<void>();

  readonly report = signal<InspectionReport | null>(null);
  readonly editTitle = signal<string>('');
  readonly editSummary = signal<string>('');

  constructor(
    private repo: ReportsRepository,
    private sync: SyncService
  ) {}

  async loadReport(id: string) {
    const item = await this.repo.getById(id);
    this.report.set(item);
    if (item?.report_json) {
      this.editTitle.set(item.report_json.title);
      this.editSummary.set(item.report_json.summary);
    }
  }

  async saveEdits() {
    const current = this.report();
    if (current && current.report_json) {
      const updated: InspectionReport = {
        ...current,
        report_json: {
          ...current.report_json,
          title: this.editTitle(),
          summary: this.editSummary(),
        },
      };
      await this.repo.update(updated);
      this.report.set(updated);
    }
  }

  async retrySync() {
    const current = this.report();
    if (current) {
      await this.sync.retryFailedReport(current.id);
      await this.loadReport(current.id);
    }
  }
}
