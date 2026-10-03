import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NetworkService {
  readonly isOnline = signal<boolean>(true);
  private onReconnectCallback?: () => void;

  constructor() {
    this.initNetInfoListener();
  }

  onReconnect(cb: () => void) {
    this.onReconnectCallback = cb;
  }

  private async initNetInfoListener() {
    try {
      const NetInfo = await import('@react-native-community/netinfo');
      NetInfo.addEventListener((state) => {
        const online = Boolean(state.isConnected && state.isInternetReachable !== false);
        const wasOffline = !this.isOnline();
        this.isOnline.set(online);

        if (online && wasOffline && this.onReconnectCallback) {
          console.log('[NetworkService] Reconnect detected via NetInfo event listener!');
          this.onReconnectCallback();
        }
      });
    } catch (e) {
      // NetInfo native module unavailable in Node test runner
    }
  }

  setOnline(online: boolean) {
    const wasOffline = !this.isOnline();
    this.isOnline.set(online);
    if (online && wasOffline && this.onReconnectCallback) {
      this.onReconnectCallback();
    }
  }
}
