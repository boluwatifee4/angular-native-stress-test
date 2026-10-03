import { Component, inject } from '@angular/core';
import { Text, View } from '@ng-native/components';
import { ChaosService } from '../chaos/chaos.service';

@Component({
  selector: 'app-offline-strip',
  imports: [Text, View],
  template: `
    @if (chaos.offline()) {
      <view class="strip">
        <text class="strip-text">Offline — changes are saved and will sync later</text>
      </view>
    }
  `,
  styles: `
    .strip {
      background-color: #fff7ed;
      padding: 6px 16px;
    }
    .strip-text {
      color: #9a3412;
      font-size: 12px;
      font-weight: 600;
    }
  `,
})
export class OfflineStrip {
  readonly chaos = inject(ChaosService);
}
