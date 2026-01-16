# SwiftFrontendShared

Platform-agnostic UI components for White Room, supporting iOS, macOS, and tvOS with automatic platform adaptations.

## Overview

SwiftFrontendShared provides a comprehensive library of reusable UI components that automatically adapt their behavior and appearance to the current platform. Components are designed following Apple's Human Interface Guidelines for each platform while maintaining visual consistency across the White Room ecosystem.

## Architecture

```
SwiftFrontendShared/
├── Components/
│   ├── Cards/           # Card-based display components
│   ├── Pickers/         # Selection and input components
│   ├── Forms/           # Form and input components (TODO)
│   └── Feedback/        # User feedback components
├── Styles/              # Shared styling system
│   ├── Colors.swift
│   ├── Typography.swift
│   └── Spacing.swift
└── Utilities/           # Platform detection and utilities
    ├── PlatformExtensions.swift
    └── ViewModifiers.swift
```

## Platform Adaptations

### iOS
- Touch-optimized with minimum 44pt touch targets
- Haptic feedback on interactions
- Swipe gestures and long-press actions
- Adaptive layouts for iPhone (compact) and iPad (regular)

### macOS
- Mouse interaction with hover effects
- Keyboard shortcuts and accessibility
- Larger text for desktop viewing
- Context menus and sheet presentations

### tvOS
- Focus engine integration with visual feedback
- High contrast for 10-foot viewing
- Larger touch targets (80pt minimum)
- Siri Remote gesture support

## Components

### Cards

#### SongCard
Displays a song contract with intent, motion, harmony, and certainty indicators.

```swift
SongCard(
    song: songContract,
    isSelected: true,
    onTap: { /* Handle selection */ },
    onEdit: { /* Handle edit */ },
    onDelete: { /* Handle delete */ }
)
```

**Features:**
- Color-coded intent icons
- Visual certainty indicator
- Tag display
- Context menu for edit/delete
- Platform-appropriate interactions

#### PerformanceCard
Shows a performance with waveform visualization and quick stats.

```swift
PerformanceCard(
    performance: performanceState,
    isActive: true,
    onTap: { /* Handle selection */ },
    onEdit: { /* Handle edit */ },
    onDelete: { /* Handle delete */ }
)
```

**Features:**
- Gradient background based on arrangement style
- Pseudo-random waveform visualization
- Density and style indicators
- Active state highlighting
- Platform-specific gestures

#### TemplateCard
Presents a song contract template for quick start.

```swift
TemplateCard(
    template: .hboCue,
    isSelected: false,
    onApply: { /* Handle apply */ }
)
```

**Features:**
- Template icon and description
- Property preview badges
- Visual selection state
- One-tap/apply functionality

### Pickers

#### EnumPicker
Generic enum picker with platform-adaptive UI.

```swift
EnumPicker(
    selection: $selectedIntent,
    label: "Intent"
)
```

**Platform variations:**
- iOS: Wheel picker (compact) or segmented control (regular)
- macOS: Popup button picker
- tvOS: Focusable segmented control

#### SliderPicker
Value slider with labeled ticks and haptic feedback.

```swift
SliderPicker(
    value: $certainty,
    in: 0...1,
    label: "Certainty",
    tickMarks: [
        (0.0, "Certain"),
        (0.5, "Balanced"),
        (1.0, "Volatile")
    ]
)
```

**Features:**
- Continuous or discrete stepping
- Haptic feedback at tick marks (iOS)
- Keyboard support (macOS)
- Remote swipe support (tvOS)
- Visual fill and thumb

### Feedback

#### LoadingOverlay
Full-screen loading indicator with optional progress.

```swift
LoadingOverlay(
    isLoading: true,
    message: "Rendering audio...",
    progress: 0.65
)
```

**View modifier:**
```swift
myView.loadingOverlay(isLoading: true, message: "Loading...")
```

#### ErrorAlert
User-friendly error display with platform adaptations.

```swift
ErrorAlert(
    error: networkError,
    message: "Please check your connection",
    onDismiss: { /* Handle dismiss */ }
)
```

**View modifier:**
```swift
myView.errorAlert(error: error, message: "Custom message")
```

#### SuccessToast
Non-intrusive success notification.

```swift
SuccessToast(
    message: "Performance saved",
    icon: "checkmark.circle.fill",
    duration: 3.0
)
```

**View modifier:**
```swift
myView.successToast(message: "Success!")
```

## Styling System

### Colors
Semantic color palette with platform-specific adjustments.

```swift
// Brand colors
Color.brand        // Primary blue
Color.accent       // Accent purple
Color.success      // Green
Color.warning      // Orange
Color.error        // Red

// Semantic colors
Color.primaryBackground
Color.secondaryBackground
Color.tertiaryBackground
Color.primaryText
Color.secondaryText
Color.tertiaryText
```

### Typography
Platform-adaptive font system.

```swift
// Display fonts
Font.displayLarge    // Hero text
Font.displayMedium   // Section headers
Font.displaySmall    // Card titles

// Body fonts
Font.bodyLarge       // Primary content
Font.bodyMedium      // Secondary content
Font.bodySmall       // Tertiary content

// Label fonts
Font.labelLarge      // Button text
Font.labelMedium     // Secondary buttons
Font.labelSmall      // Captions, metadata
```

