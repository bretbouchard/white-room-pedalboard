# DAW UI Structure Overview

This document summarizes the current HTML structure and supporting data model behind the DAW experience in the frontend application. It is intended as reference material for designers and engineers revisiting the layout.

## Top-Level Shell

- `div` (Flex column, full height)
  - `AuthBar` (top navigation and account controls)
  - `DAWLayout`
    - `MenuBar` (application menu)
    - `div` (flex container used by `DockingSystem`)
      - Panels are rendered in resizable containers (`ResizablePanel`). The default layout declares three primary panels:
        - **Browser Panel** (left): placeholder “Browser Component” content.
        - **Track View Panel** (center): hosts the sequencer/arrangement view.
        - **Mixer Panel** (right): hosts the channel strip view.
    - `WorkspacePresets` (preset selector footer)
    - `KeyboardShortcuts` (toggleable shortcuts helper)
    - Children passed into `DAWLayout` (from `App`) render after the layout chrome:
      - `NavigationControls` (transport, timeline, zoom, grid controls)
      - `div` containing the main dashboard/summary cards (currently “Workspace Overview” only).

## Track View Panel

Rendered by `TrackViewContainer`:

- `div` (toolbar)
  - `SelectionTools` (cut/copy/paste, split, trim buttons, selection status)
  - Grid / snap controls (checkbox, select, zoom buttons)
- `div` (track view wrapper)
  - `TrackView`
    - Sticky `Timeline` header (canvas timeline)
    - Scrollable body with one absolutely positioned row per track
      - Each row renders a `TrackLane`
        - Track label overlay
        - Audio regions (`div` blocks with draggable handles)
        - MIDI regions (same container with note stubs)
        - Drop-zone overlay for drag interactions
    - Grid line overlays (if snap enabled)
    - Playhead indicator (`div`)
    - Selection marquee (`div` when dragging)
    - Status bar footer (number of tracks, regions, duration, zoom, grid)

### TrackLane internals

- Regions are absolutely positioned `div` elements representing start time and duration. Each region contains:
  - Title strip (`div`)
  - Resize handles (`div` per edge)
  - Optional waveform canvas (for audio regions)
  - Optional MIDI note stubs (`div` per note)

## Mixer Panel

`MixingConsole` renders the following structure:

- `div` (scrollable flex row)
  - Repeated `ChannelStrip` components (one per track)
    - Transport/pan/mute/solo buttons
    - Meter display (`LevelMeter` component)
    - Send/FX controls (`Knob`, `Slider`, buttons)
  - Vertical divider
  - `MasterSection` (master volume, optional EQ/limiter, spectrum display)
  - “Add Track” button cluster

### Specialized UI Elements

Reusable UI components embedded across the DAW include:

- `Knob` (rotary control for gain/pan/FX send)
- `Slider` (horizontal parameter control)
- `LevelMeter` (peak/RMS/LUFS visualizer)
- `Waveform` (canvas-based waveform preview)
- `SpectrumAnalyzer` (frequency magnitude plot)
- `NavigationControls` (timeline slider, zoom buttons, grid selector)
- `DAIDTracker` (provenance/telemetry widget; currently used in the dashboard area)

## Browser Panel

The default layout allocates a left panel titled “Browser.” At present it contains placeholder content (`div` with text), but the panel container is wired for the same resizable behaviour as the other panels. It is ready to host asset/library UI in future iterations.

## Layout & Resizing Behaviour

- `DockingSystem` distributes panels by position (left/right/top/bottom/center). Each panel is wrapped in a `ResizablePanel`.
- `ResizablePanel` stores its size as a percentage of the viewport (`defaultSize`, `minSize`, `maxSize`). Horizontal panels calculate width based on available window width; vertical panels use window height.
- The center panel is marked with `position: 'center'` and set to flex-grow, so Track View occupies remaining space after left/right panels claim their percentages.
- Resize handles on panel edges update the stored size and trigger re-rendering.

## Data Model Driving the UI

All DAW panels consume state from the `useAudioStore` Zustand store (`frontend/src/stores/audioStore.ts`):

- **Tracks**:
  - Properties: `id`, `name`, `type` (`audio` | `midi` | `instrument`), `height`, `muted`, `solo`, `armed`, `color`, plugin state, automation settings.
  - Regions: `audioRegions` and `midiRegions` arrays per track. Each region has `startTime`, `duration`, and metadata (name, waveform data, fades, notes).
- **Transport**: play/stop/record state, current time, tempo, loop range.
- **Mixer**: master volume, selected track, per-track mixer controls, effect sends.
- **Analysis**: level meters (peak/RMS/LUFS), spectrum data.

`TrackViewContainer` normalizes legacy track data and seeds demo content via `initializeSampleData()` the first time the store is empty. That sample data creates the drums/bass/piano tracks and placeholder regions you see in the default view.

### DawDreamer Integration Surface

The frontend currently mocks DawDreamer behaviour: regions, mixer controls, and analysis panels display data from `useAudioStore`. Real engine interactions will come through:

- Backend endpoints (`/api/audio-agent/...`) for DawDreamer command execution.
- WebSocket channel (via `useWebSocketStore`) for real-time transport and analysis updates.
- Future UI hooks reference the DawDreamer schemas added under `backend/src/audio_agent/schemas` and exposed via the control API tasks (P1_T1.x).

This document should guide refactors of the DAW layout while keeping alignment with the true data structures that the UI expects. If additional engine metadata becomes available (e.g., processor graphs, plugin parameter snapshots), we should extend `useAudioStore` and reference it here so designers have an up-to-date map of the underlying model.
