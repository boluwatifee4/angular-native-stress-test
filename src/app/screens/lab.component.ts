import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pressable, ScrollView, Switch, Text, View } from '@ng-native/components';
import { NativeHeader, TabSafeAreaView } from '@ng-native/router';
import { ChaosService, ServerChaosType } from '../chaos/chaos.service';
import { ReportsRepository } from '../data/reports.repo';
import { SyncService } from '../sync/sync.service';
import { ApiClient, DEFAULT_SERVER_URL } from '../sync/api.client';
import { InspectionReport } from '../data/models';
import { OfflineStrip } from './offline-strip';

type CheckResult = boolean | 'skip';

interface Check {
  name: string;
  run: () => Promise<CheckResult>;
}

/** Nothing listens here, so client checks take the offline fallback path in milliseconds. */
const DEAD_SERVER_URL = 'http://localhost:9';

@Component({
  selector: 'app-lab',
  imports: [CommonModule, NativeHeader, OfflineStrip, Pressable, ScrollView, Switch, TabSafeAreaView, Text, View],
  template: `
    <native-header title="Diagnostics" />

    <app-offline-strip />

    <view class="container">
      <tab-safe-area-view [edges]="['bottom']" class="tab-body">
        <scroll-view class="lab-scroll">
          <view class="card">
            <text class="card-title">Network conditions</text>

            <view class="control-row control-row-switch">
              <text class="label">Simulate offline</text>
              <switch
                [checked]="chaos.offline()"
                (checkedChange)="toggleOffline($event)"
                accessibilityLabel="Simulate offline"
              />
            </view>

            <view class="control-row">
              <text class="label">Extra latency: {{ chaos.latencyMs() }}ms</text>
              <view class="pill-group">
                <pressable
                  [class]="'pill ' + (chaos.latencyMs() === 0 ? 'pill-active' : '')"
                  (press)="chaos.setLatency(0)"
                >
                  <text class="pill-text">None</text>
                </pressable>
                <pressable
                  [class]="'pill ' + (chaos.latencyMs() === 1000 ? 'pill-active' : '')"
                  (press)="chaos.setLatency(1000)"
                >
                  <text class="pill-text">1s</text>
                </pressable>
                <pressable
                  [class]="'pill ' + (chaos.latencyMs() === 5000 ? 'pill-active' : '')"
                  (press)="chaos.setLatency(5000)"
                >
                  <text class="pill-text">5s</text>
                </pressable>
              </view>
            </view>

            <view class="control-row">
              <text class="label">Drop the next requests: {{ chaos.failNext() }}</text>
              <view class="pill-group">
                <pressable
                  [class]="'pill ' + (chaos.failNext() === 0 ? 'pill-active' : '')"
                  (press)="chaos.setFailNext(0)"
                >
                  <text class="pill-text">None</text>
                </pressable>
                <pressable
                  [class]="'pill ' + (chaos.failNext() === 3 ? 'pill-active' : '')"
                  (press)="chaos.setFailNext(3)"
                >
                  <text class="pill-text">3</text>
                </pressable>
                <pressable
                  [class]="'pill ' + (chaos.failNext() === 8 ? 'pill-active' : '')"
                  (press)="chaos.setFailNext(8)"
                >
                  <text class="pill-text">8</text>
                </pressable>
              </view>
            </view>
          </view>

          <view class="card">
            <text class="card-title">Server responses</text>

            <view class="chaos-options">
              @for (mode of serverModes; track mode.id) {
                <pressable
                  [class]="'chaos-opt ' + (chaos.serverChaos() === mode.id ? 'opt-active' : '')"
                  (press)="chaos.setServerChaos(mode.id)"
                >
                  <text class="opt-title">{{ mode.label }}</text>
                  <text class="opt-desc">{{ mode.desc }}</text>
                </pressable>
              }
            </view>
          </view>

          <view class="card">
            <text class="card-title">Resilience checks</text>
            <text class="card-body">
              Twelve checks covering offline capture, retries, backoff and server faults. Server
              checks are skipped when the local server is not running.
            </text>

            <pressable
              class="btn-run"
              (press)="runSuite()"
              [disabled]="suiteRunning()"
              accessibilityRole="button"
            >
              <text class="btn-run-text">
                {{ suiteRunning() ? 'Running checks...' : 'Run 12 checks' }}
              </text>
            </pressable>

            @if (experimentLog().length > 0) {
              <view class="log-box">
                @for (log of experimentLog(); track log) {
                  <text class="log-line">{{ log }}</text>
                }
              </view>
            }
          </view>

          <view class="card">
            <text class="card-title">Test data</text>
            <text class="card-body">Fill the list with rows to test scrolling, or start over.</text>
            <view class="data-row">
              <pressable
                class="btn-outline"
                (press)="seedDatabase(500)"
                accessibilityRole="button"
              >
                <text class="btn-outline-text">Seed 500 rows</text>
              </pressable>
              <pressable
                class="btn-outline btn-outline-danger"
                (press)="repo.clearAll()"
                accessibilityRole="button"
              >
                <text class="btn-outline-text">Delete all data</text>
              </pressable>
            </view>
          </view>

          <pressable
            class="btn-reset"
            (press)="chaos.reset(); experimentLog.set([])"
            accessibilityRole="button"
          >
            <text class="reset-text">Reset all conditions</text>
          </pressable>
        </scroll-view>
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
    .lab-scroll {
      flex: 1;
    }
    .card {
      background-color: #ffffff;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 14px;
      border: 1px solid #d8d8dd;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
    }
    .card-body {
      font-size: 13px;
      color: #5f646d;
      line-height: 18px;
      margin-bottom: 12px;
    }
    .control-row {
      margin-bottom: 16px;
    }
    .control-label {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
    .label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    .label-state {
      font-size: 13px;
      font-weight: 600;
      color: #5f646d;
      margin-bottom: 8px;
    }
    .control-row-switch {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .control-row-switch .label {
      margin-bottom: 0;
    }
    .pill-group {
      flex-direction: row;
      gap: 8px;
    }
    .pill {
      background-color: #f3f4f6;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid transparent;
    }
    .pill-active {
      background-color: #ffffff;
      border-color: #111827;
    }
    .pill-text {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
    }

    .chaos-options {
      gap: 8px;
    }
    .chaos-opt {
      background-color: #f9fafb;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #d8d8dd;
    }
    .opt-active {
      border-color: #111827;
      background-color: #ffffff;
    }
    .opt-title {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
    }
    .opt-desc {
      font-size: 12px;
      color: #5f646d;
      margin-top: 2px;
      line-height: 17px;
    }

    .btn-run {
      background-color: #111827;
      padding: 14px;
      border-radius: 10px;
      align-items: center;
    }
    .btn-run-text {
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
    }

    .log-box {
      background-color: #0f172a;
      padding: 12px;
      border-radius: 10px;
      margin-top: 12px;
    }
    .log-line {
      color: #e2e8f0;
      font-family: monospace;
      font-size: 11px;
      margin-bottom: 5px;
    }

    .data-row {
      flex-direction: row;
      gap: 10px;
    }
    .btn-outline {
      flex: 1;
      background-color: #ffffff;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #71767f;
      align-items: center;
    }
    .btn-outline-danger {
      border-color: #fecaca;
    }
    .btn-outline-text {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
    }

    .btn-reset {
      background-color: #ececef;
      padding: 12px;
      border-radius: 10px;
      align-items: center;
      margin-bottom: 24px;
    }
    .reset-text {
      color: #374151;
      font-weight: 600;
      font-size: 13px;
    }
  `,
})
export class LabComponent {
  readonly experimentLog = signal<string[]>([]);
  readonly suiteRunning = signal<boolean>(false);

