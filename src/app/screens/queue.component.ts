import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { NativeHeader } from '@ng-native/router';
import { ReportsRepository } from '../data/reports.repo';
import { SyncService } from '../sync/sync.service';
import { ChaosService } from '../chaos/chaos.service';
import { statusLabel } from '../data/status';
import { OfflineStrip } from './offline-strip';

@Component({
  selector: 'app-queue',
  imports: [CommonModule, NativeHeader, OfflineStrip, Pressable, ScrollView, Text, View],
  template: `
    <native-header title="Queue" />

    <app-offline-strip />

    <view class="container">
      <view class="stats-card">
        <view class="stat">
          <text class="stat-num stat-queued">{{ repo.statusCounts()['queued'] }}</text>
          <text class="stat-label">Queued</text>
        </view>
        <view class="stat">
          <text class="stat-num stat-sending">{{ repo.statusCounts()['syncing'] }}</text>
          <text class="stat-label">Sending</text>
        </view>
        <view class="stat">
          <text class="stat-num stat-sent">{{ repo.statusCounts()['synced'] }}</text>
          <text class="stat-label">Sent</text>
        </view>
        <view class="stat">
          <text class="stat-num stat-failed">{{ repo.statusCounts()['failed'] }}</text>
          <text class="stat-label">Failed</text>
        </view>
      </view>

      <view class="controls-card">
        <pressable
          class="btn btn-secondary"
          (press)="chaos.setPauseSync(!chaos.pauseSync())"
          accessibilityRole="button"
        >
          <text class="btn-secondary-text">
            {{ chaos.pauseSync() ? 'Resume syncing' : 'Pause syncing' }}
          </text>
        </pressable>

        <pressable class="btn btn-primary" (press)="sync.drain()" accessibilityRole="button">
          <text class="btn-primary-text">Sync now</text>
        </pressable>
      </view>

      <view class="queue-section">
        <text class="section-title">Waiting</text>

        <scroll-view class="queue-scroll">
          @for (item of waiting(); track item.id) {
            <view class="item-row">
              <view class="item-left">
                <text class="item-note" [numberOfLines]="2">{{ item.note }}</text>
                @if (item.attempts > 0) {
                  <text class="item-attempts">Attempt {{ item.attempts }} of 8</text>
                }
                @if (item.error) {
                  <text class="item-error" [numberOfLines]="1">{{ item.error }}</text>
                }
              </view>

              <view class="item-right">
                <text [class]="'badge badge-' + item.status">{{ label(item.status) }}</text>

                @if (item.status === 'failed') {
                  <pressable
                    class="btn-retry"
                    (press)="sync.retryFailedReport(item.id)"
                    accessibilityRole="button"
                  >
                    <text class="retry-text">Retry</text>
                  </pressable>
                }
              </view>
            </view>
          } @empty {
            <view class="empty-row">
              <text class="empty-title">Nothing waiting</text>
              <text class="empty-text">Everything you have recorded has been sent.</text>
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
      background-color: #f6f6f7;
      padding: 16px;
    }
    .stats-card {
      flex-direction: row;
      background-color: #ffffff;
      border: 1px solid #d8d8dd;
      border-radius: 12px;
      padding: 14px 6px;
      margin-bottom: 12px;
    }
    .stat {
      flex: 1;
      align-items: center;
    }
    .stat-num {
      font-size: 20px;
      font-weight: 700;
    }
    .stat-queued {
      color: #b45309;
    }
    .stat-sending {
      color: #1d4ed8;
    }
    .stat-sent {
      color: #047857;
    }
    .stat-failed {
      color: #b91c1c;
    }
    .stat-label {
      font-size: 11px;
      font-weight: 600;
      color: #5f646d;
      margin-top: 2px;
    }
    .controls-card {
      flex-direction: row;
      gap: 10px;
      margin-bottom: 16px;
    }
    .btn {
      flex: 1;
      padding: 13px;
      border-radius: 10px;
      align-items: center;
    }
    .btn-primary {
      background-color: #111827;
    }
    .btn-primary-text {
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
    }
    .btn-secondary {
      background-color: #ffffff;
      border: 1px solid #71767f;
    }
    .btn-secondary-text {
      color: #111827;
      font-weight: 600;
      font-size: 14px;
    }
    .queue-section {
      flex: 1;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #5f646d;
      margin-bottom: 8px;
    }
    .queue-scroll {
      flex: 1;
    }
    .item-row {
      background-color: #ffffff;
      padding: 12px;
      border-radius: 10px;
      margin-bottom: 8px;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #d8d8dd;
    }
    .item-left {
      flex: 1;
      padding-right: 10px;
    }
    .item-note {
      font-size: 14px;
      color: #111827;
      font-weight: 500;
    }
    .item-attempts {
      font-size: 12px;
      color: #b45309;
      margin-top: 4px;
    }
    .item-error {
      font-size: 12px;
      color: #b91c1c;
      margin-top: 4px;
    }
    .item-right {
      align-items: flex-end;
      gap: 6px;
    }
    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
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
    .btn-retry {
      background-color: #111827;
      padding: 6px 12px;
      border-radius: 8px;
    }
    .retry-text {
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
    }
    .empty-row {
      padding: 28px 16px;
      align-items: center;
    }
    .empty-title {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .empty-text {
      color: #5f646d;
      font-size: 13px;
      text-align: center;
    }
  `,
})
export class QueueComponent {
  readonly label = statusLabel;

  constructor(
    public repo: ReportsRepository,
    public sync: SyncService,
    public chaos: ChaosService
  ) {}

  waiting() {
    return this.repo
      .reports()
      .filter((r) => r.status === 'queued' || r.status === 'syncing' || r.status === 'failed');
  }
}
