# DawDreamer Coupling Remediation Tasks

Generated from `CouplingReport_DawDreamer.json` (2025-09-16).

This document converts the discovery tool's coupling report into actionable, prioritized tasks to decouple application code from the DawDreamer engine and introduce an EngineClient / EngineBootstrapper architecture.

High-level goals

1. Introduce a process boundary for the audio engine: an Engine process that owns heavy render loops, plugin scanning, and low-latency I/O.

2. Provide an EngineClient facade in the application process that routes calls to either an in-process engine (development/test) or IPC-backed engine (production).

3. Migrate direct engine imports/constructs to use EngineBootstrapper and EngineClient.

Priority legend

1. P0 (blocker): must be addressed early — causes correctness or runtime failure if not decoupled.

2. P1 (major): important refactor to allow process separation and testability.

3. P2 (minor): documentation, validation, and test harness changes that support migration.

Summary (from report)

- total_matches: 200

- hard_couplings: 28

- soft_couplings: 44

Top-priority tasks (P0 / Blockers)

1) Replace direct engine construction and exports with EngineBootstrapper + EngineClient (files: `src/audio_agent/engine/dawdreamer_engine.py`, `src/audio_agent/engine/__init__.py`, `src/audio_agent/main.py`)

   - Problem: multiple call sites import and instantiate `DawDreamerEngine` directly (singleton-style), and package exports re-export the concrete engine class.
   - Acceptance criteria:
     - Introduce `src.audio_agent.engine.bootstrap.EngineBootstrapper` responsible for creating/spawning an engine process or in-process engine instance.
     - Provide `src.audio_agent.engine.client.EngineClient` as the application-facing API. Replace package-level re-exports so `from src.audio_agent.engine import EngineClient` is idiomatic.
     - Update `src/audio_agent/main.py` to use EngineBootstrapper at startup and populate `app_state['engine_client']`.
   - Rough sub-tasks:
     - Design minimal client interface: render_async/render_sync, get_status, plugin_discovery, subscribe_telemetry.
     - Implement bootstrapper with two modes: in-process (for tests/dev) and IPC (socket/unix domain + simple JSON-RPC or MessagePack RPC).
     - Replace direct imports in a small pilot set (e.g., `main.py`, `engine/__init__.py`, `analyzer_integration.py`) and add deprecation warnings with TODO markers where full migration is pending.

2) Move render-heavy loops into engine process and define RenderRequest/RenderResult contract (files: `src/audio_agent/core/dawdreamer_engine.py`, `src/audio_agent/core/mixing_console.py`, `src/audio_agent/core/real_time_processing.py`)

   - Problem: application components call `render_audio(...)` and expect synchronous numpy buffers; this prevents process separation and low-latency guarantees.
   - Acceptance criteria:
     - Define a stable RenderRequest/RenderResult dataclass (serialize-friendly) in `src.audio_agent.engine.contracts`.
     - Implement Engine-side RenderService that consumes RenderRequest and returns RenderResult; add EngineClient.render_async and EngineClient.render_sync convenience wrappers.
     - Replace direct engine.render_audio calls in `mixing_console` and `real_time_processing` with EngineClient calls (initially via synchronous wrappers; later optimize to shared-memory ring buffers for low-latency).

3) Analyzer and plugin integration -> use EngineClient RPC (files: `src/audio_agent/core/analyzer_integration.py`, `src/audio_agent/core/audio_source_manager.py`, `src/audio_agent/core/advanced_plugin_management.py`)

   - Problem: analyzers and plugin discovery rely on engine internals and use direct function calls or singletons.
   - Acceptance criteria:
     - Refactor analyzers to call EngineClient to run processors remotely (e.g., analyze(buffer) => client.run_processor('spectral', buffer)).
     - Move plugin discovery into engine process; expose discovery API that returns PluginDiscoveryResult objects.
     - Provide test harness mode where EngineBootstrapper runs an in-process engine so tests remain fast and deterministic.

High-priority tasks (P1 / Major)

1. Centralize plugin scan cache and metadata schema (files: `src/audio_agent/core/advanced_plugin_management.py`, `src/audio_agent/models/plugin.py`)

   - Implement cache management APIs in the Engine to avoid divergent caches between processes. Agree on plugin descriptor schema (v1alpha).

2. Error/recovery events via control plane (files: `src/audio_agent/core/dawdreamer_error_handling.py`, `src/audio_agent/core/system_health_monitor.py`)

   - Publish blacklist and recovery events from the Engine over the control channel. Let app processes query/persist these lists via EngineClient.

3. Update tests to target EngineClient API (files: `tests/test_dawdreamer_engine.py`, `tests/test_mixing_console.py`)

   - Provide EngineClient test harness fixture, add an IPC-backed fake engine or in-process test mode, and update tests to stop patching concrete DawDreamerEngine.render_audio directly.

Lower-priority tasks (P2 / Minor)

1. Validation and shared adapters (files: `src/audio_agent/models/validation.py`, `src/audio_agent/models/plugin.py`)

   - Document validation rules and provide TypeAdapters for audio buffers to be shared between client/engine APIs.

2. WAM bridge and plugin-config migration (files: `src/audio_agent/core/wam_bridge.py`, `src/audio_agent/core/plugin_specialist.py`)

   - Point these components at EngineClient endpoints or relay via engine process when necessary.

Tests and CI

1. Add integration tests that exercise EngineBootstrapper in both in-process and IPC modes.

2. Add CI smoke test to validate EngineClient endpoints and a contract test for RenderRequest/RenderResult serialization.

Implementation notes and suggestions

1. Start with a minimal, well-documented EngineClient interface and keep the serialization format explicit (JSON or MessagePack). Use typed dataclasses and a small compat layer for versioning.

2. For IPC choose Unix sockets (or TCP for cross-platform) with a small RPC layer (JSON-RPC or msgpack-rpc). Keep it incremental: first do blocking RPC, then add async and shared-memory for low-latency paths.

3. Deprecation plan: add compat shims in the package root that warn when code imports the concrete DawDreamerEngine directly. Track all TODO markers and aim to complete pilot migrations in 2-4 sprints.

Next steps (what I'll do if you want me to continue)

- Generate individual PR-scoped tasks with file patches to (A) add EngineClient contracts and bootstrapper scaffold, (B) migrate main.py and engine package exports, (C) update one analyzer and one render path as a pilot.
- Produce a timeline and estimate per task (hours).

---
Generated by automated coupling analysis -> task synthesis tool.
