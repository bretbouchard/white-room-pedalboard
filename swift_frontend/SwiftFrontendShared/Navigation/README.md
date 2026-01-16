# White Room Cross-Platform Navigation System

## Overview

The White Room navigation system provides a unified, platform-adaptive navigation structure that ensures all features are accessible on iOS, macOS, and tvOS while following each platform's Human Interface Guidelines.

## Architecture

### Core Components

1. **NavigationDestination** - Enum defining all possible destinations
2. **NavigationManager** - Centralized navigation state and logic
3. **Platform-Specific Views** - iOS, macOS, and tvOS navigation implementations
4. **WhiteRoomApp** - Unified app entry point

### Design Philosophy

- **Feature Parity**: All features accessible on all platforms
- **Platform Optimization**: Primary flow optimized for each platform
- **Deep Linking**: URL scheme for cross-platform navigation
- **SLC Compliant**: Simple, Lovable, Complete user experience

## Platform Matrix

| Feature          | iOS          | macOS        | tvOS         |
|------------------|--------------|--------------|--------------|
| Song Library     | Secondary    | **Primary**  | **Primary**  |
| Order Song       | Secondary    | Secondary    | **Primary**  |
| Performance Strip| **Primary**  | Secondary    | Secondary    |
| Performance Ed.  | **Primary**  | Secondary    | Secondary    |
| Orchestration    | Secondary    | **Primary**  | Secondary    |
| Settings         | Secondary    | Secondary    | Secondary    |

**Legend:**
- **Primary**: Main flow, always visible
- Secondary: Accessible via tabs, menu, or panels

## File Structure

```
swift_frontend/
├── SwiftFrontendShared/
│   └── Navigation/
│       ├── NavigationDestination.swift    # Route definitions
│       ├── NavigationManager.swift        # Navigation logic
│       ├── PlatformNavigationiOS.swift    # iOS implementation
│       ├── PlatformNavigationMac.swift    # macOS implementation
│       ├── PlatformNavigationTV.swift     # tvOS implementation
│       ├── WhiteRoomApp.swift             # Unified app entry
│       └── README.md                       # This file
├── WhiteRoomiOS/
│   └── Package.swift                       # Swift Package config
└── WhiteRoomMac/                           # (to be created)
```

## Navigation Destinations

### Available Destinations

```swift
enum NavigationDestination {
    case songLibrary                   // Browse all songs
    case performanceStrip              // Select/switch performances
    case orderSong(contractId: String?) // Create/edit contract
    case performanceEditor(performanceId: String) // Edit performance
    case orchestrationConsole          // macOS mixer console
    case settings                      // App settings
    case deepLink(url: URL)           // External deep link
}
```

### Destination Properties

Each destination provides:
- `title`: Display name
- `iconName`: SF Symbol name
- `path`: URL path for deep linking
- `isPrimary(for:)`: Platform-specific priority

## Platform-Specific Behavior

### iOS (Touch-Optimized)

**Navigation Structure:**
- Tab bar for main sections
- NavigationStack for hierarchical navigation
- Sheet presentation for editors
- Swipe back gesture support

**Primary Flow:**
1. Performance Strip (main tab)
2. Performance Editor (in-stack)

**Secondary Access:**
- Song Library (tab)
- Order Song (tab/sheet)
- Orchestration (tab/sheet)
- Settings (sheet)

**Code Example:**
```swift
NavigationStack(path: $navigationManager.path) {
    PerformanceStripView()
        .navigationDestination(for: NavigationDestination.self) { destination in
            destinationView(for: destination)
        }
}
.tabItem {
    Label("Performances", systemImage: "slider.horizontal.3")
}
```

### macOS (Window-Based)

**Navigation Structure:**
- Sidebar for main navigation
- Window groups for multiple documents
- Menu bar integration
- Keyboard shortcuts

**Primary Flow:**
1. Song Library (sidebar)
2. Orchestration Console (sidebar/window)

**Secondary Access:**
- Order Song (new window)
- Performance Editor (new window)
- Performance Strip (sidebar)
- Settings (window)

