import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { ReportsRepository } from '../data/reports.repo';
import { SyncService } from '../sync/sync.service';
import { InspectionReport, ReportStatus } from '../data/models';

@Component({
  selector: 'app-inspections',
  imports: [CommonModule, Pressable, ScrollView, Text, View],
  template: `
    <view class="container">
      <view class="header">
        <view class="title-row">
          <text class="title">Inspections</text>
          <text class="count-badge">{{ repo.reports().length }} total</text>
        </view>
        <view class="actions-row">
          <pressable class="btn-primary" (press)="navigateCapture.emit()">
            <text class="btn-text">+ New Capture</text>
          </pressable>
          <pressable class="btn-secondary" (press)="seedDatabase(500)">
            <text class="btn-secondary-text">Seed 500 Rows</text>
          </pressable>
        </view>
      </view>

      <scroll-view class="list-scroll">
        @for (item of repo.reports(); track item.id) {
          <pressable class="card" (press)="selectReport.emit(item.id)">
            <view class="card-top">
              <text class="card-id">ID: {{ item.id.slice(0, 8) }}...</text>
              <text [class]="'badge badge-' + item.status">{{ item.status | uppercase }}</text>
            </view>
            <text class="card-note" [numberOfLines]="2">{{ item.note }}</text>

            @if (item.report_json) {
              <view class="report-box">
                <text class="report-title">{{ item.report_json.title }}</text>
                <text class="report-meta">
                  Severity: {{ item.report_json.severity }} | Category: {{ item.report_json.category }}
                </text>
              </view>
            }

            @if (item.error) {
              <text class="card-error" [numberOfLines]="1">{{ item.error }}</text>
            }

            <text class="card-date">{{ item.created_at | date: 'medium' }}</text>
          </pressable>
        } @empty {
          <view class="empty-box">
            <text class="empty-title">No Reports Found</text>
            <text class="empty-sub">Tap "+ New Capture" to create an offline inspection report.</text>
          </view>
        }
      </scroll-view>
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
      margin-bottom: 16px;
    }
    .title-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .title {
      font-size: 26px;
      font-weight: 800;
      color: #111827;
    }
    .count-badge {
      font-size: 13px;
      font-weight: 600;
      color: #4b5563;
      background-color: #e5e7eb;
      padding: 4px 10px;
      border-radius: 12px;
    }
    .actions-row {
      flex-direction: row;
      gap: 10px;
    }
    .btn-primary {
      background-color: #2563eb;
      padding: 12px 16px;
      border-radius: 8px;
      align-items: center;
      flex: 1;
    }
    .btn-text {
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
    }
    .btn-secondary {
      background-color: #d1d5db;
      padding: 12px 16px;
      border-radius: 8px;
      align-items: center;
    }
    .btn-secondary-text {
      color: #1f2937;
      font-weight: 600;
      font-size: 14px;
    }
    .list-scroll {
      flex: 1;
    }
    .card {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 12px;
      border: 1px solid #e5e7eb;
    }
    .card-top {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .card-id {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
    }
    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      overflow: hidden;
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
      color: #374151;
    }
    .card-note {
      font-size: 15px;
      color: #1f2937;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .report-box {
      background-color: #f9fafb;
      padding: 10px;
      border-radius: 6px;
      border-left: 3px solid #2563eb;
      margin-bottom: 8px;
    }
    .report-title {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
    }
    .report-meta {
      font-size: 12px;
      color: #4b5563;
      margin-top: 2px;
    }
    .card-error {
      font-size: 12px;
      color: #dc2626;
      margin-bottom: 6px;
    }
    .card-date {
      font-size: 11px;
      color: #9ca3af;
    }
    .empty-box {
      padding: 40px 20px;
      align-items: center;
    }
    .empty-title {
      font-size: 18px;
      font-weight: 700;
      color: #374151;
      margin-bottom: 4px;
    }
    .empty-sub {
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
  `,
})
export class InspectionsComponent {
  @Output() navigateCapture = new EventEmitter<void>();
  @Output() selectReport = new EventEmitter<string>();

  constructor(
    public repo: ReportsRepository,
    public sync: SyncService
  ) {}

  async seedDatabase(count: number) {
    const start = Date.now();
    for (let i = 0; i < count; i++) {
      const report: InspectionReport = {
        id: `seed-uuid-${start}-${i}`,
        created_at: start - i * 1000,
        note: `Seeded test inspection report #${i} for virtual list testing.`,
        status: i % 3 === 0 ? 'synced' : i % 3 === 1 ? 'queued' : 'failed',
        attempts: i % 3 === 2 ? 8 : 0,
        error: i % 3 === 2 ? 'Simulated max retries error' : null,
      };
      await this.repo.insert(report);
    }
    await this.sync.drain();
  }
}