  readonly serverModes: Array<{ id: ServerChaosType; label: string; desc: string }> = [
    { id: 'none', label: 'Normal', desc: 'The server returns a valid report.' },
    { id: 'timeout', label: 'Slow response', desc: 'The server waits 30s, past the client timeout.' },
    { id: 'rate-limit', label: 'Rate limited', desc: 'The server replies 429 Too Many Requests.' },
    { id: 'malformed', label: 'Bad payload', desc: 'The server returns JSON that does not match the schema.' },
  ];

  constructor(
    public chaos: ChaosService,
    public repo: ReportsRepository,
    public sync: SyncService,
    private apiClient: ApiClient
  ) {}

  async toggleOffline(offline: boolean) {
    this.chaos.setOffline(offline);
    if (!offline) {
      await this.sync.drain();
    }
  }

  async seedDatabase(count: number) {
    const start = Date.now();
    for (let i = 0; i < count; i++) {
      const report: InspectionReport = {
        id: `seed-uuid-${start}-${i}`,
        created_at: start - i * 1000,
        note: `Sample inspection #${i + 1} — roof edge flashing loose near stairwell B.`,
        status: i % 3 === 0 ? 'synced' : i % 3 === 1 ? 'queued' : 'failed',
        attempts: i % 3 === 2 ? 8 : 0,
        error: i % 3 === 2 ? 'Gave up after 8 attempts' : null,
      };
      await this.repo.insert(report);
    }
  }

