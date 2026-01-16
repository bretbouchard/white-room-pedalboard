# White Room App Flow & Page Inventory

**Generated:** January 15, 2026
**Status:** Complete platform app flow reference

---

## Executive Summary

This document provides a **complete inventory of all pages, screens, and navigation flows** across all White Room platforms. It serves as the **authoritative reference** for:

- ✅ What pages exist on each platform
- ✅ Navigation architecture and entry points
- ✅ Feature depth per platform
- ✅ Build-level vs runtime platform detection
- ✅ App flow diagrams

**Key Insight:** White Room uses **runtime platform detection** (`#if os()` conditional compilation) rather than separate build targets.

---

## Platform Entry Points

### macOS Entry Point
**File:** `swift_frontend/src/WhiteRoomiOS/App.swift`

**Flow:** WhiteRoomiOSApp → MainTabView → SchillingerView → SurfaceRootView

### iOS Entry Point
**File:** `swift_frontend/WhiteRoomiOS/WhiteRoomiOS/WhiteRoomiOSApp.swift`

**Flow:** WhiteRoomiOSApp → App → MainTabView → SchillingerView → SurfaceRootView

### iPad Entry Point
**File:** `swift_frontend/WhiteRoomiOS/WhiteRoomiOS/WhiteRoomiOSApp.swift`

**Flow:** WhiteRoomiOSApp → App → MainTabView → SchillingerView → SurfaceRootView
**Note:** iPad uses the same iOS app entry point with runtime detection for iPad-specific layouts

**Runtime Detection:**
```swift
if UIDevice.current.userInterfaceIdiom == .pad {
    // iPad-specific layouts and features
} else {
    // iPhone-specific layouts
}
```

### tvOS Entry Point
**File:** `swift_frontend/tvOS/SchillingerTV/SchillingerTVApp.swift`

**Flow:** SchillingerTVApp → OrderSongScreenTV → FormVisualizerTV

---

## Complete Page Inventory

### macOS Pages (13 Total)

| # | Page | Status | Purpose |
|---|------|--------|---------|
| 1 | SurfaceRootView | ✅ Complete | Main 4-domain surface |
| 2 | OrchestrationConsole | ✅ Complete | Song orchestration dashboard |
| 3 | AnalysisDashboard | ✅ Complete | Performance analytics |
| 4 | ExportStudio | ✅ Complete | Multi-format export |
| 5 | SongOrchestrator | ✅ Complete | Batch song operations |
| 6 | TemplateManager | ✅ Complete | Song templates |
| 7 | PerformanceMatrix | ✅ Complete | Grid performance editor |
| 8 | SchillingerParameterView | ✅ Complete | Parameter editing |
| 9 | TimelineTabView | ✅ Complete | Section list |
| 10 | EnsembleTabView | ✅ Complete | Voice list |
| 11 | BooksTabView | ✅ Complete | Song books |
| 12 | PerformanceEditoriOS | ✅ Complete | Performance editing |
| 13 | ConsoleXMini | ✅ Complete | Compact console |

### tvOS Pages (2 Total)

| # | Page | Status | Purpose |
|---|------|--------|---------|
| 1 | OrderSongScreenTV | ✅ Complete | Song ordering interface |
| 2 | FormVisualizerTV | ✅ Complete | Form visualization |

### iOS Pages (4 Total)

| # | Page | Status | Purpose |
|---|------|--------|---------|
| 1 | SurfaceRootView | ✅ Complete | Main 4-domain surface |
| 2 | PerformanceEditoriOS | ✅ Complete | Touch-optimized editor |
| 3 | ConsoleXMini | ✅ Complete | Compact console |
| 4 | InstrumentPresetBrowser | ✅ Complete | Preset management |

### iPad Pages (4 Total + iPad-Specific Layouts)

**Note:** iPad shares the iOS build target but requires iPad-specific layouts for optimal user experience.

