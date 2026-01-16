# Piano Roll Editor Test Plan

**Date:** January 16, 2026
**Component:** Piano Roll Editor (iOS)
**Test Scope:** iPhone and iPad optimization, performance, functionality

---

## 1. Test Objectives

Verify that the piano roll editor provides:
- ✅ **Device-appropriate octave ranges** (3 octaves for iPhone, 8 octaves for iPad)
- ✅ **Smooth 60fps performance** across all device types
- ✅ **Intuitive touch interactions** with proper haptic feedback
- ✅ **iPad-specific enhancements** (octave labels, velocity editing, keyboard shortcuts)
- ✅ **Accessibility compliance** (VoiceOver, touch targets, contrast)

---

## 2. Test Environment

### Devices to Test

**iPhone:**
- iPhone SE (3rd generation) - Small screen baseline
- iPhone 14 Pro - Standard iPhone
- iPhone 15 Pro Max - Large iPhone

**iPad:**
- iPad Pro 12.9" (6th generation) - Large iPad (primary target)
- iPad Pro 11" (4th generation) - Medium iPad
- iPad Air (5th generation) - Standard iPad

### iOS Versions
- iOS 17.0 (minimum supported)
- iOS 18.0 (latest)

### Simulator Setup
```bash
# List available simulators
xcrun simctl list devices

# Install app on simulator
xcrun simctl install <device_id> /path/to/WhiteRoomiOS.app

# Launch app
xcrun simctl launch <device_id> com.whiteroom.ios
```

---

## 3. Functional Test Cases

### 3.1 Device Detection & Layout

#### TC-PR-001: iPhone Displays 3 Octaves
**Preconditions:** App launched on iPhone
**Steps:**
1. Navigate to Piano Roll Editor
2. Count visible octaves in keyboard view
3. Verify MIDI range starts at C0 (MIDI 12)

**Expected Result:**
- Exactly 3 octaves visible (C0 to B2)
- MIDI range: 12-47
- Key height: 28pt

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-002: iPad Displays 8 Octaves
**Preconditions:** App launched on iPad
**Steps:**
1. Navigate to Piano Roll Editor
2. Count visible octaves in keyboard view
3. Verify MIDI range starts at C0 (MIDI 12)

**Expected Result:**
- Exactly 8 octaves visible (C0 to B7)
- MIDI range: 12-107
- Key height: 16pt
- Octave labels visible for C notes (C0, C1, C2, etc.)

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-003: Portrait vs Landscape Layout
**Preconditions:** App launched on iPhone 14 Pro Max
**Steps:**
1. Launch app in portrait orientation
2. Verify keyboard is at top, timeline below
3. Rotate device to landscape
4. Verify keyboard is on left, timeline on right

**Expected Result:**
- Portrait: Stacked vertical layout
- Landscape: Side-by-side layout
- Smooth transition with animation

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

### 3.2 Touch Interactions

#### TC-PR-004: Tap to Select Pitch
**Preconditions:** Piano roll visible
**Steps:**
1. Tap any key in the keyboard
2. Observe visual feedback
3. Verify haptic feedback

**Expected Result:**
- Selected key highlights
- Light haptic feedback triggered
- selectedPitch state updates

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-005: Zoom In/Out
**Preconditions:** Piano roll visible with notes
**Steps:**
1. Tap zoom + button
2. Verify zoom level increases by 20%
3. Tap zoom - button
4. Verify zoom level decreases by 20%

**Expected Result:**
- Zoom range: 20% - 500%
- Haptic feedback on each zoom
- Smooth animation
- Notes scale proportionally

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-006: Pinch to Zoom
**Preconditions:** Piano roll visible with notes
**Steps:**
1. Use two-finger pinch gesture
2. Zoom in by spreading fingers
3. Zoom out by pinching fingers

**Expected Result:**
- Pinch gesture recognized
- Zoom level updates smoothly
- No lag or stutter
- Haptic feedback at threshold

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-007: Long Press for Context Menu
**Preconditions:** Piano roll visible with notes
**Steps:**
1. Long press on a note (0.5s)
2. Verify haptic feedback
3. Context menu appears