  async runSuite() {
    if (this.suiteRunning()) return;
    this.suiteRunning.set(true);
    this.experimentLog.set([]);

    const lines: string[] = [];
    const push = (msg: string) => {
      lines.push(msg);
      this.experimentLog.set([...lines]);
    };

    this.chaos.reset();
    // The client-side checks must not depend on the local server: a request to a dead port
    // takes the offline fallback path every time, in milliseconds.
    this.apiClient.setServerUrl(DEAD_SERVER_URL);
    push('Running 12 checks...');

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    const serverUp = await this.probeServer();
    const checks = this.buildChecks(serverUp);

    for (let i = 0; i < checks.length; i++) {
      const check = checks[i];
      this.chaos.reset();
      try {
        const result = await check.run();
        if (result === 'skip') {
          skipped++;
          push(`${i + 1}. ${check.name} - SKIPPED (local server not running)`);
        } else if (result) {
          passed++;
          push(`${i + 1}. ${check.name} - PASS`);
        } else {
          failed++;
          push(`${i + 1}. ${check.name} - FAIL`);
        }
      } catch (err: any) {
        failed++;
        push(`${i + 1}. ${check.name} - FAIL (${err?.message ?? err})`);
      } finally {
        this.chaos.reset();
      }
    }

    push(`Done: ${passed} passed, ${failed} failed, ${skipped} skipped.`);
    this.apiClient.setServerUrl(DEFAULT_SERVER_URL);
    this.suiteRunning.set(false);
  }

