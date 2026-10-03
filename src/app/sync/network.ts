import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NetworkService {
  readonly isOnline = signal<boolean>(true);

  setOnline(online: boolean) {
    this.isOnline.set(online);
  }
}