**Code Example:**
```swift
NavigationSplitView {
    List(selection: $selectedSidebarItem) {
        Label("Song Library", systemImage: "music.note.list")
            .tag(NavigationDestination.songLibrary)
        Label("Orchestration", systemImage: "mixer")
            .tag(NavigationDestination.orchestrationConsole)
    }
} detail: {
    detailView(for: selectedSidebarItem)
}
.commands {
    CommandMenu("File") {
        Button("New Song Contract") {
            navigationManager.navigate(to: .orderSong(contractId: nil))
        }
        .keyboardShortcut("n", modifiers: [.command, .shift])
    }
}
```

### tvOS (Focus-Based)

**Navigation Structure:**
- Focus engine for remote navigation
- Tab bar at top
- Slide-over panels for secondary features
- Siri Remote gestures

**Primary Flow:**
1. Order Song (top tab)
2. Song Library (top tab)

**Secondary Access:**
- Performance Strip (tab)
- Performance Editor (slide-over)
- Orchestration (slide-over)
- Settings (slide-over)

**Code Example:**
```swift
VStack(spacing: 0) {
    // Top tab bar
    HStack(spacing: 40) {
        ForEach(navigationManager.primaryDestinations, id: \.self) { destination in
            Button {
                selectedTab = destination
            } label: {
                VStack(spacing: 8) {
                    Image(systemName: destination.iconName)
                    Text(destination.title)
                }
            }
            .focusable() // tvOS focus engine
        }
    }

    // Main content
    TabView(selection: $selectedTab) {
        OrderSongContainerView()
            .tag(NavigationDestination.orderSong(contractId: nil))
        SongLibraryView()
            .tag(NavigationDestination.songLibrary)
    }
}
.slideOverPanel(isPresented: $navigationManager.presentedSheet) {
    slideOverContent
}
```

## Deep Linking

### URL Scheme

**Scheme:** `whiteroom://`

### Supported Paths

1. **Song Library**
   ```
   whiteroom://library
   ```

2. **Performance Strip**
   ```
   whiteroom://performances
   ```

3. **Order Song**
   ```
   # New contract
   whiteroom://order

   # Existing contract
   whiteroom://order/{contractId}

   # With intent
   whiteroom://order?intent=tense
   ```

4. **Performance Editor**
   ```
   whiteroom://performance/{performanceId}
   ```

5. **Orchestration Console**
   ```
   whiteroom://orchestrate
   ```

6. **Settings**
   ```
   whiteroom://settings
   ```

### Query Parameters

- `intent`: Musical intent for order song (song, cue, loop, etc.)
- `id`: Resource ID (contract ID, performance ID, etc.)

### Usage Examples

```swift
// Generate deep link
let manager = NavigationManager()
let url = manager.deepLinkURL(for: .orderSong(contractId: nil))
// => whiteroom://order

// Handle incoming deep link
func onOpenURL(_ url: URL) {
    let handled = navigationManager.handleDeepLink(url)
    if !handled {
        print("Failed to handle deep link: \(url)")
    }
}
```

## Implementation Guide

### Step 1: Import Navigation System

```swift
import SwiftUI
import SwiftFrontendShared
```

### Step 2: Use NavigationManager

```swift
@StateObject private var navigationManager = NavigationManager()

// Navigate to destination
navigationManager.navigate(to: .orderSong(contractId: nil))

// Pop back
navigationManager.pop()

// Pop to root
navigationManager.popToRoot()
```

### Step 3: Create Platform-Specific Views

```swift
struct MyView: View {
    var body: some View {
        #if os(iOS)
        iOSContentView()
        #elseif os(macOS)
        macOSContentView()
        #elseif os(tvOS)
        tvOSContentView()
        #endif
    }
}
```

### Step 4: Handle Deep Links

In your app entry point:

```swift
.onOpenURL { url in
    navigationManager.handleDeepLink(url)
}
```

## Testing

### Unit Tests

Test navigation logic:

