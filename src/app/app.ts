import { Component, Injector, inject } from '@angular/core';
import { SafeAreaProvider } from '@ng-native/components';
import { NativeStackOutlet } from '@ng-native/router';
import { ReportsRepository } from './data/reports.repo';
import { SyncService } from './sync/sync.service';

@Component({
  selector: 'app-root',
  imports: [SafeAreaProvider, NativeStackOutlet],
  template: `
    <safe-area-provider>
      <native-stack-outlet />
    </safe-area-provider>
  `,
  styles: `
    :host {
      flex: 1;
      background-color: #f6f6f7;
    }
  `,
})
export class App {
  private readonly injector = inject(Injector);
  private readonly repo = inject(ReportsRepository);
  private readonly sync = inject(SyncService);

  constructor() {
    void this.initApp();
  }

  async initApp() {
    try {
      const { StatusBar } = await import('@ng-native/device');
      this.injector.get(StatusBar).set({
        style: 'dark',
        backgroundColor: '#ffffff',
        translucent: false,
      });
    } catch (e) {
      // Device StatusBar is not available in the Node test runner.
    }
    await this.repo.init();
    await this.sync.drain();
  }
}
