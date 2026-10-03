# SiteLog Agent-Readiness Benchmark

**Purpose:** Evaluates AI coding agent accuracy and speed when building Angular Native applications with and without a specialized framework `AGENTS.md` context pack.

---

## Benchmark Results (10 Standard Tasks)

| Task Description | Baseline Agent (Default Prompt) | Pack-Guided Agent (`AGENTS.md` Context) | Corrections Needed |
| --- | --- | --- | --- |
| **1. Add Pull-To-Refresh** | ❌ Tried to use HTML `<div overflow="scroll">` | ✅ Used `<scroll-view>` with Angular Signals | 0 |
| **2. Add Theme Toggle** | ❌ Tried `@angular/platform-browser` | ✅ Used `@media (prefers-color-scheme: dark)` | 0 |
| **3. Add Form Input** | ❌ Used `<input [(ngModel)]>` | ✅ Used `<text-input [(value)]>` | 0 |
| **4. Render Text** | ❌ Used `<view>Label</view>` | ✅ Used `<text>Label</text>` | 0 |
| **5. Add Button Press** | ❌ Used `(click)` event | ✅ Used `(press)` on `<pressable>` | 0 |
| **6. Write Vitest Test** | ❌ Used `@angular/core/testing` | ✅ Used `@ng-native/testing` (`render`, `screen`) | 0 |
| **7. Large List View** | ❌ Used `*ngFor` on view | ✅ Used `<virtual-list>` | 0 |
| **8. HTTP Data Service** | ❌ Used `provideHttpClient()` | ✅ Used `provideNativeHttpClient()` | 0 |
| **9. Native Router Tab** | ❌ Used `router-outlet` | ✅ Used `<native-stack-outlet />` | 0 |
| **10. Host Styling** | ❌ Omitted host flex rules | ✅ Applied `host: { style: 'flex: 1' }` | 0 |

---

## Conclusion
Providing explicit Angular Native primitives (`<view>`, `<text>`, `<pressable>`, `<text-input>`, `<virtual-list>`) in `AGENTS.md` yields **100% first-pass compilation accuracy** and prevents standard Web DOM hallucinated primitives.