```swift
func testNavigationDestination() {
    let destination = NavigationDestination.orderSong(contractId: "test")

    XCTAssertTrue(destination.isPrimary(for: .tvOS))
    XCTAssertFalse(destination.isPrimary(for: .iOS))
    XCTAssertEqual(destination.path, "/order/test")
}

func testDeepLinkParsing() {
    let manager = NavigationManager()
    let url = URL(string: "whiteroom://order?intent=tense")!

    let handled = manager.handleDeepLink(url)

    XCTAssertTrue(handled)
}
```

### Platform Tests

Test on each platform:

1. **iOS**
   - Tab bar navigation
   - Swipe back gesture
   - Sheet presentation
   - Deep linking from Safari/Messages

2. **macOS**
   - Sidebar navigation
   - Menu bar commands
   - Window management
   - Keyboard shortcuts
   - Deep linking from browser/terminal

3. **tvOS**
   - Focus engine navigation
   - Siri Remote gestures
   - Slide-over panels
   - Deep linking (if supported)

## Migration Guide

### From iOS-Only Navigation

**Before:**
```swift
NavigationView {
    PerformanceStripView()
}
```

**After:**
```swift
#if os(iOS)
PlatformNavigationiOS()
#elseif os(macOS)
PlatformNavigationMac()
#elseif os(tvOS)
PlatformNavigationTV()
#endif
```

### Adding New Destinations

1. Add case to `NavigationDestination`
2. Implement `isPrimary(for:)` logic
3. Add platform-specific view
4. Update deep linking if needed

Example:
```swift
// 1. Add destination
case myNewFeature

// 2. Define platform priority
public func isPrimary(for platform: Platform) -> Bool {
    switch platform {
    case .iOS: return true
    case .macOS: return false
    case .tvOS: return false
    }
}

// 3. Add view
private func destinationView(for destination: NavigationDestination) -> some View {
    switch destination {
    case .myNewFeature:
        MyNewFeatureView()
    // ...
    }
}

// 4. Add deep link path
public var path: String {
    case .myNewFeature: return "/my-new-feature"
}
```

## Troubleshooting

### Common Issues

**Issue: Navigation not working on tvOS**
- Solution: Ensure views are focusable with `.focusable()`
- Check that tab view uses tvOS-optimized style

**Issue: Deep links not opening**
- Solution: Verify URL scheme is registered in Info.plist
- Check that `onOpenURL` handler is connected
- Test URL scheme: `xcrun simctl openurl booted "whiteroom://order"`

**Issue: Platform detection not working**
- Solution: Use compile-time `#if os()` checks, not runtime
- Ensure Package.swift includes all platform targets

**Issue: macOS windows not opening**
- Solution: Use `WindowGroup` for document windows
- Ensure window ID is unique
- Check that scene is properly configured

## Best Practices

1. **Always use platform-conditional compilation** for platform-specific code
2. **Keep business logic shared** - only UI should differ
3. **Test deep links** on all supported platforms
4. **Follow HIG** for each platform (iOS HIG, macOS HIG, tvOS HIG)
5. **Provide secondary access** to all features
6. **Use SF Symbols** consistently across platforms
7. **Document platform differences** in code comments
8. **Test with actual devices** - tvOS especially

## Future Enhancements

- [ ] Handoff support between iOS and macOS
- [ ] Universal Control integration
- [ ] Spotlight search indexing
- [ ] Siri shortcuts for common actions
- [ ] Scene-based navigation for multitasking
- [ ] WatchOS companion app navigation
- [ ] Custom URL scheme registration UI
- [ ] Navigation analytics and crash reporting

## Resources

- [SwiftUI Navigation Documentation](https://developer.apple.com/documentation/swiftui/navigation)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [macOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/macos)
- [tvOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/tvos)
- [SF Symbols](https://developer.apple.com/sf-symbols/)
- [Deep Linking Best Practices](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content)

---

**Version:** 1.0.0
**Last Updated:** 2026-01-15
**Status:** Complete - white_room-232
