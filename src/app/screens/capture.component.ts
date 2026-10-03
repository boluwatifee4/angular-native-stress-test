import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Image, Pressable, SafeAreaProvider, SafeAreaView, ScrollView, Text, TextInput, View } from '@ng-native/components';
import { NativeNavigation } from '@ng-native/router';
import { ReportsRepository } from '../data/reports.repo';
import { SyncService } from '../sync/sync.service';
import { InspectionReport } from '../data/models';

@Component({
  selector: 'app-capture',
  imports: [
    CommonModule,
    Image,
    Pressable,
    SafeAreaProvider,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    View,
  ],
  template: `
    <safe-area-provider [reportInsets]="false" class="fill">
      <safe-area-view class="fill" [edges]="['top', 'bottom']">
        <view class="container">
          <view class="top-bar">
            <pressable
              class="btn-cancel"
              (press)="cancel()"
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <text class="cancel-text">Cancel</text>
            </pressable>
          </view>

      <view class="header">
        <text class="title">New inspection</text>
        <text class="subtitle">Record what you found on site.</text>
      </view>

      <scroll-view class="form-scroll">
        <view class="form-card">
          <text class="label">What did you find?</text>
          <text-input
            class="input-note"
            placeholder="Where it is, what you saw, anything unusual..."
            [value]="noteText()"
            (changeText)="noteText.set($event)"
            [multiline]="true"
            [numberOfLines]="4"
          />

          <text class="label">Photo (optional)</text>
          <view class="photo-box">
            @if (photoUri()) {
              <image class="photo-thumb" [source]="photoSrc()" resizeMode="cover" />
              <pressable class="btn-remove" (press)="photoUri.set(null)" accessibilityRole="button">
                <text class="btn-remove-text">Remove photo</text>
              </pressable>
            } @else {
              <view class="photo-btn-row">
                <pressable class="btn-photo" (press)="takePhoto()" accessibilityRole="button">
                  <text class="btn-photo-text">Take photo</text>
                </pressable>
                <pressable class="btn-photo" (press)="pickImage()" accessibilityRole="button">
                  <text class="btn-photo-text">Choose photo</text>
                </pressable>
              </view>
            }
          </view>

          @if (errorMessage()) {
            <text class="error-msg">{{ errorMessage() }}</text>
          }

          <pressable
            class="btn-submit"
            (press)="saveAndSync()"
            accessibilityRole="button"
            accessibilityLabel="Save inspection"
          >
            <text class="btn-submit-text">Save inspection</text>
          </pressable>

          <text class="helper">
            Saved on this device first. It sends on its own when you are back online.
          </text>
        </view>
        </scroll-view>
        </view>
      </safe-area-view>
    </safe-area-provider>
  `,
  styles: `
    :host {
      flex: 1;
    }
    .fill {
      flex: 1;
    }
    .container {
      flex: 1;
      background-color: #f6f6f7;
      padding: 16px;
    }
    .top-bar {
      margin-bottom: 8px;
    }
    .btn-cancel {
      padding: 6px 0;
      align-self: flex-start;
    }
    .cancel-text {
      font-size: 15px;
      font-weight: 600;
      color: #5f646d;
    }
    .header {
      margin-bottom: 16px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }
    .subtitle {
      font-size: 14px;
      color: #5f646d;
      margin-top: 4px;
    }
    .form-scroll {
      flex: 1;
    }
    .form-card {
      background-color: #ffffff;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #d8d8dd;
    }
    .label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    .input-note {
      background-color: #f9fafb;
      border: 1px solid #71767f;
      border-radius: 10px;
      padding: 12px;
      font-size: 15px;
      color: #111827;
      min-height: 110px;
      margin-bottom: 18px;
    }
    .photo-box {
      background-color: #f9fafb;
      padding: 14px;
      border-radius: 10px;
      border: 1px dashed #71767f;
      margin-bottom: 16px;
      align-items: center;
    }
    .photo-btn-row {
      flex-direction: row;
      gap: 10px;
    }
    .btn-photo {
      background-color: #ffffff;
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid #71767f;
    }
    .btn-photo-text {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }
    .photo-thumb {
      width: 160px;
      height: 120px;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .btn-remove {
      padding: 6px 10px;
      background-color: #f3f4f6;
      border-radius: 6px;
    }
    .btn-remove-text {
      color: #4b5563;
      font-size: 12px;
      font-weight: 600;
    }
    .error-msg {
      color: #b91c1c;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .btn-submit {
      background-color: #111827;
      padding: 15px;
      border-radius: 10px;
      align-items: center;
    }
    .btn-submit-text {
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
    }
    .helper {
      font-size: 12px;
      color: #5f646d;
      text-align: center;
      margin-top: 10px;
      line-height: 17px;
    }
  `,
})
export class CaptureComponent {
  readonly noteText = signal<string>('');
  readonly photoUri = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly photoSrc = computed<{ uri: string } | undefined>(() => {
    const uri = this.photoUri();
    return uri ? { uri } : undefined;
  });

  constructor(
    private repo: ReportsRepository,
    private sync: SyncService,
    private nav: NativeNavigation
  ) {}

  cancel() {
    void this.nav.back();
  }

  async pickImage() {
    try {
      const ImagePicker = await import('expo-image-picker');
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        this.photoUri.set(res.assets[0].uri);
        this.errorMessage.set(null);
      }
    } catch (e: any) {
      this.errorMessage.set('Could not open the photo library on this device.');
    }
  }

  async takePhoto() {
    try {
      const ImagePicker = await import('expo-image-picker');
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.7,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        this.photoUri.set(res.assets[0].uri);
        this.errorMessage.set(null);
      }
    } catch (e: any) {
      this.errorMessage.set('Could not open the camera on this device.');
    }
  }

  async saveAndSync() {
    const text = this.noteText().trim();
    if (!text) {
      this.errorMessage.set('Add a note about what you found before saving.');
      return;
    }

    this.errorMessage.set(null);

    const reportId = `report-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const newReport: InspectionReport = {
      id: reportId,
      created_at: Date.now(),
      note: text,
      photo_path: this.photoUri(),
      status: 'queued',
      attempts: 0,
    };

    await this.repo.insert(newReport);
    this.noteText.set('');
    this.photoUri.set(null);

    void this.nav.back();
    void this.sync.drain();
  }
}