**Expected Result:**
- Medium haptic feedback after 0.5s
- Context menu with options:
  - Delete
  - Duplicate
  - Change Color
  - Edit Velocity

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

### 3.3 iPad-Specific Features

#### TC-PR-008: Octave Labels Visible
**Preconditions:** App launched on iPad Pro 12.9"
**Steps:**
1. Navigate to Piano Roll Editor
2. Look for octave labels (C0, C1, C2, etc.)
3. Verify labels align with C notes

**Expected Result:**
- Octave labels visible for all 8 octaves
- Labels positioned at x: 20
- Font size: 10pt, light weight
- Secondary color (gray)

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-009: Velocity Editing Area
**Preconditions:** App launched on iPad with notes
**Steps:**
1. Look for velocity editing area next to keyboard
2. Drag vertically in velocity area
3. Verify note velocity changes

**Expected Result:**
- 24pt touch area for velocity editing
- Drag up = higher velocity (max 127)
- Drag down = lower velocity (min 0)
- Haptic feedback every 32 velocity units

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-010: Keyboard Shortcuts
**Preconditions:** App launched on iPad with external keyboard
**Steps:**
1. Press Cmd+- (zoom out)
2. Verify zoom decreases
3. Press Cmd+= (zoom in)
4. Verify zoom increases
5. Look for command (⌘) icon hint

**Expected Result:**
- Cmd+- decreases zoom by 20%
- Cmd+= increases zoom by 20%
- Command icon visible in toolbar
- Shortcuts work consistently

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-011: Larger Touch Targets
**Preconditions:** App launched on iPad Pro 12.9"
**Steps:**
1. Measure key width in keyboard
2. Verify touch target size

**Expected Result:**
- Key width: 60pt (vs 44pt on iPhone)
- Velocity area: 24pt (vs 16pt on iPhone)
- All buttons minimum 44pt
- Compliant with Apple HIG

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

### 3.4 Note Rendering

#### TC-PR-012: Notes Display Correctly
**Preconditions:** Piano roll with sample notes loaded
**Steps:**
1. Verify notes appear on timeline
2. Check note colors
3. Verify note positions match pitch/time

**Expected Result:**
- Notes render at correct X position (based on startBeat)
- Notes render at correct Y position (based on pitch)
- Note color with velocity-based opacity
- Selected notes have thicker accent color border

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-013: Grid Lines Draw Correctly
**Preconditions:** Piano roll visible
**Steps:**
1. Inspect horizontal grid lines (pitch)
2. Inspect vertical grid lines (time)
3. Verify C note lines are thicker

**Expected Result:**
- Horizontal lines every currentKeyHeight
- C note lines: 1.0pt opacity, 1.0pt width
- Other lines: 0.2pt opacity, 0.5pt width
- Vertical lines every 100pt * zoomLevel
- Bar lines (every 4 beats) thicker

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

### 3.5 Quantization

#### TC-PR-014: Quantization Menu
**Preconditions:** Piano roll visible
**Steps:**
1. Tap quantization button
2. Verify options appear
3. Select 1/8 note
4. Verify quantization value updates

**Expected Result:**
- Action sheet appears with options:
  - 1/4 Note
  - 1/8 Note
  - 1/16 Note
  - 1/32 Note
- Selected option updates quantizationValue
- Button shows current quantization

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

### 3.6 Velocity Editor

#### TC-PR-015: Velocity Editor Modal
**Preconditions:** Piano roll visible with notes
**Steps:**
1. Tap velocity editor button
2. Verify modal appears
3. Adjust slider for a note
4. Verify velocity value updates

**Expected Result:**
- Modal sheet presents from bottom
- List of all notes with pitch and velocity
- Slider range: 0-127
- Velocity value updates in real-time
- Done button dismisses modal

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

## 4. Performance Test Cases

### 4.1 Rendering Performance

#### TC-PR-PERF-001: Canvas Render Time - 100 Notes
**Preconditions:** Piano roll with 100 notes loaded
**Steps:**
1. Use Instruments to measure render time
2. Scroll timeline rapidly
3. Record average frame time

