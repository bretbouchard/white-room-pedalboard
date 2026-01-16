# Implementation Plan — From Mock to Reality

This document summarizes a focused, low-risk plan to move the repository's "mock-first" audio processing implementation into a production-ready, testable pipeline.

Scope

- Project: schillinger_audio (audio_agent)

- Goal: Replace critical mocks with small, well-tested real implementations, stabilize CI/test suites, and document a clear merge checklist.

High-level phases

1. Core bootstrap & packaging (DAID)

   - Ensure `daid-core` submodule is initialized and importable by tests and runtime.

   - Provide a simple packaging shim and pin tested `daid-core` commit.

   - Add developer bootstrap steps to `docs/` and `backend/README.md`.

2. Test stabilization

   - Identify flaky/integration tests (Schillinger suite) and reproduce failures locally.

   - Add deterministic fixtures and small mocks where needed; prefer small real implementations for critical paths.

   - Add skip markers with clear tickets for non-critical flaky tests.

3. Implementation lift

   - Replace top-level mocks used by critical paths (I/O, plugin loading, analysis engines) with minimal real implementations that are easy to reason about and test.

   - Add unit tests for new implementations with high coverage for touched modules.

4. PR tidy & merge readiness

   - ✅ Create a one-page merge checklist for large PRs: what to test, known caveats, performance impact, and required docs updates. (See: `docs/merge_checklist.md`)

   - ✅ Tidy Implementation Strategy PR to list exact next-step tasks and assignees. (Enhanced with specific actionable tasks below)

5. Incremental rollout & validation

   - Merge small, well-tested PRs iteratively.

   - Run focused end-to-end smoke tests after each merge (integration environment or CI pipeline job).

Success criteria

- DAID submodule imports successfully during local dev and in CI.

- The Schillinger integration tests run reproducibly in CI (or are clearly marked with tickets if flaky).

- Top 10 user-facing flows (creation, transform, provenance chain, plugin load, render) have end-to-end smoke coverage.

- PRs include merge checklist and necessary docs updates.

Risks and mitigations

- Large surface area: break changes into small PRs and use feature flags where possible.

- CI flakiness: isolate flaky tests into a quarantine job and fix root causes in parallel.

Next immediate tasks (priority order)

1. **DAID submodule bootstrap & packaging** (owner: AI IDE Agent)
   - [ ] Verify `daid-core` submodule initializes correctly with `git submodule update --init --recursive`
   - [ ] Test import: `python -c "import daid_core; print('DAID import OK')"`
   - [ ] Run existing DAID tests: `pytest tests/test_daid_adapter.py -v`
   - [ ] Update `backend/README.md` with DAID setup instructions
   - [ ] Pin specific tested commit in `scripts/pin_daid_core.sh`

2. **Reproduce and triage Schillinger test failures** (owner: AI IDE Agent)
   - [ ] Run Schillinger test suite: `pytest tests/test_schillinger_integration.py -v`
   - [ ] Document any failing tests with exact error messages
   - [ ] Identify root causes (import issues, missing fixtures, mock dependencies)
   - [ ] Create GitHub issues for each failing test with clear reproduction steps
   - [ ] Add skip markers with issue numbers for non-critical flaky tests

3. **Tidy Implementation Strategy PR and add merge checklist** (owner: AI IDE Agent) ✅ COMPLETED
   - [x] Review implementation plan for ambiguous language
   - [x] Ensure all tasks have clear acceptance criteria
   - [x] Create one-page merge checklist (see: `docs/merge_checklist.md`)
   - [x] Verify all documentation links are valid
   - [x] Add performance impact assessment

4. **Add first unit tests for `audio_agent/core/schillinger_integration.py`** (owner: AI IDE Agent)
   - [ ] Review current test coverage: `pytest --cov=audio_agent.core.schillinger_integration`
   - [ ] Write tests for core musical functions (rhythm generation, harmony analysis)
   - [ ] Add deterministic fixtures for common test scenarios
   - [ ] Achieve minimum 80% code coverage for new functions
   - [ ] Verify tests run in CI environment

5. **CI pipeline validation** (owner: AI IDE Agent)
   - [ ] Run full test suite locally: `pytest --cov=audio_agent`
   - [ ] Verify coverage meets minimum threshold (currently 20%)
   - [ ] Check for flaky tests by running suite 3 times
   - [ ] Validate all critical paths have test coverage
   - [ ] Document any CI environment requirements

