import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { ReportsRepository } from '../data/reports.repo';
import { SyncService } from '../sync/sync.service';
import { ChaosService } from '../chaos/chaos.service';
import { ReportStatus } from '../data/models';

@Component({
  selector: 'app-queue',
  imports: [CommonModule, Pressable, ScrollView, Text, View],
  template: `
    <view class="container">
      <view class="header">
        <text class="title">Sync Queue Monitor</text>
        <text class="subtitle">Live status metrics & backoff manager</text>
      </view>

      <view class="stats-grid">
        <view class="stat-card stat-queued">
          <text class="stat-num">{{ counts()['queued'] || 0 }}</text>
          <text class="stat-label">QUEUED</text>
        </view>
        <view class="stat-card stat-syncing">
          <text class="stat-num">{{ counts()['syncing'] || 0 }}</text>
          <text class="stat-label">SYNCING</text>
        </view>
        <view class="stat-card stat-synced">
          <text class="stat-num">{{ counts()['synced'] || 0 }}</text>
          <text class="stat-label">SYNCED</text>
        </view>
        <view class="stat-card stat-failed">
          <text class="stat-num">{{ counts()['failed'] || 0 }}</text>
          <text class="stat-label">FAILED</text>
        </view>
      </view>

      <view class="controls-card">
        <text class="section-title">Queue Controls</text>

        <view class="btn-row">
          <pressable
            [class]="'btn ' + (chaos.pauseSync() ? 'btn-resume' : 'btn-pause')"
            (press)="chaos.setPauseSync(!chaos.pauseSync())"
          >
            <text class="btn-text">
              {{ chaos.pauseSync() ? '▶ Resume Sync Loop' : '⏸ Pause Sync Loop' }}
            </text>
          </pressable>

          <pressable class="btn btn-drain" (press)="triggerDrain()">
            <text class="btn-text">⚡ Force Drain Queue</text>
          </pressable>
        </view>
      </view>

      <view class="queue-section">
        <text class="section-title">Active Queue Items</text>

        <scroll-view class="queue-scroll">
          @for (item of repo.reports(); track item.id) {
            @if (item.status === 'queued' || item.status === 'syncing' || item.status === 'failed') {
              <view class="item-row">
                <view class="item-left">
                  <text class="item-id">ID: {{ item.id.slice(0, 8) }}...</text>
                  <text class="item-note" [numberOfLines]="1">{{ item.note }}</text>
                  @if (item.attempts > 0) {
                    <text class="item-attempts">Attempts: {{ item.attempts }}/8</text>
                  }
                  @if (item.error) {
                    <text class="item-error" [numberOfLines]="1">{{ item.error }}</text>
                  }
                </view>

                <view class="item-right">
                  <text [class]="'badge badge-' + item.status">{{ item.status | uppercase }}</text>

                  @if (item.status === 'failed') {
                    <pressable class="btn-retry" (press)="sync.retryFailedReport(item.id)">
                      <text class="retry-text">Retry</text>
                    </pressable>
                  }
                </view>
              </view>
            }
          } @empty {
            <view class="empty-row">
              <text class="empty-text">Queue is clear! All items synced.</text>
            </view>
          }
        </scroll-view>
      </view>
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
    .title {
      font-size: 26px;
      font-weight: 800;
      color: #111827;
    }
    .subtitle {
      font-size: 14px;
      color: #6b7280;
      margin-top: 2px;
    }
    .stats-grid {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
    }
    .stat-card {
      flex: 1;
      min-width: 45%;
      padding: 14px;
      border-radius: 10px;
      align-items: center;
    }
    .stat-queued { background-color: #fef3c7; }
    .stat-syncing { background-color: #dbeafe; }
    .stat-synced { background-color: #d1fae5; }
    .stat-failed { background-color: #fee2e2; }

    .stat-num {
      font-size: 24px;
      font-weight: 800;
      color: #1f2937;
    }
    .stat-label {
      font-size: 11px;
      font-weight: 700;
      color: #4b5563;
      margin-top: 2px;
    }
    .controls-card {
      background-color: #ffffff;
      padding: 14px;
      border-radius: 10px;
      margin-bottom: 16px;
      border: 1px solid #e5e7eb;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 10px;
    }
    .btn-row {
      flex-direction: row;
      gap: 10px;
    }
    .btn {
      flex: 1;
      padding: 12px;
      border-radius: 8px;
      align-items: center;
    }
    .btn-pause { background-color: #d97706; }
    .btn-resume { background-color: #059669; }
    .btn-drain { background-color: #2563eb; }
    .btn-text { color: #ffffff; font-weight: 700; font-size: 13px; }

    .queue-section {
      flex: 1;
    }
    .queue-scroll {
      flex: 1;
    }
    .item-row {
      background-color: #ffffff;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #e5e7eb;
    }
    .item-left {
      flex: 1;
      padding-right: 10px;
    }
    .item-id { font-size: 11px; font-weight: 700; color: #6b7280; }
    .item-note { font-size: 14px; color: #1f2937; margin-top: 2px; }
    .item-attempts { font-size: 11px; color: #d97706; margin-top: 2px; }
    .item-error { font-size: 11px; color: #dc2626; margin-top: 2px; }
    .item-right { align-items: flex-end; gap: 6px; }

    .badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 6px;
      border-radius: 4px;
    }
    .badge-queued { background-color: #fef3c7; color: #92400e; }
    .badge-syncing { background-color: #dbeafe; color: #1e40af; }
    .badge-synced { background-color: #d1fae5; color: #065f46; }
    .badge-failed { background-color: #fee2e2; color: #991b1b; }

    .btn-retry {
      background-color: #dc2626;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .retry-text { color: #ffffff; font-size: 11px; font-weight: 700; }
    .empty-row { padding: 20px; align-items: center; }
    .empty-text { color: #6b7280; font-size: 14px; }
  `,
})
export class QueueComponent {
  readonly counts = signal<Record<ReportStatus, number>>({
    draft: 0,
    queued: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
  });

  constructor(
    public repo: ReportsRepository,
    public sync: SyncService,
    public chaos: ChaosService
  ) {
    this.refreshCounts();
  }

  async refreshCounts() {
    const res = await this.repo.countByStatus();
    this.counts.set(res);
  }

  async triggerDrain() {
    await this.sync.drain();
    await this.refreshCounts();
  }
}
