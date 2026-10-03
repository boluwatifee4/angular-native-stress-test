# SiteLog Capability Assessment Matrix

**Framework Versions:**
* **Angular:** 22.0.0
* **Expo SDK:** 57.0.26
* **Angular Native:** 0.3.0
* **React Native:** 0.86.3
* **Date Evaluated:** Oct 3, 2026

---

## Capabilities Checklist

| Capability | Status | Notes & Findings |
| --- | --- | --- |
| **Camera & Photo Picker** | **Works** | `expo-image-picker` (`launchCameraAsync`, `launchImageLibraryAsync`) builds cleanly and integrates with Base64 payload generation. |
| **SQLite (Open, Migrate, Query)** | **Partial** | `expo-sqlite` works on iOS/Android native runtimes. Node/Vitest test environment lacks C++ SQLite bindings, requiring an `IReportRepository` abstraction with `InMemoryReportRepository` for fast Node testing. |
| **Network Status Signal** | **Works** | `@react-native-community/netinfo` provides real-time online/offline connection state wrapped in Angular Signals (`signal<boolean>(true)`). |
| **File System** | **Works** | `expo-file-system` supports cache directory reads, image copying, and Base64 stream encoding. |
| **Audio Recording** | **Partial** | `expo-av` (`Audio.Recording`) installs and exposes recording methods. Requires custom playback UI control in Angular Native. Fallback to typed text notes is ready if runtime device permissions are denied. |
| **Native Stack, Tabs & Deep Linking** | **Works** | Provided natively by `@ng-native/router` via `provideNativeRouter()` and `<native-stack-outlet />`. Supports Android back button navigation and `sitelog://` deep links. |
| **Signal Forms & Validation** | **Works** | `@angular/forms` with Angular Signals (`signal()`, `computed()`) provides validated form binding. |
| **Virtual List** | **Works** | `<virtual-list>` from `@ng-native/components` recycles rows over signal windows (`reports.window()`). |

---

## Key Initial Findings & Test Benchmark
* **Starter Test Execution Speed:** `2.33 seconds` total (Node Vitest test runner execution: `23ms`).
* **Typecheck Verification:** `0 errors` using `ngc -p tsconfig.json --noEmit`.
