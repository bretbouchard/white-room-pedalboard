# Cache Test Plan

This document summarizes how cache-related tests are handled in this repository. It consolidates prior notes about adapters, test patterns, and flakiness mitigation.

## Requirements / Contract

- Inputs: cache configuration (adapter, size, TTL), test harness (Vitest for Node), simulated load or unit test operations.

- Outputs: deterministic cache hit/miss behavior, metrics (hit-rate, ops/sec), and pass/fail for correctness and performance thresholds.

- Error modes: adapter failures, async timing races, eviction under load.

- Success criteria: stable, reproducible tests with low flakiness; acceptable hit-rate and latency thresholds as defined by each test.

## Key practices used

- Use an in-memory, async storage adapter for Node.js tests (Vitest). This avoids external dependencies and keeps tests fast and deterministic.

- Relax performance thresholds in CI to reduce flakiness. Tests assert ranges (ops/sec, hit-rate) rather than exact values.

- For load-testing, focus assertions on correct behavior (eviction, TTL, rate-limiting) rather than tight timing windows.

## Test patterns

- Unit tests: swap in-memory async adapter; assert correctness of set/get/delete, TTL/expiration, and eviction policies.

- Integration/load tests: simulate concurrent clients; measure hit-rate and ops/sec and assert acceptable ranges.

- Flakiness mitigation: increase timeouts, retry flaky assertions, and avoid tight timing-based checks.

## Benchmarks & Thresholds

- Record ops-per-second and hit-rate into CI artifacts (`test-reports` / `test-results`) for historical comparison.

- When thresholds cause failures in CI, relax them incrementally and document the rationale in test metadata.

## Edge cases to cover

- Empty cache and first-hit scenarios.

- Concurrent writes and race conditions.

- TTL expiry during heavy load.

- Adapter failure simulation (adapter throws/returns errors) to validate higher-level handling.

## Implementation notes

- Use dependency injection for cache adapters so tests can easily swap in-memory adapters.

- Ensure test adapters implement the same async API (promises for get/set/del/list) as production adapters.

- Keep test adapters lightweight and asynchronous to mimic real backends without external dependencies.

## Next steps / Improvements

1. Add a `test-adapters` folder containing a documented in-memory async adapter and example usage in `tests/helpers`.
2. Add a small suite of deterministic concurrency tests runnable in unit test mode.

Notes: content summarized from stored project memories about in-memory async adapters for Vitest/Node tests, relaxing cache performance thresholds, and adjusting rate-limit assertions for load tests.
