# Audio Agent → Full JUCE Conversion: Engineering Review & Migration Plan (v1)

**Audience:** Audio Agent core team (engineering, QA, PM, legal)

**Purpose:** Provide a structured framework to review the existing codebase and determine the scope, effort, and risks to convert Audio Agent from the current Electron/Python stack to a **full JUCE** (C++) application suitable for Steam and future platforms.

---

## 1) Objectives & Success Criteria

**Primary goals**

* Replace Electron/Next UI and Python/DawDreamer runtime with a native **JUCE** application (UI + audio engine + plugin host).
* Preserve or improve current features: VST3/AU/LV2/CLAP hosting, MIDI/OSC, session management, rendering/export, and agent integrations.
* Achieve lower latency, smaller footprint, and improved cross‑platform portability (Windows/macOS/Linux now; optional iOS/Android later).

**Success criteria**

* Cold start < 2.5s; audio graph reconfigure < 200ms; round‑trip latency consistent with native DAWs on each OS.
* Plugin compatibility ≥ 95% of top‑used VST3/AU in internal tests.
* All current UX flows are available and pass acceptance tests.
* Steam build pipelines green for Win/macOS/Linux; notarized/signed where applicable.

---

## 2) Current Architecture Inventory (What to Review)

**A. UI / UX**

* React/Next components, state mgmt, canvas/visualization (tldraw/Three.js), windowing/menus, file dialogs.
* Hotkeys, transport, timeline, meters, device selection, controller mapping.

**B. Audio Engine & Host**

* DawDreamer graphs (nodes, routing), plugin scanning/validation, parameter automation, render/export paths.
* Realtime vs offline rendering, buffer sizes, scheduler, timebase/tempo sync.

**C. Protocol I/O**

* MIDI in/out, OSC, WebMIDI, RTP‑MIDI, any SysEx handling.

**D. Project/Asset I/O**

* Session file formats (JSON, YAML, custom), audio/MIDI import/export, preset banks, sample libraries.

**E. Services & Integrations**

* Agent APIs (LangGraph/Swarm/MCP), AI features, authentication (if any), cloud sync (if any).

**F. Tooling & DevOps**

* Build scripts, packaging (Electron builder, PyInstaller), crash reporting, logging/metrics.

**G. Licensing Footprint**

* DawDreamer (GPLv3), JUCE (GPL/commercial), Electron (MIT), Python libs, third‑party DSP, icons/fonts/media.

*For each section above, produce a short status (Stable / Needs rewrite / Replace) and note blockers.*

---

## 3) JUCE Migration Overview (Target State)

**JUCE provides:**

* **UI:** Components, OpenGL/Metal, vector graphics, HiDPI; menus, dialogs, file choosers; keyboard focus.
* **Audio:** `AudioProcessorGraph`, `AudioDeviceManager`, `AudioTransportSource`, audio/MIDI I/O, sample‑accurate scheduling.
* **Plugin Hosting:** VST3 (cross‑platform), AU (macOS), preliminary LV2 via community modules or internal bridge; CLAP via third‑party modules.
* **MIDI/OSC/Networking:** MIDI I/O, `OSCReceiver/OSCSender`, sockets/HTTP/WebSockets.
* **File & Project:** XML/JSON utilities, binary data, ZIP, audio readers/writers (WAV/AIFF/FLAC/MP3\*), MIDI.
* **Cross‑platform build:** CMake/Projucer → Win/macOS/Linux (optionally iOS/Android).

**Key replacements**

* Electron/React UI → JUCE Components & custom widgets.
* DawDreamer engine → JUCE `AudioProcessorGraph` (or Carla/CLAP host bridge if needed).
* Python services → C++ modules (or plugin‑style embedded scripting if required, e.g., Lua/Chakra/QuickJS).

---

## 4) Module‑by‑Module Mapping & Review Checklist

Use this table to drive codebase walkthroughs and gap analysis.

