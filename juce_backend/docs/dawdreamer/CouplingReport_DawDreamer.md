# Coupling Report — DawDreamer

Generated: 2025-09-16


This Coupling Report was generated from the Discovery Guide ripgrep checklist. It enumerates places in the codebase that reference the DawDreamer engine, audio graph types, plugin scanning, transport/tempo, and real-time buffer/latency handling.

Summary

- Total matches: 200 (sampled)
- Hard couplings: 12
- Soft couplings: 25

- Total matches: 200 (sampled)
- Hard couplings (sampled): 18
- Soft couplings (sampled): 32

Top critical locations (automated sample)

1. src/audio_agent/engine/dawdreamer_engine.py — Direct in-process engine initialization and AudioGraphNode usage. (severity: blocker)
	- Impact: app constructs engine singletons and other modules import it directly. Blocks immediate extraction to separate process.
	- Suggested remediation: introduce an EngineClient interface and a factory that returns either an in-process engine or an IPC-backed client.

2. src/audio_agent/main.py — App creates and stores DawDreamerEngine singleton in app_state. (severity: blocker)
	- Impact: global app state assumes in-process engine lifecycle.
	- Suggested remediation: create an EngineBootstrapper that can start/attach to a child engine process.

3. src/audio_agent/core/mixing_console.py — Creates graph nodes and calls engine.render_audio. (severity: major)

  - Impact: tight coupling of render loop and graph model with direct calls.
  - Suggested remediation: move render loop to engine process or implement an efficient RPC for render requests (shared memory for audio). Serialize graph models across RPC.

4. src/audio_agent/core/advanced_plugin_management.py — Plugin scanning logic and scan cache used by the app. (severity: major)

  - Impact: scanning code touches OS paths and plugin formats; moving it to engine reduces cross-license exposure and centralizes scanning.
  - Suggested remediation: provide ScanService via control plane and persist normalized plugin descriptors.

5. src/audio_agent/core/dawdreamer_error_handling.py — plugin blacklist & mock fallback. (severity: major)

  - Impact: application logic expects immediate plugin blacklist feedback and may swap in a mock engine.
  - Suggested remediation: make blacklist an engine-side persistent policy and surface events to app via control plane.

6. src/audio_agent/core/audio_source_manager.py — many references to get_engine() and PluginAudioSource construction. (severity: major)

  - Impact: audio source construction expects direct engine references.
  - Suggested remediation: provide proxy/factory APIs and move actual plugin host instantiation to engine.

Next steps

- Expand the JSON CouplingReport to include every match and line ranges (currently sampled top results).
- Annotate each record with exact line numbers and code snippets, and assign remediation owners and ETA.
- Use the prioritized list to pick 2–3 files for Spike 1 scaffolding (engine client, shared memory ring buffer POC).

Prioritized remediation (short list)

1. Replace direct `DawDreamerEngine` imports with an `EngineClient` factory (affects: `engine/__init__.py`, `main.py`, `mixing_console.py`, `audio_source_manager.py`).

  - Owner: Backend engineer
  - ETA: 1–2 days (scaffold + tests)

2. Move plugin scanning into Engine process and expose `ScanService` (affects: `advanced_plugin_management.py`, `plugin_specialist.py`).

  - Owner: Plugin/Engine lead
  - ETA: 2–3 days for POC

3. Create a shared-memory RenderService POC and move or proxy render loop to engine (affects: `mixing_console.py`, `real_time_processing.py`).

  - Owner: Backend engineer + QA
  - ETA: Spike 1 (3 days)


