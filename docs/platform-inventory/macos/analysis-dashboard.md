# AnalysisDashboard

**Status:** ✅ Complete - macOS Exclusive  
**Platform:** macOS (v14+)  
**Purpose:** Performance analytics and metrics visualization dashboard

## Overview

AnalysisDashboard provides **comprehensive analytics** for White Room performances, songs, and system usage. It presents real-time and historical data through interactive charts, graphs, and tables, enabling users to understand patterns, identify issues, and optimize their musical creations.

## File Location

```
swift_frontend/src/SwiftFrontendCore/Platform/macOS/Components/AnalysisDashboard.swift
```

## Key Components

### Main Interface
```
┌──────────────────────────────────────────────────────────────────────┐
│  📊 Analysis Dashboard                         [⌘W] [Refresh] [Export] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Time Range: [Last 24 Hours ▼]              [Custom Range...] │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐   │
│  │   Performance Metrics      │  │   System Health             │   │
│  │                             │  │                             │   │
│  │  ┌─────────────────────┐   │  │  ┌─────────────────────┐   │   │
│  │  │ Playback Frequency  │   │  │  │ CPU Usage          │   │   │
│  │  │ [Bar Chart]         │   │  │  │ [Line Chart]       │   │   │
│  │  └─────────────────────┘   │  │  └─────────────────────┘   │   │
│  │  ┌─────────────────────┐   │  │  ┌─────────────────────┐   │   │
│  │  │ Parameter Changes   │   │  │  │ Memory Usage        │   │   │
│  │  │ [Heatmap]           │   │  │  │ [Area Chart]       │   │   │
│  │  └─────────────────────┘   │  │  └─────────────────────┘   │   │
│  │  ┌─────────────────────┐   │  │  ┌─────────────────────┐   │   │
│  │  │ Popular Genres     │   │  │  │ Disk I/O           │   │   │
│  │  │ [Pie Chart]         │   │  │  │ [Histogram]        │   │   │
│  │  └─────────────────────┘   │  │  └─────────────────────┘   │   │
│  └─────────────────────────────┘  └─────────────────────────────┘   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Detailed Metrics Table                                            │
│  │  ┌──────┬─────────────┬─────────┬─────────┬─────────┐        │   │
│  │  │ Song │ Performance │ Plays   │ Avg Dur │ Edits   │        │   │
│  │  ├──────┼─────────────┼─────────┼─────────┼─────────┤        │   │
│  │  │ Sym5 │ Piano       │ 234     │ 4:32    │ 12      │        │   │
│  │  │ Techno│ Electronic  │ 567     │ 6:15    │ 8       │        │   │
│  │  └──────┴─────────────┴─────────┴─────────┴─────────┘        │   │
│  │                                     [Export CSV...]              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Insights & Recommendations                                       │   │
│  │  • Piano performances are 3x more popular than Synth           │   │
│  │  • Peak usage hours: 2-4 PM, 8-11 PM                          │   │
│  │  • Memory usage increased 15% after last update               │   │
│  │  [View All Insights...]                                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

## Sections

### 1. Performance Metrics

**Purpose:** Track performance usage patterns

**Playback Frequency Chart**
```
Bar Chart (Weekly)
├── X-Axis: Days of week
├── Y-Axis: Play count
├── Bars: Color-coded by genre
├── Hover: Show exact count
└── Click: Filter by day
```

**Parameter Changes Heatmap**
```
Heatmap (24h × Parameters)
├── X-Axis: Hours (0-23)
├── Y-Axis: Parameter names
├── Color: Change frequency (Blue → Red)
├── Hover: Parameter + hour + count
└── Click: Show detail view
```

**Popular Genres Pie Chart**
```
Pie Chart
├── Segments: Genres (Orchestral, Electronic, Jazz, etc.)
├── Percentage: Share of total
├── Explode slice: Click to separate
└── Legend: Color + genre + count
```

### 2. System Health

**Purpose:** Monitor system resource usage

**CPU Usage Line Chart**
```
Line Chart (Real-time)
├── X-Axis: Time (last 60 minutes)
├── Y-Axis: CPU % (0-100)
├── Lines: By component (Engine, UI, Audio)
├── Hover: Exact value + timestamp
└── Alert: > 80% (red)
```

**Memory Usage Area Chart**
```
Area Chart (Cumulative)
├── X-Axis: Time (last 24 hours)
├── Y-Axis: Memory MB (0-512)
├── Layers: By allocation (Audio, Cache, UI)
├── Hover: Breakdown by component
└── Alert: > 400MB (yellow)
```

**Disk I/O Histogram**
```
Histogram (Distribution)
├── X-Axis: I/O operations per second
├── Y-Axis: Frequency
├── Bars: Read vs Write (color-coded)
├── Overlay: Average line
└── Hover: Percentile information
```

### 3. Detailed Metrics Table

**Purpose:** Tabular data with sorting and filtering

**Columns**
```
┌──────────────┬─────────────────┬───────────┬───────────┬───────────┐
│ Song         │ Performance     │ Plays      │ Avg Dur    │ Edits     │
├──────────────┼─────────────────┼───────────┼───────────┼───────────┤
│ Sortable     │ Sortable         │ Sortable   │ Sortable   │ Sortable   │
│ Filterable   │ Filterable       │ Filterable │ Filterable │ Filterable │
│ Exportable   │ Exportable       │ Exportable │ Exportable │ Exportable │
└──────────────┴─────────────────┴───────────┴───────────┴───────────┘
```

**Features:**
- **Column Sorting:** Click header to sort
- **Multi-Sort:** ⌘+Click for secondary sort
- **Filtering:** Text filter per column
- **Export:** CSV, JSON, XML formats
- **Row Actions:** Double-click to view details

### 4. Insights & Recommendations

**Purpose:** AI-powered analysis and suggestions

**Insight Cards**
```
┌─────────────────────────────────────┐
│ 💡 Popular Performance Trend        │
│                                    │
│ Piano performances are 3x more    │
│ popular than Synth this week.     │
│                                    │
│ [View Details] [Dismiss]           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⚠️ Memory Usage Warning              │
│                                    │
│ Memory usage increased 15% after   │
│ last update. Consider clearing     │
│ cache.                             │
│                                    │
│ [Clear Cache] [Optimize] [Dismiss]  │
└─────────────────────────────────────┘
```

**Recommendation Types**
- **Trends:** Usage patterns over time
- **Anomalies:** Unusual behavior detected
- **Optimizations:** Performance improvements
- **Alerts:** System health warnings

## State Management

```swift
@StateObject private var analytics: AnalyticsManager
@StateObject private var chartData: ChartDataProvider
@StateObject private var insights: InsightEngine

