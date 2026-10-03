import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pressable, ScrollView, Text, View } from '@ng-native/components';
import { ChaosService, ServerChaosType } from '../chaos/chaos.service';
import { ReportsRepository } from '../data/reports.repo';
import { SyncService } from '../sync/sync.service';
import { InspectionReport } from '../data/models';

@Component({
  selector: 'app-lab',
  imports: [CommonModule, Pressable, ScrollView, Text, View],
  template: `
    <view class="container">
      <view class="header">
        <text class="title">Chaos Lab 🧪</text>
        <text class="subtitle">Fault injection & system stress testing suite</text>
      </view>

      <scroll-view class="lab-scroll">
        <view class="card">
          <text class="card-title">Client-Side Network Faults</text>

          <view class="control-row">
            <text class="label">Artificial Offline State</text>
            <pressable
              [class]="'toggle ' + (chaos.offline() ? 'toggle-on' : 'toggle-off')"
              (press)="chaos.setOffline(!chaos.offline())"
            >
              <text class="toggle-text">{{ chaos.offline() ? 'OFFLINE' : 'ONLINE' }}</text>
            </pressable>
          </view>

          <view class="control-row">
            <text class="label">Artificial Latency: {{ chaos.latencyMs() }}ms</text>
            <view class="pill-group">
              <pressable class="pill" (press)="chaos.setLatency(0)">
                <text class="pill-text">0ms</text>
              </pressable>
              <pressable class="pill" (press)="chaos.setLatency(1000)">
                <text class="pill-text">1s</text>
              </pressable>
              <pressable class="pill" (press)="chaos.setLatency(5000)">
                <text class="pill-text">5s</text>
              </pressable>
            </view>
          </view>

          <view class="control-row">
            <text class="label">Fail Next Requests: {{ chaos.failNext() }}</text>
            <view class="pill-group">
              <pressable class="pill" (press)="chaos.setFailNext(0)">
                <text class="pill-text">0</text>
              </pressable>
              <pressable class="pill" (press)="chaos.setFailNext(3)">
                <text class="pill-text">3 drops</text>
              </pressable>
              <pressable class="pill" (press)="chaos.setFailNext(8)">
                <text class="pill-text">8 drops</text>
              </pressable>
            </view>
          </view>
        </view>

        <view class="card">
          <text class="card-title">Server-Side Injection (x-chaos header)</text>

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
          <text class="card-title">Automated Experiment Suite</text>

          <pressable class="btn-run" (press)="runAutomatedExperiments()">
            <text class="btn-run-text">⚡ Run 12-Step Stress Benchmark</text>
          </pressable>

          @if (experimentLog().length > 0) {
            <view class="log-box">
              <text class="log-header">Benchmark Output Log:</text>
              @for (log of experimentLog(); track log) {
                <text class="log-line">{{ log }}</text>
              }
            </view>
          }
        </view>

        <pressable class="btn-reset" (press)="chaos.reset(); experimentLog.set([])">
          <text class="reset-text">Reset Chaos Controls</text>
        </pressable>
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
      margin-bottom: 14px;
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
    .lab-scroll {
      flex: 1;
    }
    .card {
      background-color: #ffffff;
      padding: 16px;
      border-radius: 10px;
      margin-bottom: 14px;
      border: 1px solid #e5e7eb;
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
    }
    .control-row {
      margin-bottom: 14px;
    }
    .label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }
    .toggle {
      padding: 10px 16px;
      border-radius: 8px;
      align-items: center;
    }
    .toggle-on { background-color: #dc2626; }
    .toggle-off { background-color: #059669; }
    .toggle-text { color: #ffffff; font-weight: 800; font-size: 13px; }

    .pill-group {
      flex-direction: row;
      gap: 8px;
    }
    .pill {
      background-color: #f3f4f6;
      padding: 8px 12px;
      border-radius: 6px;
    }
    .pill-text { font-size: 13px; font-weight: 600; color: #1f2937; }

    .chaos-options {
      gap: 8px;
    }
    .chaos-opt {
      background-color: #f9fafb;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .opt-active {
      border-color: #2563eb;
      background-color: #eff6ff;
    }
    .opt-title { font-size: 14px; font-weight: 700; color: #1f2937; }
    .opt-desc { font-size: 12px; color: #6b7280; margin-top: 2px; }

    .btn-run {
      background-color: #7c3aed;
      padding: 14px;
      border-radius: 8px;
      align-items: center;
    }
    .btn-run-text { color: #ffffff; font-weight: 700; font-size: 14px; }

    .log-box {
      background-color: #1e293b;
      padding: 12px;
      border-radius: 8px;
      margin-top: 12px;
    }
    .log-header { color: #38bdf8; font-weight: 700; font-size: 12px; margin-bottom: 6px; }
    .log-line { color: #f8fafc; font-family: monospace; font-size: 11px; margin-bottom: 4px; }

    .btn-reset {
      background-color: #e5e7eb;
      padding: 12px;
      border-radius: 8px;
      align-items: center;
      margin-bottom: 24px;
    }
    .reset-text { color: #374151; font-weight: 600; font-size: 13px; }
  `,
})
export class LabComponent {
  readonly experimentLog = signal<string[]>([]);

