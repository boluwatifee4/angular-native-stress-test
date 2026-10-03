# SiteLog Chaos Lab: Stress & Fault Injection Results

**Environment Matrix:**
* **Angular:** 22.0.0
* **Expo SDK:** 57.0.26
* **Angular Native:** 0.3.0
* **Backend AI Model:** Google Gemini 2.5 Flash (`@google/genai`)
* **Evaluation Date:** Oct 3, 2026

---

## 12-Step Chaos Experiment Scoreboard

| # | Experiment | Target Condition | Result | Video Timestamp | Evidence / Log Details |
| --- | --- | --- | --- | --- | --- |
| **1** | **Offline Capture & Reconnect** | Queue 10 reports in airplane mode, then reconnect. | **PASS** | **0:05 - 0:25** | All 10 reports queued in SQLite state. Automatically drained on reconnect via `@react-native-community/netinfo` listener (`network.onReconnect()`). |
| **2** | **App Force Kill Mid-Sync** | Swipe away app while report status is `syncing`, relaunch. | **PASS** | **0:26 - 0:38** | `recoverStaleSyncingState()` executed on boot (`UPDATE reports SET status='queued' WHERE status='syncing'`), safely resuming sync. |
| **3** | **Client Latency (5s) + Drops** | 5000ms artificial delay + 3 simulated connection drops. | **PASS** | **0:39 - 0:50** | Exponential backoff algorithm (`2^attempts * 1000 + jitter`) and 5s background retry timer delayed retries cleanly without UI thread freeze. |
| **4** | **Server Timeout (30s)** | Server delays response for 30s. | **PASS** | **0:51 - 1:02** | `AbortController` aborted request at 20s timeout boundary, set status to `queued` with backoff schedule. |
| **5** | **Server Malformed JSON** | Server returns non-schema payload. | **PASS** | **1:03 - 1:12** | Zod validation caught bad output (`safeParse`), incremented attempts count, and allowed clean retry. |
| **6** | **Server Rate Limit (429)** | Server returns HTTP 429 Too Many Requests. | **PASS** | **1:13 - 1:25** | Client recognized 429 response, scheduled backoff, and prevented tight retry loops. |
| **7** | **Virtual List Memory Load** | Seed 5,000 reports, scroll fast through feed. | **PASS** | **1:26 - 1:40** | 5,000 rows inserted in `201ms` (Node/Vitest in-memory benchmark; native SQLite on-device timed at `~480ms`). `@ng-native/components` `<virtual-list>` recycled row DOM components without frame drops. |
| **8** | **Max Retries Boundary** | 8 consecutive failed sync attempts. | **PASS** | **1:41 - 1:52** | Report transitioned to permanent `failed` state, preventing infinite drain loop. User can manually retry via UI. |
| **9** | **Photo Base64 Payload** | Attach photo evidence and stream Base64 to server. | **PASS** | **1:53 - 2:05** | Real photo Base64 encoded dynamically via `expo-file-system` (`readAsStringAsync`) and streamed to Gemini API. |
| **10** | **Dark Mode Runtime Flip** | Switch device color scheme dynamically. | **PASS** | **2:06 - 2:15** | `@media (prefers-color-scheme: dark)` styles and `watchConditions()` recomputed instantly without restart. |
| **11** | **Idempotent Retries** | Resend exact same UUID `id` to backend server. | **PASS** | **2:16 - 2:25** | In-memory server KV cache returned cached Gemini response instantly without second model call. |
| **12** | **Deep Link Cold Start** | Open `sitelog://report/:id` directly. | **PASS** | **2:26 - 2:35** | Native router loaded target inspection detail view cleanly. |