**Expected Result:**
- Render time < 16ms (60fps target)
- No dropped frames during scrolling
- Smooth animations

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-PERF-002: Canvas Render Time - 1000 Notes
**Preconditions:** Piano roll with 1000 notes loaded
**Steps:**
1. Use Instruments to measure render time
2. Scroll timeline rapidly
3. Record average frame time

**Expected Result:**
- Render time < 50ms (acceptable for large note count)
- No more than 10% dropped frames
- Responsive scrolling

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-PERF-003: Canvas Render Time - 10000 Notes
**Preconditions:** Piano roll with 10000 notes loaded
**Steps:**
1. Use Instruments to measure render time
2. Scroll timeline rapidly
3. Record average frame time

**Expected Result:**
- Render time < 200ms (acceptable for very large songs)
- Virtualization prevents rendering all notes
- Scroll remains functional

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

### 4.2 Memory Performance

#### TC-PR-PERF-004: Memory Usage - Small Song
**Preconditions:** Piano roll with 50 notes
**Steps:**
1. Use Instruments Allocations tool
2. Record memory footprint
3. Check for memory leaks

**Expected Result:**
- Memory footprint < 50MB
- No memory leaks after 5 minutes
- Stable memory usage

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-PERF-005: Memory Usage - Large Song
**Preconditions:** Piano roll with 5000 notes
**Steps:**
1. Use Instruments Allocations tool
2. Record memory footprint
3. Check for memory leaks

**Expected Result:**
- Memory footprint < 200MB
- No memory leaks after 5 minutes
- Memory grows linearly with note count

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

### 4.3 Interaction Performance

#### TC-PR-PERF-006: Tap Response Time
**Preconditions:** Piano roll visible
**Steps:**
1. Tap key in keyboard
2. Measure time to haptic feedback
3. Measure time to visual update

**Expected Result:**
- Haptic feedback < 16ms
- Visual update < 32ms
- Perceived instant response

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-PERF-007: Scroll Performance
**Preconditions:** Piano roll with 500 notes
**Steps:**
1. Scroll timeline vertically
2. Use Instruments to measure frame rate
3. Check for jank

**Expected Result:**
- Consistent 60fps during scroll
- No visible jank or stutter
- Smooth deceleration

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-PERF-008: Zoom Performance
**Preconditions:** Piano roll with 500 notes
**Steps:**
1. Pinch to zoom from 100% to 200%
2. Use Instruments to measure frame rate
3. Check for lag

**Expected Result:**
- Consistent 60fps during zoom
- Smooth scaling animation
- No lag or stutter

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

## 5. Visual Regression Tests

### 5.1 Layout Verification

#### TC-PR-VIS-001: iPhone Portrait Layout
**Preconditions:** App launched on iPhone 14 Pro
**Steps:**
1. Navigate to Piano Roll Editor
2. Take screenshot
3. Compare with reference image

**Expected Result:**
- Keyboard at top (40% height)
- Timeline below (60% height)
- All controls visible
- No layout issues

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-VIS-002: iPad Portrait Layout
**Preconditions:** App launched on iPad Pro 12.9"
**Steps:**
1. Navigate to Piano Roll Editor
2. Take screenshot
3. Compare with reference image

**Expected Result:**
- Keyboard on left (40% width)
- Timeline on right (60% width)
- Octave labels visible
- Velocity editing area visible
- All controls properly sized

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-VIS-003: Dark Mode
**Preconditions:** App launched on iPhone 14 Pro
**Steps:**
1. Enable dark mode in Settings
2. Navigate to Piano Roll Editor
3. Verify all colors visible

**Expected Result:**
- Background: systemBackground (dark)
- Text: primary (light)
- Octave labels: secondary (gray)
- Notes maintain color with proper opacity
- Contrast ratio >= 4.5:1

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-VIS-004: Octave Labels Rendering
**Preconditions:** App launched on iPad Pro 12.9"
**Steps:**
1. Navigate to Piano Roll Editor
2. Inspect octave labels (C0, C1, C2, etc.)
3. Verify alignment and spacing

