# White Room Page Inventory

This directory contains detailed documentation of all pages, screens, and views across all White Room platforms.

## Organization

```
platform-inventory/
├── README.md (this file)
├── shared/              # Pages available on all platforms
│   ├── surface-root-view.md
│   └── sweep-control.md
├── macos/               # macOS-exclusive pages
│   ├── orchestration-console.md
│   ├── analysis-dashboard.md
│   └── export-studio.md
├── tvos/                # tvOS-exclusive pages
│   ├── order-song-screen.md
│   └── form-visualizer.md
└── ios/                 # iOS-exclusive pages
    ├── performance-editor.md
    ├── console-x-mini.md
    └── instrument-preset-browser.md
```

## Page Inventory Summary

### Shared Pages (All Platforms)
- **SurfaceRootView** - Main 4-domain surface interface
- **SweepControlView** - Performance blending control

### macOS Pages
- **OrchestrationConsole** - Song orchestration dashboard
- **AnalysisDashboard** - Performance analytics
- **ExportStudio** - Multi-format export
- **SongOrchestrator** - Batch operations
- **TemplateManager** - Song templates
- **PerformanceMatrix** - Grid editor

### tvOS Pages
- **OrderSongScreenTV** - Song ordering interface
- **FormVisualizerTV** - Form visualization

### iOS Pages
- **PerformanceEditoriOS** - Touch-optimized editor
- **ConsoleXMini** - Compact console
- **InstrumentPresetBrowser** - Preset management

## Documentation Format

Each page document includes:
- **Purpose** - What the page does
- **File Location** - Where the code lives
- **Components** - What UI elements it contains
- **Platform Behavior** - How it differs per platform
- **Navigation** - How to access it
- **State Management** - What data it manages

## Quick Reference

See [APP_FLOW_AND_PAGE_INVENTORY.md](../APP_FLOW_AND_PAGE_INVENTORY.md) for complete app flow diagrams.