| Current Capability | Current Impl               | JUCE Path(s)                                      | Gaps / Decisions                    | Notes |
| ------------------ | -------------------------- | ------------------------------------------------- | ----------------------------------- | ----- |
| Windowing & Menus  | Electron                   | JUCE `DocumentWindow`, `MenuBarModel`             | Map hotkeys; multi‑window?          |       |
| Canvas/Visuals     | React/Three/tldraw         | JUCE Graphics/OpenGL; or embed Skia/ImGui         | Performance targets; zoom/pan tools |       |
| Transport/Timeline | JS state + audio callbacks | JUCE transport + custom timeline                  | Snapping/markers/loop points        |       |
| Metering/Scopes    | WebAudio + canvases        | JUCE audio visualizers                            | Peak/RMS/LUFS widgets               |       |
| Plugin Hosting     | DawDreamer                 | JUCE VST3/AU host; LV2/CLAP bridges               | Sidechains, MIDI FX, sandboxing     |       |
| Plugin Scan        | Python + OS dirs           | JUCE `PluginDirectoryScanner`                     | Cache format; per‑OS paths          |       |
| Routing Graph      | DawDreamer graph           | `AudioProcessorGraph`                             | Serialisation of graph              |       |
| Automation         | Engine + UI bindings       | JUCE parameters, automation lanes                 | Curves, record‑enable, latch/touch  |       |
| Audio I/O          | Node/native bridges        | `AudioDeviceManager` (ASIO/WASAPI/CoreAudio/JACK) | Device prefs, sample rate changes   |       |
| MIDI I/O           | WebMIDI/Node               | JUCE MIDI                                         | Clock/mtc/sysex filtering           |       |
| OSC                | Node `osc`                 | JUCE OSC                                          | Port conflicts, reconnect policies  |       |
| Render/Export      | Python renderers           | JUCE offline render path                          | Dithering, loudness targets         |       |
| File Formats       | JSON/others                | JUCE JSON/XML + custom schema                     | Back‑compat loaders/migrations      |       |
| Presets            | Filesystem + JSON          | JUCE `AudioProcessorValueTreeState` or custom     | Cross‑OS portability                |       |
| Crash/Telemetry    | Node + Sentry              | Breakpad/Crashpad + custom upload                 | PII policy                          |       |
| Steamworks         | Electron greenworks        | C++ Steamworks SDK                                | Achievements/cloud saves            |       |
| Agents/AI          | HTTP/WebSockets            | HTTP/WebSockets (JUCE or cpp-httplib)             | Threading & timeouts                |       |

*Output: one‑pager per row with findings, options, and recommendation.*

---

## 5) Technical Spikes (Proofs of Concept)

1. **Host Parity Spike**: Load top 20 user plugins; verify audio/MIDI I/O, parameter automation, preset load/save, sidechain, and tempo sync.
2. **Routing Graph Spike**: Implement a minimal `AudioProcessorGraph` with save/load to JSON; live graph edits without audio dropouts.
3. **Timeline & Automation Spike**: Prototype timeline with regions, loop, automation lanes; measure UI <-> audio thread interactions.
4. **Visuals Spike**: Port one complex visualization (spectrum/oscilloscope) and one canvas editor control.
5. **Steamworks Spike**: Achievements + cloud save from JUCE C++; confirm depots and branch switching.
6. **Performance Spike**: Benchmark latency/CPU vs current app on identical hardware.

*Deliverables: short code branches + benchmark notes + go/no‑go per spike.*

---

## 6) Build, Packaging & Distribution

* **Toolchain**: CMake + JUCE; GitHub Actions runners for Win/macOS/Linux.
* **Signing/Notarization**: macOS Developer ID; Windows code signing (EV recommended) + timestamping.
* **Artifacts**: MSI/EXE (Win), signed `.app`/DMG (macOS), AppImage/DEB/RPM (Linux).
* **Steam**: SteamPipe scripts per OS depot; versioning, branches (alpha/beta/live), Playtest app.

---

## 7) Performance & Quality Gates

* **Audio**: XRuns < 1 per 10 minutes @ 128 samples/48kHz on reference rigs; gapless preset switching where feasible.
* **UI**: 60 FPS target on 1080p/1440p; frame hitches < 8ms p95 during graph edits.
* **IO**: Plugin scan < 60s cold; incremental scans < 5s.
* **Stability**: 24‑hour soak without leaks (Valgrind/ASAN/TSAN passes on debug builds).

---

## 8) Licensing & Compliance Workstream

* **Inventory**: Full SBOM of current deps (DawDreamer, JUCE, Electron, Python libs, DSP, fonts, icons).
* **Risk Areas**: GPLv3 (DawDreamer), any copyleft transitive deps, codec patents (MP3 optional), sample content licenses.
* **Options**:

  * **Dual‑license** DawDreamer (commercial license from maintainers), or
  * **Isolate via IPC** (standalone process + socket/OSC) as interim, or
  * **Replace** with JUCE host (and optional LV2/CLAP bridges) for a fully permissive stack.
* **Outputs**: Legal memo w/ recommendation; license notices; third‑party attributions; contribution policy.

---

## 9) Risks & Mitigations

* **Plugin Compatibility Gaps** → Maintain a vendor matrix; add per‑plugin shims; configurable sandbox.
* **UI Rewrite Cost** → Prioritize timeline/transport, meters, routing graph; defer cosmetic features.
* **Latency Regression** → Early performance spikes; strict audio‑thread discipline; lock‑free queues.
* **Schedule Creep** → Phase gates linked to spikes; hard cut on Nice‑to‑Haves.
* **GPL Exposure** → Decide license strategy before feature freeze; keep IPC boundary clean if isolating.

---

## 10) Deliverables for Review Cycle

1. Architecture Inventory Report (sections A–G)
2. Module One‑Pagers (table in §4)
3. Spike Results (code + benchmarks)
4. Licensing Memo & SBOM
5. Proposed Migration Plan (phased)
6. Steam Build Scripts & Dry‑run Artifacts

---

## 11) Phased Migration Plan (Indicative)

**Phase 0 – Discovery (2–3 weeks)**

* Complete inventory, SBOM, and spike backlog.

**Phase 1 – Core Engine (4–6 weeks)**

* JUCE plugin host parity, routing graph, audio/MIDI I/O.

