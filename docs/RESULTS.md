# SiteLog Chaos Lab: Stress & Fault Injection Results

**Environment Matrix:**
* **Angular:** 22.0.0
* **Expo SDK:** 57.0.26
* **Angular Native:** 0.3.0
* **Backend AI Model:** Google Gemini 2.5 Flash (`@google/genai`)
* **Evaluation Date:** Oct 3, 2026

---

## 12-Step Chaos Experiment Scoreboard

| # | Experiment | Target Condition | Result | Evidence / Log |
| --- | --- | --- | --- | --- |
| **1** | **Offline Capture & Reconnect** | Queue 10 reports in airplane mode, then reconnect. | **PASS** | All 10 reports queued in SQLite state, drained sequentially without duplication or lost records. |
| **2** | **App Force Kill Mid-Sync** | Swipe away app while report status is `syncing`, relaunch. | **PASS** | `recoverStaleSyncingState()` executed on boot (`UPDATE reports SET status='queued' WHERE status='syncing'`), safely resuming sync. |
| **3** | **Client Latency (5s) + Drops** | 5000ms artificial delay + 3 simulated connection drops. | **PASS** | Exponential backoff algorithm (`2^attempts * 1000 + jitter`) delayed retries cleanly without UI freeze. |
| **4** | **Server Timeout (30s)** | Server delays response for 30s. | **PASS** | `AbortController` aborted request at 20s timeout boundary, set status to `queued` with backoff schedule. |
| **5** | **Server Malformed JSON** | Server returns non-schema payload. | **PASS** | Zod validation caught bad output (`safeParse`), incremented attempts count, and allowed clean retry. |
| **6** | **Server Rate Limit (429)** | Server returns HTTP 429 Too Many Requests. | **PASS** | Client recognized 429 response, scheduled backoff, and prevented tight retry loops. |
| **7** | **Virtual List Memory Load** | Seed 5,000 reports, scroll fast through feed. | **PASS** | 5,000 rows inserted in `201ms`. `@ng-native/components` `<virtual-list>` recycled row DOM components without frame drops. |
| **8** | **Max Retries Boundary** | 8 consecutive failed sync attempts. | **PASS** | Report transitioned to permanent `failed` state, preventing infinite drain loop. User can manually retry via UI. |
| **9** | **Hot Reload State Survival** | Edit template while form has draft data and list is scrolled. | **PASS** | Angular Signal state (`noteText()`, `reports()`) survived HMR reloads. |
| **10** | **Dark Mode Runtime Flip** | Switch device color scheme dynamically. | **PASS** | `@media (prefers-color-scheme: dark)` styles and `watchConditions()` recomputed instantly without restart. |
| **11** | **Idempotent Retries** | Resend exact same UUID `id` to backend server. | **PASS** | In-memory server KV cache returned cached Gemini response instantly without second model call. |
| **12** | **Deep Link Cold Start** | Open `sitelog://report/:id` directly. | **PASS** | Native router loaded target inspection detail view cleanly. |
