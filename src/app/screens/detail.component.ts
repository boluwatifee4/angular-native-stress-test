import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Image, Pressable, ScrollView, Text, TextInput, View } from '@ng-native/components';
import { NativeHeader, TabSafeAreaView } from '@ng-native/router';
import { ReportsRepository } from '../data/reports.repo';
import { SyncService } from '../sync/sync.service';
import { InspectionReport } from '../data/models';
import { statusLabel } from '../data/status';
import { OfflineStrip } from './offline-strip';

@Component({
  selector: 'app-detail',
  imports: [CommonModule, Image, NativeHeader, OfflineStrip, Pressable, ScrollView, TabSafeAreaView, Text, TextInput, View],
  template: `
    <native-header title="Inspection" />

    <app-offline-strip />

    <view class="container">
      <tab-safe-area-view [edges]="['bottom']" class="tab-body">
        @if (report()) {
          <scroll-view class="detail-scroll">
            <view class="card">
              <view class="card-row">
                <text [class]="'badge badge-' + report()?.status">
                  {{ label(report()?.status) }}
                </text>
                <text class="date-text">{{ report()?.created_at | date: 'MMM d, y, HH:mm' }}</text>
              </view>

              <text class="label">Note</text>
              <text class="val-note">{{ report()?.note }}</text>

              @if (report()?.photo_path) {
                <text class="label">Photo</text>
                <image
                  class="photo"
                  [source]="photoSrc()"
                  resizeMode="cover"
                />
              }

              <text class="ref-text">Ref {{ report()?.id?.slice(0, 8) }}</text>
            </view>

            @if (report()?.error) {
              <view class="error-box">
                <text class="error-title">Could not send this report</text>
                <text class="error-text">{{ report()?.error }}</text>
                <pressable
                  class="btn-retry"
                  (press)="retrySync()"
                  accessibilityRole="button"
                  accessibilityLabel="Try sending again"
                >
                  <text class="retry-text">Try again</text>
                </pressable>
              </view>
            }

            @if (report()?.report_json) {
              <view class="card report-card">
                <view class="report-head">
                  <text class="card-title">Report</text>
                  <text class="chip-auto">Auto-generated</text>
                </view>

                <text class="label">Title</text>
                <text-input
                  class="edit-input"
                  [value]="editTitle()"
                  (changeText)="editTitle.set($event)"
                />

                <view class="meta-row">
                  <view class="meta-item">
                    <text class="meta-label">Severity</text>
                    <text class="meta-val">{{ report()?.report_json?.severity | titlecase }}</text>
                  </view>
                  <view class="meta-item">
                    <text class="meta-label">Category</text>
                    <text class="meta-val">{{ report()?.report_json?.category | titlecase }}</text>
                  </view>
                </view>

                <text class="label">Summary</text>
                <text-input
                  class="edit-input-multiline"
                  [value]="editSummary()"
                  (changeText)="editSummary.set($event)"
                  [multiline]="true"
                  [numberOfLines]="3"
                />

                <text class="label">Recommended action</text>
                <text class="val-action">{{ report()?.report_json?.suggested_action }}</text>

                <pressable
                  class="btn-save"
                  (press)="saveEdits()"
                  accessibilityRole="button"
                  accessibilityLabel="Save changes"
                >
                  <text class="btn-save-text">Save changes</text>
                </pressable>

                @if (savedNotice()) {
                  <text class="saved-text">Saved on this device</text>
                }
              </view>
            }
          </scroll-view>
        } @else {
          <view class="not-found">
            <text class="not-found-text">This report is no longer available.</text>
          </view>
        }
      </tab-safe-area-view>
    </view>
  `,
  styles: `
    :host {
      flex: 1;
    }
    .container {
      flex: 1;
      background-color: #f6f6f7;
      padding: 16px;
    }
    .tab-body {
      flex: 1;
    }

    .detail-scroll {
      flex: 1;
    }
    .card {
      background-color: #ffffff;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 14px;
      border: 1px solid #d8d8dd;
    }
    .card-row {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .date-text {
      font-size: 12px;
      color: #5f646d;
    }
    .ref-text {
      font-size: 11px;
      color: #5f646d;
      margin-top: 12px;
    }

    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 10px;
    }
    .badge-queued {
      background-color: #fef3c7;
      color: #92400e;
    }
    .badge-syncing {
      background-color: #dbeafe;
      color: #1e40af;
    }
    .badge-synced {
      background-color: #d1fae5;
      color: #065f46;
    }
    .badge-failed {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .badge-draft {
      background-color: #f3f4f6;
      color: #4b5563;
    }

    .label {
      font-size: 13px;
      font-weight: 700;
      color: #5f646d;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    .val-note {
      font-size: 15px;
      color: #111827;
      font-weight: 500;
      background-color: #f9fafb;
      padding: 12px;
      border-radius: 8px;
      line-height: 21px;
    }
    .photo {
      width: 100%;
      height: 180px;
      border-radius: 8px;
    }
    .val-action {
      font-size: 14px;
      color: #111827;
      background-color: #f9fafb;
      padding: 12px;
      border-radius: 8px;
      line-height: 20px;
    }

    .error-box {
      background-color: #fef2f2;
      padding: 14px;
      border-radius: 12px;
      margin-bottom: 14px;
      border: 1px solid #fecaca;
    }
    .error-title {
      font-size: 14px;
      font-weight: 700;
      color: #991b1b;
    }
    .error-text {
      font-size: 12px;
      color: #7f1d1d;
      margin-top: 4px;
      margin-bottom: 10px;
    }
    .btn-retry {
      background-color: #111827;
      padding: 10px;
      border-radius: 8px;
      align-items: center;
    }
    .retry-text {
      color: #ffffff;
      font-weight: 700;
      font-size: 13px;
    }

    .report-card {
      border-left-width: 3px;
      border-left-color: #111827;
    }
    .report-head {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .card-title {
      font-size: 17px;
      font-weight: 700;
      color: #111827;
    }
    .chip-auto {
      font-size: 11px;
      font-weight: 600;
      color: #4b5563;
      background-color: #ececef;
      padding: 3px 9px;
      border-radius: 10px;
    }

    .edit-input {
      background-color: #f9fafb;
      border: 1px solid #71767f;
      border-radius: 8px;
      padding: 11px;
      font-size: 14px;
      color: #111827;
    }
    .edit-input-multiline {
      background-color: #f9fafb;
      border: 1px solid #71767f;
      border-radius: 8px;
      padding: 11px;
      font-size: 14px;
      color: #111827;
      min-height: 76px;
    }

    .meta-row {
      flex-direction: row;
      gap: 10px;
      margin-top: 12px;
    }
    .meta-item {
      flex: 1;
      background-color: #f9fafb;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid #d8d8dd;
    }
    .meta-label {
      font-size: 11px;
      font-weight: 600;
      color: #5f646d;
    }
    .meta-val {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      margin-top: 2px;
    }

    .btn-save {
      background-color: #111827;
      padding: 13px;
      border-radius: 10px;
      align-items: center;
      margin-top: 16px;
    }
    .btn-save-text {
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
    }
    .saved-text {
      font-size: 12px;
      color: #047857;
      text-align: center;
      margin-top: 8px;
    }
    .not-found {
      padding: 40px;
      align-items: center;
    }
    .not-found-text {
      font-size: 15px;
      color: #5f646d;
    }
  `,
})
export class DetailComponent {
  @Input() set reportId(id: string | null) {
    if (id) {
      this.loadReport(id);
    }
  }

  readonly report = signal<InspectionReport | null>(null);
  readonly editTitle = signal<string>('');
  readonly editSummary = signal<string>('');
  readonly savedNotice = signal<boolean>(false);
  readonly photoSrc = computed<{ uri: string } | undefined>(() => {
    const uri = this.report()?.photo_path;
    return uri ? { uri } : undefined;
  });

  readonly label = statusLabel;

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
      this.savedNotice.set(true);
      setTimeout(() => this.savedNotice.set(false), 2000);
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