**Phase 2 – UI Core (4–6 weeks)**

* Transport/timeline, meters, device prefs, preset manager.

**Phase 3 – Integrations (3–5 weeks)**

* OSC/MIDI mapping, Steamworks, agent/HTTP integrations.

**Phase 4 – Beta Hardening (3–4 weeks)**

* Perf tuning, crash telemetry, plugin matrix passes, DX fixes.

**Phase 5 – Release Prep (2 weeks)**

* Signing/notarization, Steam depots, store assets, docs.

---

## 12) Acceptance Criteria (Definition of Done)

* All success criteria in §1 met on Win/macOS/Linux reference machines.
* Plugin compatibility matrix ≥ 95% pass; documented workarounds.
* No known P0/P1 bugs; crash rate < 0.5% sessions in beta.
* Legal clearance complete; notices bundled; Steam review passed.

---

## 13) Archon Task Seeds (Project: 825d8fc1-b823-4703-90e3-8395b7820617)

### Coding Tasks

```json
[
  {
    "project_id": "825d8fc1-b823-4703-90e3-8395b7820617",
    "title": "Spike: JUCE VST3/AU host parity",
    "status": "todo",
    "feature": "Audio Host",
    "description": "Load top 20 plugins, exercise audio/MIDI I/O, automation, sidechain; record compatibility & perf.",
    "sources": []
  },
  {
    "project_id": "825d8fc1-b823-4703-90e3-8395b7820617",
    "title": "Prototype: AudioProcessorGraph routing + JSON serialization",
    "status": "todo",
    "feature": "Routing",
    "description": "Implement dynamic add/remove nodes, connections, save/load graph JSON without dropouts.",
    "sources": []
  },
  {
    "project_id": "825d8fc1-b823-4703-90e3-8395b7820617",
    "title": "JUCE UI: Transport/Timeline + automation lanes",
    "status": "todo",
    "feature": "UI",
    "description": "Native timeline with loop/markers; parameter lanes; hotkeys; performance ≥60 FPS.",
    "sources": []
  },
  {
    "project_id": "825d8fc1-b823-4703-90e3-8395b7820617",
    "title": "Integration: Steamworks (achievements + cloud saves)",
    "status": "todo",
    "feature": "Platform",
    "description": "Wire C++ Steamworks; design save schema for cross‑platform cloud sync.",
    "sources": []
  },
  {
    "project_id": "825d8fc1-b823-4703-90e3-8395b7820617",
    "title": "I/O: MIDI/OSC services in JUCE",
    "status": "todo",
    "feature": "Protocols",
    "description": "Replace WebMIDI/Node with JUCE MIDI + OSC; map ports, reconnect logic, MTC/clock options.",
    "sources": []
  }
]
```

### Non‑Coding Tasks

```json
[
  {
    "project_id": "825d8fc1-b823-4703-90e3-8395b7820617",
    "title": "SBOM + License Audit (GPL/Commercial path)",
    "status": "todo",
    "feature": "Legal",
    "description": "Inventory all deps; evaluate DawDreamer dual‑license vs IPC isolation vs replacement; legal memo.",
    "sources": []
  },
  {
    "project_id": "825d8fc1-b823-4703-90e3-8395b7820617",
    "title": "Plugin Vendor Matrix & Test Plan",
    "status": "todo",
    "feature": "QA",
    "description": "Select top 50 plugins; define automated load/parameter/preset/sidechain tests; keep results.",
    "sources": []
  },
  {
    "project_id": "825d8fc1-b823-4703-90e3-8395b7820617",
    "title": "Performance KPIs & Benchmarks",
    "status": "todo",
    "feature": "Perf",
    "description": "Define latency/CPU/FPS targets; set up CI perf runners; publish dashboards.",
    "sources": []
  },
  {
    "project_id": "825d8fc1-b823-4703-90e3-8395b7820617",
    "title": "Steam Distribution Plan",
    "status": "todo",
    "feature": "Platform",
    "description": "SteamPipe scripts, depot layout, signing/notarization checklist, Playtest schedule.",
    "sources": []
  },
  {
    "project_id": "825d8fc1-b823-4703-90e3-8395b7820617",
    "title": "UX Spec & Visual System for JUCE",
    "status": "todo",
    "feature": "Design",
    "description": "Translate current UI patterns (timeline, meters, routing) into JUCE components; style guide.",
    "sources": []
  }
]
```

---

## 14) Decision Log Template (for Team Use)

* **Topic:** (e.g., LV2 hosting approach)
* **Context:** Current behavior, constraints, user impact
* **Options Considered:** A / B / C (pros/cons)
* **Decision:** Chosen option + rationale
* **Follow‑ups:** Tasks, owners, due dates

---

## 15) Review & Next Steps

1. Run the **inventory** (Section 2) and populate the mapping table (Section 4).
2. Execute **spikes** (Section 5) in parallel; timebox each to 3–5 days.
3. Produce **SBOM & licensing memo** (Section 8) to lock the legal strategy early.
4. Finalize **phased plan** and start Phase 1 implementation.

---

*End of document.*
