## v1alpha Contract Inventory for DawDreamer

This document defines the minimal v1alpha contracts (control and data plane) required to migrate the in-process DawDreamer engine into a separate engine process while preserving semantics and real-time guarantees. Each contract includes the fields, intended usage, and references to code locations found in `CouplingReport_DawDreamer.json`.


### Goals

- Provide compact, language-agnostic contracts for the Engine control plane and data plane.

- Map existing code locations to the contract elements they must adopt or produce.

- Provide migration notes and backward-compatible test strategies.


---


### Contract: TransportState

Purpose: Replace direct in-process state inspection. TransportState exposes the engine's playback/transport state for UI and control logic.

Shape (v1alpha):

- session_id: string

- running: bool

- position_seconds: float

- sample_rate: int

- buffer_size_frames: int

- tempo_bpm: float | null

- last_update_iso8601: string


Mapped code locations:

- `src/audio_agent/main.py` (app_state initialization) — was reading engine state directly; should use EngineClient.get_transport_state()

- `src/audio_agent/core/system_health_monitor.py` (engine status checks)


Migration note: keep TransportState compact and versioned. Add an "extensions" map for non-critical fields.


---


### Contract: NodeDescriptor

Purpose: Describe nodes (plugins, processors) that can be instantiated by the engine.

Shape (v1alpha):

- node_id: string

- name: string

- vendor: string | null

- format: string ("vst3"|"au"|"lv2"|"faust"|...)

- supported_sample_rates: list[int]

- latency_samples: int

- parameters: list[{name:string, id:string, default:float, range:[min,max]}]

- resource_estimate: {memory_mb: float, cpu_units: float} | null


Mapped code locations:

- `src/audio_agent/models/plugin.py` (PluginMetadata) — align fields (latency_samples, supported_sample_rates)

- `src/audio_agent/core/advanced_plugin_management.py` (discover_plugins) — return normalized NodeDescriptor lists


Migration note: make NodeDescriptor stable. Use NodeDescriptor for both discovery and run-time instantiation. Keep parameter list optional to avoid heavy serialization costs.


---


### Contract: RenderRequest / RenderResult

Purpose: The central RPC for requesting rendered audio from the engine (synchronous or async). Data-plane transfer uses shared-memory ring buffers for audio frames; the control-plane sends RenderRequest and receives metadata + buffer handles.

RenderRequest (v1alpha):

- request_id: string

- node_graph: minimal graph descriptor (list of node_id + routing)

- duration_seconds: float

- sample_rate: int

- channels: int

- start_position_seconds: float | null

- options: {offline: bool, preroll: float}


RenderResult (v1alpha):

- request_id: string

- status: "ok" | "error" | "partial"

- error: string | null

- buffer_handle: string | null (shared-mem identifier)

- frames: int (number of frames written into buffer)

- processing_time_ms: float


Mapped code locations:

- `src/audio_agent/core/mixing_console.py` (MixingConsole.render_audio -> engine.render_audio)

- `src/audio_agent/core/real_time_processing.py` (real-time render path calling render_audio)

- `src/audio_agent/engine/dawdreamer_engine.py` (render_audio implementation)


Migration note: keep RenderRequest small; transfer bulk audio over shared memory or OS-level buffer handles (mmap, posix_shm, or memfd). For real-time path use pre-allocated ring buffers and a light notification mechanism (eventfd or cross-platform equivalent).


---


### Contract: PluginDiscoveryResult

Purpose: Return normalized discovery results from engine-side scanning.

Shape (v1alpha):

- discovery_id: string

- nodes: list[NodeDescriptor]

- scanned_paths: list[string]

- elapsed_ms: float


Mapped code locations:

- `src/audio_agent/core/advanced_plugin_management.py` (discover_plugins)

- `src/audio_agent/core/plugin_specialist.py` (scan path logic)


Migration note: scan in engine process; keep discovery results cached with TTL and provide explicit invalidation endpoints.


---


### Test and compatibility strategy


- Provide an in-process EngineBootstrapper that spawns a thread-local engine implementing EngineClient interface (in-process fallback for tests and lightweight workflows).

- Provide EngineClient test doubles that emulate the control-plane responses and optionally back the RenderResult with small in-memory buffers.

- Update tests under `tests/` to call EngineClient APIs instead of patching DawDreamerEngine directly.


---


### Next steps (implementation plan)


1. Agree on v1alpha shapes (this doc) and add schema definitions as JSON Schema files under `docs/dawdreamer/schemas/`.

2. Implement `src/audio_agent/engine/client.py` with EngineClient interface and EngineBootstrapper.

3. Implement a small IPC server (Spike 1) that can respond to TransportState and PluginDiscoveryResult requests.

4. Migrate a small set of call-sites (MixingConsole.render_audio, main app_state init) to use EngineClient as a POC.


---


Files referenced by this inventory were discovered in `CouplingReport_DawDreamer.json` (see `docs/dawdreamer/`).


Generated: 2025-09-16T00:00:00Z
