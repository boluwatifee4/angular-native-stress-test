import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pressable, Text, View, VirtualList, VirtualListRow } from '@ng-native/components';
import { NativeHeader, NativeHeaderItem, NativeNavigation } from '@ng-native/router';
import { ReportsRepository } from '../data/reports.repo';
import { statusLabel } from '../data/status';
import { OfflineStrip } from './offline-strip';

@Component({
  selector: 'app-inspections',
  imports: [
    CommonModule,
    NativeHeader,
    NativeHeaderItem,
    OfflineStrip,
    Pressable,
    Text,
    View,
    VirtualList,
    VirtualListRow,
  ],
  template: `
    <native-header title="Inspections">
      <native-header-item type="right">
        <pressable
          (press)="openCapture()"
          accessibilityRole="button"
          accessibilityLabel="Create inspection"
        >
          <text class="hdr-action">New</text>
        </pressable>
      </native-header-item>
    </native-header>

    <app-offline-strip />

    <view class="container">
      @if (repo.total() === 0) {
        <view class="empty-hero">
          <text class="empty-title">No inspections yet</text>
          <text class="empty-body">
            Anything you create is stored on this device first and sent on its own when you are
            back online.
          </text>
          <pressable
            class="btn-primary btn-hero"
            (press)="openCapture()"
            accessibilityRole="button"
            accessibilityLabel="Create inspection"
          >
            <text class="btn-primary-text">Create inspection</text>
          </pressable>
        </view>
      } @else {
        <virtual-list
          #list
          class="list"
          [items]="repo.reports()"
          [estimatedItemHeight]="150"
          (endReached)="repo.loadMore()"
        >
          @for (row of list.window(); track row.slot) {
            <view [virtualListRow]="row">
              <pressable
                class="card"
                (press)="openReport(row.item.id)"
                accessibilityRole="button"
              >
                <view class="card-top">
                  <text [class]="'badge badge-' + row.item.status">
                    {{ label(row.item.status) }}
                  </text>
                  <text class="card-date">{{ row.item.created_at | date: 'MMM d, HH:mm' }}</text>
                </view>
                <text class="card-note" [numberOfLines]="2">{{ row.item.note }}</text>

                @if (row.item.report_json) {
                  <view class="report-box">
                    <text class="report-title" [numberOfLines]="1">
                      {{ row.item.report_json.title }}
                    </text>
                    <text class="report-meta">
                      {{ row.item.report_json.severity | titlecase }} ·
                      {{ row.item.report_json.category | titlecase }}
                    </text>
                  </view>
                }

                @if (row.item.error) {
                  <text class="card-error" [numberOfLines]="1">{{ row.item.error }}</text>
                }
              </pressable>
            </view>
          }
        </virtual-list>
      }
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
    .hdr-action {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      padding: 4px 2px;
    }
    .btn-primary {
      background-color: #111827;
      padding: 14px 16px;
      border-radius: 10px;
      align-items: center;
    }
    .btn-primary-text {
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
    }
    .list {
      flex: 1;
    }
    .card {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 12px;
      border: 1px solid #d8d8dd;
    }
    .card-top {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 10px;
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
      color: #4b5563;
    }
    .card-date {
      font-size: 12px;
      color: #5f646d;
    }
    .card-note {
      font-size: 15px;
      color: #111827;
      font-weight: 500;
      margin-top: 8px;
      margin-bottom: 4px;
    }
    .report-box {
      background-color: #f9fafb;
      padding: 10px;
      border-radius: 8px;
      border-left-width: 3px;
      border-left-color: #111827;
      margin-top: 4px;
      margin-bottom: 4px;
    }
    .report-title {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }
    .report-meta {
      font-size: 12px;
      color: #5f646d;
      margin-top: 2px;
    }
    .card-error {
      font-size: 12px;
      color: #b91c1c;
      margin-top: 6px;
    }
    .empty-hero {
      flex: 1;
      align-items: center;
      justify-content: center;
      padding: 32px 24px;
    }
    .empty-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    .empty-body {
      font-size: 14px;
      color: #5f646d;
      text-align: center;
      line-height: 20px;
      margin-bottom: 4px;
    }
    .btn-hero {
      margin-top: 20px;
      padding-left: 24px;
      padding-right: 24px;
    }
  `,
})
export class InspectionsComponent {
  readonly label = statusLabel;

  constructor(
    public repo: ReportsRepository,
    private nav: NativeNavigation
  ) {}

  openCapture() {
    void this.nav.present('/capture');
  }

  openReport(id: string) {
    void this.nav.push('/tabs/inspections/' + id);
  }
}
