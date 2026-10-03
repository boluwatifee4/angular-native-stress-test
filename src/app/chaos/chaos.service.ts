import { Injectable, signal } from '@angular/core';

export type ServerChaosType = 'none' | 'timeout' | 'malformed' | 'rate-limit';

@Injectable({
  providedIn: 'root',
})
export class ChaosService {
  readonly offline = signal<boolean>(false);
  readonly latencyMs = signal<number>(0);
  readonly failNext = signal<number>(0);
  readonly serverChaos = signal<ServerChaosType>('none');
  readonly pauseSync = signal<boolean>(false);

  setOffline(offline: boolean) {
    this.offline.set(offline);
  }

  setLatency(ms: number) {
    this.latencyMs.set(ms);
  }

  setFailNext(count: number) {
    this.failNext.set(count);
  }

  setServerChaos(mode: ServerChaosType) {
    this.serverChaos.set(mode);
  }

  setPauseSync(pause: boolean) {
    this.pauseSync.set(pause);
  }

  reset() {
    this.offline.set(false);
    this.latencyMs.set(0);
    this.failNext.set(0);
    this.serverChaos.set('none');
    this.pauseSync.set(false);
  }
}