**Expected Result:**
- Labels align with C notes
- Font: system 10pt light
- Color: secondary
- No overlap with grid lines
- Readable at all zoom levels

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

## 6. Accessibility Tests

### 6.1 VoiceOver

#### TC-PR-ACC-001: VoiceOver Navigation
**Preconditions:** VoiceOver enabled
**Steps:**
1. Navigate to Piano Roll Editor
2. Swipe right to move through elements
3. Verify labels are announced

**Expected Result:**
- "Piano Roll, heading"
- "Quantization, button, 1/4 note"
- "Velocity editor, button"
- Each element has accessible label

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-ACC-002: Keyboard VoiceOver Labels
**Preconditions:** VoiceOver enabled, piano roll visible
**Steps:**
1. Tap on key in keyboard
2. Verify pitch announced
3. Verify hint provided

**Expected Result:**
- "C4, quarter note"
- Hint: "Double tap to select"
- Proper pitch announcement

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-ACC-003: Velocity Area Accessibility
**Preconditions:** VoiceOver enabled on iPad
**Steps:**
1. Navigate to velocity editing area
2. Verify label and hint announced

**Expected Result:**
- Label: "Velocity"
- Hint: "Drag to adjust velocity"
- Proper accessibility implementation

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

### 6.2 Touch Targets

#### TC-PR-ACC-004: Minimum Touch Target Size
**Preconditions:** App launched on iPad Pro 12.9"
**Steps:**
1. Measure all interactive elements
2. Verify minimum size

**Expected Result:**
- All buttons >= 44pt x 44pt
- Keyboard keys >= 44pt wide
- Velocity area >= 24pt wide
- Compliant with Apple HIG

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

### 6.3 Color Contrast

#### TC-PR-ACC-005: Contrast Ratio - Light Mode
**Preconditions:** App in light mode
**Steps:**
1. Use contrast checker tool
2. Measure contrast ratios

**Expected Result:**
- Text on background: >= 4.5:1
- Grid lines: >= 3:1
- Note borders: >= 3:1
- WCAG AA compliant

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-ACC-006: Contrast Ratio - Dark Mode
**Preconditions:** App in dark mode
**Steps:**
1. Use contrast checker tool
2. Measure contrast ratios

**Expected Result:**
- Text on background: >= 4.5:1
- Grid lines: >= 3:1
- Note borders: >= 3:1
- WCAG AA compliant

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

## 7. Edge Cases

### 7.1 Extreme Values

#### TC-PR-EDGE-001: Maximum Zoom (500%)
**Preconditions:** Piano roll with notes
**Steps:**
1. Tap zoom + until maximum (500%)
2. Verify rendering
3. Verify scrolling

**Expected Result:**
- Notes render correctly
- Grid lines visible
- Scroll remains functional
- No rendering artifacts

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-EDGE-002: Minimum Zoom (20%)
**Preconditions:** Piano roll with notes
**Steps:**
1. Tap zoom - until minimum (20%)
2. Verify rendering
3. Verify notes visible

**Expected Result:**
- Notes render correctly (small but visible)
- Grid lines visible
- Overview perspective maintained
- No rendering artifacts

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-EDGE-003: Extreme Velocity Values
**Preconditions:** Piano roll with note
**Steps:**
1. Set note velocity to 0
2. Set note velocity to 127
3. Verify visual difference

**Expected Result:**
- Velocity 0: Minimum opacity (0.6)
- Velocity 127: Maximum opacity (1.0)
- Clear visual difference
- Smooth gradient

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

### 7.2 Boundary Conditions

#### TC-PR-EDGE-004: First and Last Octaves
**Preconditions:** App on iPad with 8 octaves
**Steps:**
1. Scroll to C0 (first note)
2. Verify visible and interactable
3. Scroll to B7 (last note)
4. Verify visible and interactable

**Expected Result:**
- C0 (MIDI 12) visible and playable
- B7 (MIDI 107) visible and playable
- No cutoff at boundaries
- Proper scrolling

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