| # | Page | Status | Purpose | iPad Layout |
|---|------|--------|---------|-------------|
| 1 | SurfaceRootView | ✅ Complete | Main 4-domain surface | Split view compatible |
| 2 | PerformanceEditoriOS | ✅ Complete | Touch-optimized editor | Landscape-optimized |
| 3 | ConsoleXMini | ✅ Complete | Compact console | Full-width layout |
| 4 | InstrumentPresetBrowser | ✅ Complete | Preset management | Grid view (2 columns) |

#### iPad-Specific Considerations

**UI Adaptations:**
- **Split View**: SurfaceRootView supports 1/3, 1/2, and 2/3 split view
- **Slide Over**: Compact mode for ConsoleXMini
- **Landscape Priority**: Primary orientation is landscape
- **Touch Targets**: 44pt minimum (same as iPhone)
- **Layout Flexibility**: Size classes adapted for iPad (regular width/height)

**iPad-Only Features:**
- **Enhanced Modulation Matrix**: 12x12 grid (vs 8x8 on iPhone)
- **Multi-Window Support**: Multiple SurfaceRootView instances
- **Apple Pencil Support**: For precise parameter control
- **Drag & Drop**: Between instruments and presets

**Build Configuration:**
- **Target**: Shared iOS target (WhiteRoomiOS)
- **Device Support**: iPhone + iPad (Universal)
- **Runtime Detection**: `UIDevice.current.userInterfaceIdiom == .pad`
- **Minimum iOS**: iOS 17.0+

**File Locations:**
```
swift_frontend/src/SwiftFrontendCore/Platform/iOS/
├── iPad/
│   ├── iPadLayoutAdapters.swift
│   ├── SplitViewSupport.swift
│   └── MultiWindowManager.swift
└── Components/
    ├── EnhancedModulationMatrixiPad.swift (12x12)
    └── InstrumentPresetBrowser.swift (adaptive grid)
```

**Development Priority:**
1. ✅ Basic iPad support (inherited from iOS)
2. 🚧 Layout adaptations for iPad screen sizes
3. 📋 Split view optimization
4. 📋 iPad-specific features (enhanced modulation matrix)

### Raspberry Pi Pages (0 Total - Planned)

Uses shared SurfaceRootView with performance optimizations.

### Web Pages (0 Total - Not Started)

No implementation. See PLATFORM_CAPABILITIES_MATRIX.md for details.

---

## SurfaceRootView - The Universal Core

**File:** `swift_frontend/src/SwiftFrontendCore/Surface/SurfaceRootView.swift` (2,515 lines)

**Structure:**
```
SurfaceRootView
├── StructureDomainView (25%, expands to 55%)
│   ├── TimelineView (60%)
│   └── SectionListView (40%)
├── ToolsDomainView (25%, expands to 55%)
│   ├── Tool Grid (3x3)
│   └── Undo/Redo Controls
├── PatternsDomainView (25%, expands to 55%)
│   ├── RhythmicPatternEditor
│   └── MelodicPatternEditor
├── ModulationDomainView (25%, expands to 55%)
│   └── ModulationMatrixView
└── RolesRegionView (22-28%, compresses to 16%)
    └── RoleCard (4 cards)
```

**Platform Behavior:**
- **macOS**: Keyboard arrows, ⌘ shortcuts, hover effects
- **tvOS**: Siri Remote focus, 92pt touch targets
- **iOS**: Touch gestures, 44pt targets, haptic feedback
- **Raspberry Pi**: Performance profiles, lightweight rendering

---

## Feature Depth by Platform

### Core Features (All Platforms)

| Feature | macOS | tvOS | iOS | iPad | Raspberry Pi |
|---------|-------|------|-----|------|--------------|
| Structure Domain | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ⚠️ Planned |
| Timeline View | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ⚠️ Planned |
| Playhead (60 FPS) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ 30-60 FPS |
| Tools Domain | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ⚠️ Planned |
| Patterns Domain | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ⚠️ Planned |
| Modulation Matrix | ✅ 8x8 | ✅ 8x8 | ✅ 8x8 | ✅ 12x12* | ⚠️ Planned |
| Roles Region | ✅ 4 roles | ✅ 4 roles | ✅ 4 roles | ✅ 4 roles | ⚠️ Planned |