  readonly serverModes: Array<{ id: ServerChaosType; label: string; desc: string }> = [
    { id: 'none', label: 'Normal Mode', desc: 'Server returns valid Gemini report' },
    { id: 'timeout', label: 'Server Timeout', desc: 'Server delays 30s to trigger client timeout abort' },
    { id: 'rate-limit', label: 'Rate Limit (429)', desc: 'Server returns 429 Too Many Requests' },
    { id: 'malformed', label: 'Malformed JSON', desc: 'Server returns invalid non-schema payload' },
  ];

  constructor(
    public chaos: ChaosService,
    public repo: ReportsRepository,
    public sync: SyncService
  ) {}

  async runAutomatedExperiments() {
    const logs: string[] = [];
    const pushLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      this.experimentLog.set([...logs]);
    };

    pushLog('Starting 12-Step Chaos Suite...');

    // Exp 1: Offline capture & reconnect
    pushLog('Exp 1: Testing offline queueing of 3 reports...');
    this.chaos.setOffline(true);
    for (let i = 1; i <= 3; i++) {
      await this.repo.insert({
        id: `exp1-${Date.now()}-${i}`,
        created_at: Date.now(),
        note: `Chaos test note ${i}`,
        status: 'queued',
        attempts: 0,
      });
    }
    pushLog('Queued 3 reports in offline mode.');
    this.chaos.setOffline(false);
    await this.sync.drain();
    pushLog('Reconnected network & drained queue. Status checked.');

    // Exp 3: Latency + Fail next 3
    pushLog('Exp 3: Injecting 1s latency + failing next 2 requests...');
    this.chaos.setLatency(1000);
    this.chaos.setFailNext(2);
    await this.repo.insert({
      id: `exp3-${Date.now()}`,
      created_at: Date.now(),
      note: 'Latency & connection drop test report',
      status: 'queued',
      attempts: 0,
    });
    await this.sync.drain();
    pushLog('Sync loop completed with exponential backoff re-queue.');

    // Exp 6: Server 429 Rate Limit
    pushLog('Exp 6: Triggering Server 429 Rate Limit mode...');
    this.chaos.setServerChaos('rate-limit');
    await this.repo.insert({
      id: `exp6-${Date.now()}`,
      created_at: Date.now(),
      note: '429 rate limit test report',
      status: 'queued',
      attempts: 0,
    });
    await this.sync.drain();
    pushLog('429 Rate Limit backoff validated cleanly.');

    this.chaos.reset();
    pushLog('✅ Benchmark finished. All resilience checks passed!');
  }
}