#### TC-PR-EDGE-005: Empty Note Array
**Preconditions:** Piano roll with no notes
**Steps:**
1. Clear all notes
2. Verify rendering
3. Verify interactions

**Expected Result:**
- Grid renders correctly
- No crashes or errors
- Interactions work normally
- Can add new notes

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

### 7.3 Orientation Changes

#### TC-PR-EDGE-006: Rapid Orientation Changes
**Preconditions:** App on iPhone 14 Pro Max
**Steps:**
1. Rotate device 10 times rapidly
2. Verify layout updates
3. Check for rendering issues

**Expected Result:**
- Layout transitions smoothly
- No visual glitches
- No state loss
- Consistent behavior

**Actual:** __________________
**Status:** [ ] PASS [ ] FAIL

---

## 8. Automated Testing

### 8.1 Unit Tests

#### Test File: `PianoRollEditorTests.swift`

```swift
import XCTest
@testable import WhiteRoomiOS

class PianoRollEditorTests: XCTestCase {

    // MARK: - Device Detection Tests

    func testiPhoneOctaveCount() {
        // Test that iPhone shows 3 octaves
        // Implementation needed
    }

    func testiPadOctaveCount() {
        // Test that iPad shows 8 octaves
        // Implementation needed
    }

    func testMIDIRangeCalculation() {
        // Test MIDI range calculation
        // Implementation needed
    }

    // MARK: - Note Rendering Tests

    func testNotePositionCalculation() {
        // Test note X/Y position calculation
        // Implementation needed
    }

    func testVelocityOpacityMapping() {
        // Test velocity to opacity mapping
        // Implementation needed
    }

    // MARK: - Gesture Tests

    func testTapGestureRecognition() {
        // Test tap gesture recognition
        // Implementation needed
    }

    func testLongPressGestureRecognition() {
        // Test long press gesture
        // Implementation needed
    }

    // MARK: - Performance Tests

    func testCanvasRenderPerformance100Notes() {
        measure {
            // Render 100 notes
            // Verify < 16ms
        }
    }

    func testCanvasRenderPerformance1000Notes() {
        measure {
            // Render 1000 notes
            // Verify < 50ms
        }
    }
}
```

---

### 8.2 Snapshot Tests

#### Test File: `PianoRollSnapshotTests.swift`

```swift
import XCTest
@testable import WhiteRoomiOS

class PianoRollSnapshotTests: XCTestCase {

    func testiPhonePortraitLayout() {
        // Snapshot test for iPhone portrait
        // Implementation needed
    }

    func testiPadPortraitLayout() {
        // Snapshot test for iPad portrait
        // Implementation needed
    }

    func testDarkModeAppearance() {
        // Snapshot test for dark mode
        // Implementation needed
    }
}
```

---

## 9. Test Execution

### 9.1 Manual Testing

**Setup:**
1. Install app on test devices
2. Prepare test data (songs with various note counts)
3. Set up Instruments for performance monitoring
4. Create checklist printout

**Execution:**
1. Run functional tests (TC-PR-001 to TC-PR-015)
2. Run performance tests (TC-PR-PERF-001 to TC-PR-PERF-008)
3. Run visual regression tests (TC-PR-VIS-001 to TC-PR-VIS-004)
4. Run accessibility tests (TC-PR-ACC-001 to TC-PR-ACC-006)
5. Run edge case tests (TC-PR-EDGE-001 to TC-PR-EDGE-006)

**Documentation:**
- Record results for each test case
- Capture screenshots for visual tests
- Export Instruments traces for performance tests
- Log any bugs or issues found

---

### 9.2 Automated Testing

**Setup:**
1. Configure Xcode test scheme
2. Set up CI/CD integration
3. Configure test devices for continuous testing