@State private var timeRange: TimeRange = .last24Hours
@State private var selectedMetric: Metric = .playbackCount
@State private var isLoading: Bool = false
```

### State Objects

1. **analytics** - Analytics data collection
2. **chartData** - Chart rendering data
3. **insights** - AI-powered insights

### Time Range Options
- **Last Hour:** Real-time monitoring
- **Last 24 Hours:** Daily view
- **Last 7 Days:** Weekly view
- **Last 30 Days:** Monthly view
- **Custom:** Date range picker

## Keyboard Shortcuts

### Navigation
- **⌘1** - Performance Metrics
- **⌘2** - System Health
- **⌘3** - Detailed Table
- **⌘4** - Insights
- **⌘`** - Cycle sections

### Data Operations
- **⌘R** - Refresh all data
- **⌘E** - Export data
- **⌘F** - Filter data
- **⌘⇧F** - Advanced filter
- **⌘.** - Stop refresh

### Chart Interactions
- **⌘+Click** - Zoom in
- **⌘-Click** - Zoom out
- **⌘0** - Reset zoom
- **⌘P** - Print chart

## Chart Interactions

### Common Patterns

**Hover**
- Show tooltip with exact value
- Highlight data point
- Show timestamp

**Click**
- Filter by clicked item
- Drill down to detail
- Select data series

**Right-Click**
- Context menu
- Export chart
- Configure options

**Drag**
- Pan chart (time range)
- Zoom in/out
- Select time range

### Chart Types

**Line Chart**
- Real-time data
- Time series
- Multiple series
- Area fills

**Bar Chart**
- Categorical data
- Comparison
- Grouped bars
- Stacked bars

**Heatmap**
- 2D density
- Color intensity
- Gradient legend
- Cell hover

**Pie Chart**
- Part-to-whole
- Percentages
- Exploded slices
- Legend toggle

## Data Flow