  private buildChecks(serverUp: boolean): Check[] {
    const mkReport = async (
      note: string,
      extra: Partial<InspectionReport> = {}
    ): Promise<string> => {
      const id = `check-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      await this.repo.insert({
        id,
        // Epoch, so the drain picks this report before anything already queued.
        created_at: 0,
        note,
        status: 'queued',
        attempts: 0,
        ...extra,
      });
      return id;
    };

    const remove = async (ids: string[]) => {
      for (const id of ids) {
        await this.repo.delete(id);
      }
    };

    return [
      {
        name: 'Reports queue while offline',
        run: async () => {
          this.chaos.setOffline(true);
          const ids = await Promise.all(
            [1, 2, 3].map((i) => mkReport(`Offline capture ${i}`))
          );
          const ok = (await Promise.all(ids.map((id) => this.repo.getById(id)))).every(
            (r) => r?.status === 'queued'
          );
          await remove(ids);
          return ok;
        },
      },
      {
        name: 'Queue drains after reconnecting',
        run: async () => {
          this.chaos.setOffline(true);
          const ids = await Promise.all(
            [1, 2, 3].map((i) => mkReport(`Reconnect capture ${i}`))
          );
          this.chaos.setOffline(false);
          await this.sync.drain();
          const rows = await Promise.all(ids.map((id) => this.repo.getById(id)));
          const ok =
            rows.every((r) => r?.status === 'synced') &&
            rows.every((r) => !!r?.report_json?.title);
          await remove(ids);
          return ok;
        },
      },
      {
        name: 'Interrupted sync recovers on restart',
        run: async () => {
          const id = await mkReport('Interrupted mid-send');
          const row = await this.repo.getById(id);
          await this.repo.update({ ...row!, status: 'syncing' });
          await this.repo.recoverStaleSyncingState();
          const recovered = await this.repo.getById(id);
          await remove([id]);
          return recovered?.status === 'queued';
        },
      },
      {
        name: 'Configured latency is applied',
        run: async () => {
          this.chaos.setLatency(400);
          const started = Date.now();
          await this.apiClient.postReport({
            id: `latency-${Date.now()}`,
            note: 'Latency probe',
          });
          return Date.now() - started >= 400;
        },
      },
      {
        name: 'Dropped request re-queues with a retry time',
        run: async () => {
          this.chaos.setFailNext(1);
          const id = await mkReport('Dropped request probe');
          const started = Date.now();
          await this.sync.drain();
          const row = await this.repo.getById(id);
          await remove([id]);
          return (
            row?.status === 'queued' &&
            row.attempts === 1 &&
            (row.next_retry ?? 0) >= started + 2000 &&
            !!row.error
          );
        },
      },
      {
        name: 'Backoff grows with attempt count',
        run: async () => {
          this.chaos.setFailNext(1);
          const id = await mkReport('Backoff probe', { attempts: 3 });
          const started = Date.now();
          await this.sync.drain();
          const row = await this.repo.getById(id);
          await remove([id]);
          // 2^4 seconds plus jitter, measured from the attempt
          const delay = (row?.next_retry ?? 0) - started;
          return row?.status === 'queued' && row.attempts === 4 && delay >= 16000 && delay < 17500;
        },
      },
      {
        name: 'Eighth failure marks the report as failed',
        run: async () => {
          this.chaos.setFailNext(1);
          const id = await mkReport('Max attempts probe', { attempts: 7 });
          await this.sync.drain();
          const row = await this.repo.getById(id);
          await remove([id]);
          return row?.status === 'failed' && row.attempts === 8 && row.next_retry === null;
        },
      },
      {
        name: 'A failed report can be retried by hand',
        run: async () => {
          const id = await mkReport('Manual retry probe', {
            status: 'failed',
            attempts: 8,
            error: 'Gave up after 8 attempts',
          });
          await this.sync.retryFailedReport(id);
          const row = await this.repo.getById(id);
          await remove([id]);
          return row?.status === 'synced' && row.attempts === 0;
        },
      },
      {
        name: 'Pausing holds reports back',
        run: async () => {
          this.chaos.setPauseSync(true);
          const id = await mkReport('Paused queue probe');
          await this.sync.drain();
          const row = await this.repo.getById(id);
          await remove([id]);
          return row?.status === 'queued';
        },
      },
      {
        name: 'Slow server response hits the timeout',
        run: async () => {
          if (!serverUp) return 'skip';
          this.apiClient.setServerUrl(DEFAULT_SERVER_URL);
          this.chaos.setServerChaos('timeout');
          try {
            await this.apiClient.postReport({ id: 'timeout-probe', note: 'timeout probe' }, 2500);
            return false;
          } catch (err: any) {
            return String(err?.message).includes('timed out');
          }
        },
      },
      {
        name: 'Rate limit (429) is surfaced as an error',
        run: async () => {
          if (!serverUp) return 'skip';
          this.apiClient.setServerUrl(DEFAULT_SERVER_URL);
          this.chaos.setServerChaos('rate-limit');
          try {
            await this.apiClient.postReport({ id: 'rate-probe', note: 'rate probe' });
            return false;
          } catch (err: any) {
            return String(err?.message).includes('429');
          }
        },
      },
      {
        name: 'Malformed server payload is rejected',
        run: async () => {
          if (!serverUp) return 'skip';
          this.apiClient.setServerUrl(DEFAULT_SERVER_URL);
          this.chaos.setServerChaos('malformed');
          try {
            await this.apiClient.postReport({ id: 'malformed-probe', note: 'malformed probe' });
            return false;
          } catch (err: any) {
            return String(err?.message).includes('Malformed');
          }
        },
      },
    ];
  }

  /** The server answers a rate-limit probe with 429 before any model call is made. */
  private async probeServer(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('http://localhost:8787/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-chaos': 'rate-limit' },
        body: JSON.stringify({ id: 'probe', note: 'probe' }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.status === 429;
    } catch {
      return false;
    }
  }
}