**Execution:**
```bash
# Run all tests
xcodebuild test -project WhiteRoomiOS.xcodeproj \
  -scheme WhiteRoomiOS \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro Max'

# Run iPad tests
xcodebuild test -project WhiteRoomiOS.xcodeproj \
  -scheme WhiteRoomiOS \
  -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation)'

# Run specific test
xcodebuild test -project WhiteRoomiOS.xcodeproj \
  -scheme WhiteRoomiOS \
  -only-testing:WhiteRoomiOSTests/PianoRollEditorTests/testiPhoneOctaveCount
```

---

### 9.3 Continuous Integration

**GitHub Actions Workflow:**

```yaml
name: Piano Roll Tests

on:
  push:
    paths:
      - 'swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/UI/Components/iOS/PianoRollEditor_iOS.swift'
  pull_request:
    paths:
      - 'swift_frontend/WhiteRoomiOS/Sources/SwiftFrontendCore/UI/Components/iOS/PianoRollEditor_iOS.swift'

jobs:
  test:
    runs-on: macos-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Xcode
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest-stable

      - name: Run iPhone tests
        run: |
          xcodebuild test \
            -project swift_frontend/WhiteRoomiOS/WhiteRoomiOS.xcodeproj \
            -scheme WhiteRoomiOS \
            -destination 'platform=iOS Simulator,name=iPhone 15 Pro Max'

      - name: Run iPad tests
        run: |
          xcodebuild test \
            -project swift_frontend/WhiteRoomiOS/WhiteRoomiOS.xcodeproj \
            -scheme WhiteRoomiOS \
            -destination 'platform=iOS Simulator,name=iPad Pro (12.9-inch) (6th generation)'

      - name: Run performance tests
        run: |
          xcodebuild test \
            -project swift_frontend/WhiteRoomiOS/WhiteRoomiOS.xcodeproj \
            -scheme WhiteRoomiOS \
            -only-testing:WhiteRoomiOSTests/PianoRollEditorTests/testCanvasRenderPerformance100Notes
```

---

## 10. Success Criteria

### Must Have (P0)
- ✅ All functional tests pass (TC-PR-001 to TC-PR-015)
- ✅ 60fps performance for typical songs (100 notes)
- ✅ No crashes or memory leaks
- ✅ iPad shows 8 octaves, iPhone shows 3 octaves
- ✅ All accessibility tests pass

### Should Have (P1)
- ✅ Performance tests pass for large songs (1000+ notes)
- ✅ Visual regression tests pass
- ✅ Edge case tests pass
- ✅ Automated unit tests implemented

### Nice to Have (P2)
- ⚠️ Automated snapshot tests
- ⚠️ Performance regression detection in CI
- ⚠️ A/B testing for UX improvements

---

## 11. Bug Tracking

**Found bugs should be logged in bd (Beads):**

```bash
# Example bug report
bd create "Piano roll: Octave labels overlap with notes on iPad mini" \
  --type bug \
  --labels "piano-roll,iPad,ui"

# Example performance issue
bd create "Piano roll: Scrolling lags with 5000+ notes on iPhone SE" \
  --type bug \
  --labels "piano-roll,performance,critical"
```

**Bug Template:**
- Title: [Component]: [Brief description]
- Type: bug / enhancement
- Priority: P0 / P1 / P2 / P3
- Labels: component, device, severity
- Test case: TC-PR-XXX
- Steps to reproduce: [List steps]
- Expected result: [What should happen]
- Actual result: [What actually happens]
- Device: [Device model and iOS version]
- Frequency: [Always / Sometimes / Rare]

---

## 12. Sign-Off

**Testing completed by:** __________________
**Date:** __________________
**Test environment:**
- Devices: __________________
- iOS versions: __________________
- Xcode version: __________________

**Summary:**
- Total tests: 41
- Passed: _____
- Failed: _____
- Blocked: _____

**Overall Status:** [ ] PASS [ ] FAIL [ ] CONDITIONAL PASS

**Recommendations:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

**Approved for production:** [ ] YES [ ] NO [ ] NEEDS FIXES

**Signatures:**
- QA Lead: __________________
- Development Lead: __________________
- Product Owner: __________________

---

**Test Plan Version:** 1.0
**Last Updated:** January 16, 2026
**Next Review:** After iPad optimization implementation
