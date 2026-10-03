# SiteLog — Offline-First Inspection Reporter & Chaos Lab

An offline-first industrial inspection reporter built to stress-test **Angular Native (v0.3.0)** and **Expo SDK 57** under real-world network fault conditions, powered by a **Google Gemini 2.5 Flash** backend.

---

### Core Documentation & Benchmark Reports

* **[Chaos Lab Scoreboard (RESULTS.md)](docs/RESULTS.md)** — Detailed 12-step fault injection results (timeouts, 429 rate limits, malformed JSON, and app force kills).
* **[Native Capability Matrix (CAPABILITIES.md)](docs/CAPABILITIES.md)** — Audit of 8 core native capabilities across SQLite, Audio, Camera, Network, and Virtual Lists.
* **[Agent Readiness Benchmark (AGENT-BENCHMARK.md)](docs/AGENT-BENCHMARK.md)** — 10-task AI coding agent compilation and accuracy benchmark suite.

---

## Demo Video & Chaos Lab Walkthrough

<!-- UPLOAD YOUR DEMO VIDEO: Replace the src URL below with your video link or GitHub upload asset -->


https://github.com/user-attachments/assets/47fd6de8-1fb8-4c50-b631-f409af541212





---

## Technical Scoreboard

| Metric | Measured Value | Implementation Note |
| --- | --- | --- |
| **SQLite Performance** | **5,000 rows in 201ms** | Local-first storage with native indexed queries |
| **Chaos Lab Stress Suite** | **12 / 12 Passed** | Resilient against 30s delays, drops, 429s, and force-kills |
| **Request Idempotency** | **100% Cached** | Client-generated UUID keys prevent duplicate AI model calls |
| **Agent Compilation Rate** | **100% First-Pass** | 10/10 tasks compiled accurately using custom `AGENTS.md` rules |

---

## System Overview

SiteLog is a production-grade mobile inspection reporter exploring the performance limits of Angular Native. Rather than building a generic CRUD app, SiteLog focuses on offline data resilience, native stack navigation, and active fault injection testing.

### Key Architecture Features

* **Native View Renderer:** Built on React Native's Fabric renderer using `@ng-native/components` (`<view>`, `<text>`, `<pressable>`, `<virtual-list>`).
* **Offline-First State Machine:** Status-driven lifecycle (`draft` -> `queued` -> `syncing` -> `synced` / `failed`).
* **Boot Recovery Guard:** Crashes during sync are safely recovered on startup via `UPDATE reports SET status='queued' WHERE status='syncing'`.
* **Exponential Backoff & Jitter:** Retries failing network requests using $t_{\text{retry}} = \text{now} + \min(2^{\text{attempts}} \times 1000, 300000) + \text{jitter}$.
* **Chaos Lab Diagnostics:** Dedicated diagnostic interface for simulating forced latency, network drops, and server HTTP 429 rate limits.
* **AI Report Generation:** Hono backend powered by `@google/genai` (`gemini-2.5-flash`) with structured JSON outputs (`responseSchema`) and Zod validation.
* **Native Router Navigation:** `@ng-native/router` with native stack outlets, SF Symbols on iOS, and asset masks on Android.

## System Architecture

```
+-------------------------------------------------------------------------+
|                 MOBILE CLIENT (Angular Native + Expo SDK 57)            |
|                                                                         |
|  [ Inspections | Queue | Diagnostics | Capture | Detail UI Screens ]    |
|                                  |                                      |
|                    [ ReportsRepository (Signals) ]                      |
|                                  |                                      |
|                       [( Local Expo SQLite DB )]                        |
|                                  |                                      |
|                      [ SyncEngine Drain Loop ]                          |
|                                  |                                      |
|                 [ Chaos Interceptor (fetchWithChaos) ]                  |
+----------------------------------|--------------------------------------+
                                   |
                       POST /reports (x-chaos)
                                   |
+----------------------------------v--------------------------------------+
|                    BACKEND SERVER (Hono @ Port 8787)                    |
|                                                                         |
|                     [ Idempotency Cache (UUID Map) ]                    |
|                                  |                                      |
|                 [ Google Gemini 2.5 Flash AI Engine ]                   |
+-------------------------------------------------------------------------+
```

---

## Quick Start

### 1. Installation
```bash
git clone https://github.com/your-username/sitelog.git
cd sitelog
npm install
```

### 2. Launch Gemini AI Backend Server
```bash
cd server
npm install
GEMINI_API_KEY="your_api_key" npm run dev
```
*(If no API key is set, the server automatically defaults to structured mock responses for offline testing).*

### 3. Launch Mobile App
```bash
# In project root:
npx expo start --localhost
```
Press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR code with **Expo Go**.

---

## Automated Test Suite

Run unit tests and typechecks:

```bash
# Run Vitest test suite (Node fake native layer)
npm test

# Run Angular Compiler typecheck
npm run typecheck
```
