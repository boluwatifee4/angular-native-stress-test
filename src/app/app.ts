import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pressable, SafeAreaProvider, SafeAreaView, Text, View } from '@ng-native/components';
import { StatusBar } from '@ng-native/device';
import { DatabaseService } from './data/db.service';
import { ReportsRepository } from './data/reports.repo';
import { SyncService } from './sync/sync.service';
import { ChaosService } from './chaos/chaos.service';
import { InspectionsComponent } from './screens/inspections.component';
import { QueueComponent } from './screens/queue.component';
import { LabComponent } from './screens/lab.component';
import { CaptureComponent } from './screens/capture.component';
import { DetailComponent } from './screens/detail.component';

export type TabType = 'inspections' | 'queue' | 'lab' | 'capture' | 'detail';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    Pressable,
    SafeAreaProvider,
    SafeAreaView,
    Text,
    View,
    InspectionsComponent,
    QueueComponent,
    LabComponent,
    CaptureComponent,
    DetailComponent,
  ],
  template: `
    <safe-area-provider>
      <safe-area-view class="screen">
        <view class="app-header">
          <view class="app-brand">
            <text class="app-logo">📋 SiteLog</text>
            <text class="app-tag">Angular Native • SDK 57</text>
          </view>
          @if (chaos.offline()) {
            <text class="offline-banner">⚠️ FORCE OFFLINE</text>
          }
        </view>

        <view class="main-content">
          @switch (activeTab()) {
            @case ('inspections') {
              <app-inspections
                (navigateCapture)="activeTab.set('capture')"
                (selectReport)="openDetail($event)"
              />
            }
            @case ('queue') {
              <app-queue />
            }
            @case ('lab') {
              <app-lab />
            }
            @case ('capture') {
              <app-capture (reportCreated)="openDetail($event)" />
            }
            @case ('detail') {
              <app-detail
                [reportId]="selectedReportId()"
                (backPressed)="activeTab.set('inspections')"
              />
            }
          }
        </view>

        <!-- Bottom Navigation Bar -->
        <view class="tab-bar">
          <pressable
            [class]="'tab-btn ' + (activeTab() === 'inspections' ? 'tab-active' : '')"
            (press)="activeTab.set('inspections')"
          >
            <text class="tab-icon">📄</text>
            <text class="tab-label">Reports</text>
          </pressable>

          <pressable
            [class]="'tab-btn ' + (activeTab() === 'queue' ? 'tab-active' : '')"
            (press)="activeTab.set('queue')"
          >
            <text class="tab-icon">⚡</text>
            <text class="tab-label">Queue</text>
          </pressable>

          <pressable
            [class]="'tab-btn ' + (activeTab() === 'lab' ? 'tab-active' : '')"
            (press)="activeTab.set('lab')"
          >
            <text class="tab-icon">🧪</text>
            <text class="tab-label">Chaos Lab</text>
          </pressable>

          <pressable
            [class]="'tab-btn ' + (activeTab() === 'capture' ? 'tab-active' : '')"
            (press)="activeTab.set('capture')"
          >
            <text class="tab-icon">📸</text>
            <text class="tab-label">Capture</text>
          </pressable>
        </view>
      </safe-area-view>
    </safe-area-provider>
  `,
  styles: `
    :host {
      flex: 1;
    }
    .screen {
      flex: 1;
      background-color: #f4f5f8;
    }
    .app-header {
      background-color: #1e293b;
      padding: 14px 16px;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
    .app-brand {
      flex-direction: column;
    }
    .app-logo {
      color: #ffffff;
      font-size: 20px;
      font-weight: 800;
    }
    .app-tag {
      color: #94a3b8;
      font-size: 11px;
      margin-top: 1px;
    }
    .offline-banner {
      background-color: #ef4444;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .main-content {
      flex: 1;
    }
    .tab-bar {
      flex-direction: row;
      background-color: #ffffff;
      border-top-width: 1px;
      border-top-color: #e2e8f0;
      padding-top: 6px;
      padding-bottom: 12px;
    }
    .tab-btn {
      flex: 1;
      align-items: center;
      padding: 4px 0;
    }
    .tab-active {
      border-top-width: 2px;
      border-top-color: #2563eb;
    }
    .tab-icon {
      font-size: 18px;
    }
    .tab-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
    }
    @media (prefers-color-scheme: dark) {
      .screen {
        background-color: #0f172a;
      }
      .tab-bar {
        background-color: #1e293b;
        border-top-color: #334155;
      }
      .tab-label {
        color: #94a3b8;
      }
    }
  `,
})
export class App {
  readonly activeTab = signal<TabType>('inspections');
  readonly selectedReportId = signal<string | null>(null);

  constructor(
    public repo: ReportsRepository,
    public sync: SyncService,
    public chaos: ChaosService,
    private dbService: DatabaseService
  ) {
    inject(StatusBar).set({ style: 'auto' });
    this.initApp();
  }

  async initApp() {
    await this.repo.init();
    await this.sync.drain();
  }

  openDetail(reportId: string) {
    this.selectedReportId.set(reportId);
    this.activeTab.set('detail');
  }
}