\* iPad supports enhanced 12x12 modulation matrix

### Platform-Specific Features

| Feature | macOS | tvOS | iOS | iPad | Raspberry Pi |
|---------|-------|------|-----|------|--------------|
| Keyboard Shortcuts | ✅ Full | ❌ N/A | ❌ N/A | ⚠️ External | ⚠️ USB keyboard |
| Focus Engine | ⚠️ Tab | ✅ Native | ⚠️ Limited | ⚠️ Limited | ⚠️ Possible |
| Haptic Feedback | ❌ N/A | ❌ N/A | ✅ Full | ✅ Full | ❌ N/A |
| Hover Effects | ✅ Full | ❌ N/A | ❌ N/A | ⚠️ Cursor | ⚠️ Mouse |
| Tooltips | ✅ Full | ❌ N/A | ❌ N/A | ⚠️ Touch | ⚠️ Mouse |
| Siri Integration | ⚠️ Dictation | ✅ Full | ⚠️ Dictation | ⚠️ Dictation | ❌ No |
| Performance Profiles | ❌ N/A | ❌ N/A | ❌ N/A | ❌ N/A | ✅ Full |
| Split View | ❌ N/A | ❌ N/A | ❌ N/A | ✅ 1/3, 1/2, 2/3 | ❌ N/A |
| Multi-Window | ❌ N/A | ❌ N/A | ❌ N/A | ✅ Yes | ❌ N/A |
| Apple Pencil | ❌ N/A | ❌ N/A | ❌ N/A | ✅ Yes | ❌ N/A |

---

## Page Count Summary

| Platform | Total Pages | Core Pages | Exclusive Pages | Modal Pages |
|----------|-------------|------------|-----------------|-------------|
| **macOS** | 13 | 3 | 6 | 6 |
| **tvOS** | 2 | 1 | 1 | 0 |
| **iOS** | 4 | 3 | 3 | 3 |
| **iPad** | 4* | 3 | 1 | 3 |
| **Raspberry Pi** | 0** | 0** | 0 | 0** |
| **Web** | 0*** | 0*** | 0 | 0*** |

\* Shares iOS target with iPad-specific layouts
\** Uses shared SurfaceRootView
\*** Not started

---

## File Locations Reference

### macOS-Specific Files
```
swift_frontend/src/SwiftFrontendCore/Platform/macOS/
├── macOSOptimizations.swift (700+ lines)
├── Components/
│   ├── AnalysisDashboard.swift
│   ├── ExportStudio.swift
│   ├── PerformanceMatrix.swift
│   ├── SongOrchestrator.swift
│   └── TemplateManager.swift
└── Screens/
    └── OrchestrationConsole.swift
```

### tvOS-Specific Files
```
swift_frontend/src/SwiftFrontendCore/Platform/tvOS/
├── tvOSOptimizations.swift (550+ lines)
├── Components/
│   └── FormVisualizerTV.swift
└── Screens/
    └── OrderSongScreenTV.swift
```

### iOS-Specific Files
```
swift_frontend/src/SwiftFrontendCore/Platform/iOS/
├── iOSOptimizations.swift (620+ lines)
├── Components/
│   ├── ConsoleXMini.swift
│   ├── HapticDensitySlider.swift
│   └── InstrumentPresetBrowser.swift
└── Screens/
    └── PerformanceEditoriOS.swift
```

### Shared Files (All Platforms)
```
swift_frontend/src/SwiftFrontendCore/
├── Surface/
│   └── SurfaceRootView.swift (2,515 lines)
└── SongDesignEditor/
    ├── Navigation/
    │   ├── TimelineTabView.swift (216 lines)
    │   ├── EnsembleTabView.swift (243 lines)
    │   └── BooksTabView.swift
    └── Transport/
        ├── TimelineView.swift
        └── PlayheadView.swift
```

---

**Document Status:** ✅ Complete  
**Last Updated:** January 15, 2026
