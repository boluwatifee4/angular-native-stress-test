import { Component } from '@angular/core';
import { nativePlatform } from '@ng-native/fabric';
import { NativeHeader, NativeStackOutlet, NativeTab, NativeTabsOutlet, type TabIcon } from '@ng-native/router';

@Component({
  selector: 'app-stack',
  imports: [NativeStackOutlet],
  template: '<native-stack-outlet />',
})
export class StackOutlet {}

@Component({
  selector: 'app-tabs',
  imports: [NativeHeader, NativeTab, NativeTabsOutlet],
  template: `
    <native-header [hidden]="true" />
    <native-tabs-outlet>
      <native-tab
        path="inspections"
        title="Inspections"
        sfSymbol="checklist"
        [icon]="isAndroid ? masks.inspections : undefined"
      />
      <native-tab
        path="queue"
        title="Queue"
        sfSymbol="arrow.triangle.2.circlepath"
        [icon]="isAndroid ? masks.queue : undefined"
      />
      <native-tab
        path="diagnostics"
        title="Diagnostics"
        sfSymbol="waveform.path.ecg"
        [icon]="isAndroid ? masks.diagnostics : undefined"
      />
    </native-tabs-outlet>
  `,
})
export class TabsPage {
  protected readonly isAndroid = nativePlatform() === 'android';

  protected readonly masks: Record<'inspections' | 'queue' | 'diagnostics', TabIcon> = {
    inspections: { template: require('../../assets/tab-inspections.png') },
    queue: { template: require('../../assets/tab-queue.png') },
    diagnostics: { template: require('../../assets/tab-diagnostics.png') },
  };
}
