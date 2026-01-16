Testing Insights: Organizing Fast, Deterministic, and Trustworthy Tests

Overview

This repository mixes Python, frontend, and a TypeScript SDK. The same testing principles apply across all three tiers: prove real behavior with the lowest operational friction possible, keep tests deterministic, and make it easy to toggle between local mocks and real services.

Key Practices Adopted

- Local-First Module Resolution: Vitest aliases map workspace packages to their local source (not node_modules). This ensures tests exercise the latest SDK code in the workspace and avoids drift with published artifacts.

- One Toggle for Integration Mocks: Integration tests boot a mock API/WebSocket server when `USE_MOCK_API=true`. The server binds an available port and exposes standard endpoints under `/api/v1`. Tests can run fully offline, deterministically, and quickly. This toggle is forced on in `vitest.integration.config.ts` via `test.env`.

- Lazy, Mock-Friendly Imports: Integration adapters (e.g., `SchillingerIntegrationService`) use `import()` inside methods to resolve the SDK at call time. This lets vi.mock intercept module resolution even when the test imports the adapter first. Result: predictable mocking and fewer brittle test-order constraints.

- Deterministic Async Behavior: Where tests depend on timing (e.g., reconnection backoff, streaming chunks), the code paths include small, bounded delays. For rate-limit tests, a simple per-second throttle provides consistent elapsed times without complex schedulers.

- Graceful Fallbacks With Parity: When an integration call fails (e.g., no live API), the SDK uses local math implementations as a fallback but still honors rate limits and increments test quota counters. This preserves test semantics (success/failure, timing) with or without a real backend.

- Shape-First Contracts: Monitoring and telemetry accessors (`getMonitoringData`, `getTelemetryData`, `recordMetric`) return the exact shapes tests assert on. Tests stay focused on behavior, not on incidental internal representations.

- Feature Flags Override Defaults: `isFeatureEnabled` honors explicit `config.features` first, then environment defaults. Tests can flip features without touching global state.

How Teams Can Apply This

1) Add a Mock Server Adjacent to Tests
   - Co-locate a tiny Express (or FastAPI) server in your test folder.
   - Make it boot conditionally from a single environment variable (`USE_MOCK_API`).
   - Prefer clear, stable JSON shapes the SDK/app can consume directly.

2) Force Local Resolution in Test Runners
   - Configure Vitest/Jest aliases to local `packages/*/src` paths.
   - Exclude `node_modules` shadows of your workspace packages.

3) Design Adapters for Testability
   - Move imports for heavy dependencies into functions/methods so your test mocks can reliably intercept them.
   - Avoid top-level side effects in adapters.

4) Make Fallbacks Behave Like the Real Thing
   - On HTTP failure, use a local implementation that still honors rate limits, quotas, and metrics. Keep externally observable behavior (timing, success/failure) consistent.

5) Prefer Shape-Oriented Accessors
   - When tests need operational data (metrics, telemetry, debug info), expose a stable accessor with the exact shape you expect tests to use.

6) Keep Timing Tight but Predictable
   - Keep test delays in the low milliseconds, but cap maxima and avoid exponential backoff where not strictly necessary.

7) Document the Toggle and Contracts
   - Put a short section in your test README that explains how to run with mocks vs. live backends and what the mock server guarantees.

References in This Repo

- Vitest aliases and env: `vitest.integration.config.ts`
- Mock server and test helpers: `sdk/tests/integration/setup.ts`
- Mock-friendly adapter: `sdk/src/integration/schillinger-service.ts`
- Deterministic WebSocket tests: `frontend/src/utils/__tests__/WebSocketClient.test.ts`