### Data Collection Flow
```
User interactions
    ↓
JUCE Engine logs events
    ↓
analytics.track(event)
    ↓
Local storage (CoreData)
    ↓
chartData.processData()
    ↓
UI updates (60 FPS)
```

### Refresh Flow
```
User presses ⌘R or auto-refresh
    ↓
analytics.refreshAll()
    ↓
Fetch new data from engine
    ↓
Update chart data
    ↓
insights.analyze()
    ↓
Generate recommendations
    ↓
Update UI
```

## Integration Points

### Opens From
- **OrchestrationConsole** - Analytics button
- **MainMenu** - Window → Analysis Dashboard
- **Keyboard Shortcut** - ⌘⇧A

### Opens To
- **Detailed Metric View** - Click on chart/data point
- **Export Dialog** - Export data
- **Settings** - Dashboard configuration

### Related Components
- **PerformanceMatrix** - Performance editing
- **SongOrchestrator** - Song management
- **ExportStudio** - Export configuration

## Performance Characteristics

### Metrics
- **Refresh Rate:** Every 30 seconds (auto)
- **Chart Rendering:** < 100ms per chart
- **Data Processing:** < 500ms for 24h data
- **Memory Usage:** ~250 MB (with cached data)
- **Frame Rate:** 60 FPS during animations

### Optimization
- **Lazy Loading:** Charts load on scroll
- **Data Sampling:** Downsample for large time ranges
- **Caching:** Cache chart data for 5 minutes
- **Incremental Updates:** Update new data points only

## Data Export

### Export Formats

**CSV**
```
Song,Performance,Plays,Avg Duration,Edits
Symphony No. 5,Piano,234,4:32,12
Techno Set,Electronic,567,6:15,8
```

**JSON**
```json
{
  "metrics": [
    {
      "song": "Symphony No. 5",
      "performance": "Piano",
      "plays": 234,
      "avgDuration": "4:32",
      "edits": 12
    }
  ]
}
```

**PDF**
- Formatted report
- Charts included
- Insights section
- Custom branding

## AI Insights

### Insight Types

**Trend Detection**
- Moving averages
- Seasonal patterns
- Growth rates
- Correlations

**Anomaly Detection**
- Statistical outliers
- Unusual patterns
- Spike detection
- Deviation alerts

**Predictive Analytics**
- Usage forecasting
- Resource planning
- Capacity predictions
- Trend extrapolation

### Algorithm
- **Machine Learning:** Clustering, regression
- **Statistical Analysis:** Mean, median, std dev
- **Pattern Recognition:** Time series analysis
- **Thresholds:** Configurable alert levels

## Accessibility

### VoiceOver
- Chart descriptions
- Data point announcements
- Table navigation
- Progress updates

### Keyboard Navigation
- Full keyboard control
- Tab order: Charts → Table → Insights
- Arrow keys: Navigate within charts
- Space/Enter: Drill down

### Visual
- High contrast mode
- Color blind friendly palettes
- Customizable chart colors
- Font size adjustment

## Error Handling

### Data Errors
- **Missing Data:** Show gap in chart
- **Invalid Data:** Exclude from calculation
- **Corrupt Data:** Show warning, exclude

### Refresh Errors
- **Network Timeout:** Use cached data
- **Engine Unavailable:** Show offline mode
- **Permission Denied:** Show error, request access

## Persistence

### Auto-Save
- Dashboard configuration saved immediately
- Chart preferences saved on change
- Time range preference saved
- Custom insights saved

### Data Retention
- **Raw Data:** 30 days
- **Aggregated Data:** 1 year
- **Insights:** 90 days
- **Exported Data:** User-controlled

## Future Enhancements

- [ ] Real-time collaboration (shared dashboard)
- [ ] Custom chart builder
- [ ] Scheduled reports (email)
- [ ] Anomaly alerts (push notifications)
- [ ] Predictive analytics (forecasting)
- [ ] Comparison views (before/after)
- [ ] Goal tracking (targets vs actual)
- [ ] Multi-tenant support (team dashboards)
- [ ] Integration with external analytics (Google Analytics)
- [ ] Natural language queries ("show me last week")

## Related Components

- **OrchestrationConsole** - Parent container
- **ExportStudio** - Data export
- **PerformanceMatrix** - Performance data source
- **JUCE Engine** - Analytics data provider
