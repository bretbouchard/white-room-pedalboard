# White Room Page Inventory - Complete Index

**Last Updated:** January 15, 2026

## Quick Reference

### All Platforms (Shared)
- [SurfaceRootView](shared/surface-root-view.md) - Main 4-domain surface interface
- [SweepControlView](shared/sweep-control.md) - Performance blending control

### macOS (6 Pages)
- [macOS Overview](macos/README.md) - Platform summary
- OrchestrationConsole - Song orchestration dashboard
- AnalysisDashboard - Performance analytics
- ExportStudio - Multi-format export
- SongOrchestrator - Batch operations
- TemplateManager - Song templates
- PerformanceMatrix - Grid editor

### tvOS (2 Pages)
- [tvOS Overview](tvos/README.md) - Platform summary
- OrderSongScreenTV - Song ordering interface
- FormVisualizerTV - Form visualization

### iOS (4 Pages)
- [iOS Overview](ios/README.md) - Platform summary
- PerformanceEditoriOS - Touch-optimized editor
- ConsoleXMini - Compact console
- InstrumentPresetBrowser - Preset management

## Page Count Summary

| Platform | Total | Core | Exclusive | Modals |
|----------|-------|------|-----------|--------|
| **macOS** | 13 | 2 | 6 | 6 |
| **tvOS** | 2 | 1 | 1 | 0 |
| **iOS** | 4 | 2 | 3 | 3 |

## By Feature Type

### Audio/Engine Pages
- SurfaceRootView - Main interface
- PerformanceEditoriOS - Performance editing

### Analytics/Data Pages
- AnalysisDashboard - Performance metrics
- PerformanceMatrix - Grid editing

### Workflow/Management Pages
- OrchestrationConsole - Song orchestration
- SongOrchestrator - Batch operations
- TemplateManager - Templates

### Export/Output Pages
- ExportStudio - Multi-format export

### Browsing/Selection Pages
- OrderSongScreenTV - Song selection
- FormVisualizerTV - Form visualization
- InstrumentPresetBrowser - Preset browsing

### Utility/Tools Pages
- ConsoleXMini - Compact console
- SweepControlView - Blend control

## By Complexity

### Simple Pages (< 200 lines)
- SweepControlView
- ConsoleXMini
- FormVisualizerTV

### Medium Pages (200-500 lines)
- PerformanceEditoriOS
- InstrumentPresetBrowser
- OrderSongScreenTV

### Complex Pages (> 500 lines)
- SurfaceRootView (2,515 lines)
- OrchestrationConsole
- AnalysisDashboard
- ExportStudio
- SongOrchestrator
- TemplateManager
- PerformanceMatrix

## Navigation Map

### macOS Navigation Flow
```
App Launch
    ↓
SurfaceRootView (Root)
    ├─→ OrchestrationConsole (Modal)
    │   ├─→ AnalysisDashboard (Modal)
    │   ├─→ ExportStudio (Modal)
    │   ├─→ SongOrchestrator (Modal)
    │   ├─→ TemplateManager (Modal)
    │   └─→ PerformanceMatrix (Modal)
    └─→ PerformanceEditoriOS (Modal)
```

### tvOS Navigation Flow
```
App Launch
    ↓
OrderSongScreenTV (Root)
    └─→ FormVisualizerTV (Inline)
```

### iOS Navigation Flow
```
App Launch
    ↓
SurfaceRootView (Root)
    ├─→ PerformanceEditoriOS (Modal)
    ├─→ ConsoleXMini (Modal)
    └─→ InstrumentPresetBrowser (Modal)
```

## Documentation Standards

Each page document includes:
- ✅ Purpose and description
- ✅ File location
- ✅ Component breakdown
- ✅ Platform behavior differences
- ✅ Navigation paths
- ✅ State management
- ✅ Accessibility features
- ✅ Performance characteristics
- ✅ Future enhancements

## Contribution Guidelines

When adding new pages:

1. Create documentation in appropriate platform folder
2. Follow the template structure
3. Include all required sections
4. Update this INDEX
5. Update page counts

## Related Documentation

- [APP_FLOW_AND_PAGE_INVENTORY.md](../APP_FLOW_AND_PAGE_INVENTORY.md) - Complete app flow
- [PLATFORM_CAPABILITIES_MATRIX.md](../PLATFORM_CAPABILITIES_MATRIX.md) - Platform capabilities