**Platform adjustments:**
- iOS: Standard system font sizes
- macOS: 1.2x larger for desktop
- tvOS: 1.5x larger for 10-foot viewing

### Spacing
Consistent spacing system with platform multipliers.

```swift
Spacing.xxSmall    // 2pt  - Tightest spacing
Spacing.xSmall     // 4pt  - Very tight
Spacing.small      // 8pt  - Tight
Spacing.medium     // 12pt - Standard
Spacing.large      // 16pt - Comfortable
Spacing.xLarge     // 24pt - Section
Spacing.xxLarge    // 32pt - Major section
```

**Platform adjustments:**
- iOS: 1.0x (baseline)
- macOS: 1.2x multiplier
- tvOS: 1.5x multiplier

**Touch targets:**
- iOS: 44pt minimum
- macOS: 20pt minimum
- tvOS: 80pt minimum

## Platform Utilities

### Platform Detection

```swift
Platform.current     // .iOS, .macOS, or .tvOS
Platform.isiOS       // Bool
Platform.ismacOS     // Bool
Platform.istvOS      // Bool
```

### Platform-Specific Modifiers

```swift
// Apply modifier on specific platform
myView
    .iOS { $0.padding(.small) }
    .macOS { $0.padding(.medium) }
    .tvOS { $0.padding(.large) }

// Platform gestures
myView.platformTapGesture { }
myView.platformLongPressGesture { }

// Platform interactions
myView.tvFocusable()           // Make focusable on tvOS
myView.macOSHover()            // Hover effect on macOS
```

## View Modifiers

### Card Modifier
```swift
myView.cardStyle(style: .primary, isCompact: false)
```

### Button Modifier
```swift
myView.buttonStyle(.primary, isCompact: false, isEnabled: true)
```

### Form Field Modifier
```swift
myView.formFieldStyle(isFocused: true, isInvalid: false)
```

### Loading Modifier
```swift
myView.loading(isLoading: true, message: "Loading...")
```

### Shake Modifier (for errors)
```swift
myView.shake(trigger: hasError)
```

### Pulse Modifier (for attention)
```swift
myView.pulse(isActive: true)
```

## Best Practices

### 1. Always Use Platform Adaptations
```swift
// Good
MyView()
    .iOS { $0.padding(.small) }
    .tvOS { $0.padding(.large) }

// Avoid
MyView().padding(.medium)  // Same on all platforms
```

### 2. Leverage Size Classes
```swift
@Environment(\.horizontalSizeClass) private var horizontalSizeClass

private var isCompact: Bool {
    horizontalSizeClass == .compact
}
```

### 3. Support Accessibility
```swift
myView
    .supportsDynamicType()
    .accessibilityLabel("Performance card")
    .accessibilityHint("Double tap to select")
```

### 4. Use Semantic Colors
```swift
// Good
Text("Error").foregroundColor(.error)

// Avoid
Text("Error").foregroundColor(.red)  // Hardcoded
```

### 5. Follow Spacing System
```swift
// Good
VStack(spacing: Spacing.medium) { }

// Avoid
VStack(spacing: 12) { }  // Magic number
```

## Implementation Status

### Completed ✅
- [x] Styling system (Colors, Typography, Spacing)
- [x] Platform utilities (PlatformExtensions, ViewModifiers)
- [x] Card components (SongCard, PerformanceCard, TemplateCard)
- [x] Picker components (EnumPicker, SliderPicker)
- [x] Feedback components (LoadingOverlay, ErrorAlert, SuccessToast)

### Planned 📋
- [ ] Form components (FormSection, FormRow, FormField)
- [ ] MultiSelectPicker
- [ ] FormVisualizer
- [ ] PerformanceStrip (migration from iOS-specific)

## Migration Guide

### From iOS-Specific Components

**Before:**
```swift
// iOS-only component in SwiftFrontendCore/UI/Components/
PerformanceStrip(
    performances: $performances,
    activePerformanceId: $activeId,
    onPerformanceSelected: { },
    onCreatePerformance: { },
    onDeletePerformance: { }
)
```

**After:**
```swift
// Shared component with platform adaptations
PerformanceStrip(
    performances: $performances,
    activePerformanceId: $activeId,
    onPerformanceSelected: { },
    onCreatePerformance: { },
    onDeletePerformance: { }
)
```

## Testing

Each component includes platform-specific previews:

```swift
#if DEBUG
struct MyComponent_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            MyComponent()
                .previewDevice("iPhone 14 Pro")
                .previewDisplayName("iOS")

            MyComponent()
                .previewDevice("Mac Pro")
                .previewDisplayName("macOS")

            MyComponent()
                .previewDevice("Apple TV")
                .previewDisplayName("tvOS")
        }
    }
}
#endif
```

## Contributing

When adding new components:

1. **Support all platforms** - Don't create iOS-only components
2. **Adapt interactions** - Touch, mouse, and remote
3. **Adjust sizing** - Platform-appropriate sizes
4. **Add previews** - Test on all three platforms
5. **Document adaptations** - Explain platform differences

## License

Copyright © 2026 White Room. All rights reserved.
