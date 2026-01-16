# White Room Accessibility Implementation Guide

## Overview

This guide is for developers implementing accessibility features in White Room. It covers best practices, code examples, and testing strategies.

## Table of Contents

1. [Accessibility Architecture](#accessibility-architecture)
2. [VoiceOver Implementation](#voiceover-implementation)
3. [Dynamic Type Implementation](#dynamic-type-implementation)
4. [High Contrast Implementation](#high-contrast-implementation)
5. [Keyboard Navigation Implementation](#keyboard-navigation-implementation)
6. [Testing Accessibility](#testing-accessibility)
7. [Common Pitfalls](#common-pitfalls)
8. [Accessibility Audit Checklist](#accessibility-audit-checklist)

---

## Accessibility Architecture

### Module Structure

```
SwiftFrontendShared/
├── Accessibility/
│   ├── AccessibilityModifiers.swift    # Core modifiers
│   ├── AccessibleControls.swift        # Accessible components
│   ├── KeyboardNavigation.swift        # Keyboard support
│   ├── HighContrastSupport.swift       # High contrast + color blindness
│   ├── MotorAccessibility.swift        # Motor accessibility
│   └── CognitiveAccessibility.swift    # Cognitive accessibility
```

### Design Principles

1. **Accessibility First**: Design with accessibility from the start
2. **Platform Native**: Use platform accessibility APIs
3. **Semantic Markup**: Use correct accessibility traits
4. **Clear Communication**: Descriptive labels and hints
5. **Testing**: Test with real assistive technologies

---

## VoiceOver Implementation

### Adding Accessibility Labels

```swift
// ❌ BAD: Vague label
Button("Save") { }
    .accessibilityLabel("Button")

// ✅ GOOD: Clear, descriptive label
Button("Save") { }
    .accessibilityLabel("Save project")
    .accessibilityHint("Saves current project to disk")
```

### Setting Accessibility Traits

```swift
// Button trait
Button("Play") { }
    .accessibilityAddTraits(.isButton)

// Header trait
Text("Settings")
    .accessibilityAddTraits(.isHeader)

// Selected trait
Toggle("Enable", isOn: $enabled)
    .accessibilityAddTraits(isEnabled ? .isSelected : [])
```

### Adding Accessibility Hints

```swift
Slider(value: $value, in: 0...1)
    .accessibilityLabel("Reverb decay time")
    .accessibilityValue("\(value.formatted(.number.precision(.fractionLength(2)))) seconds")
    .accessibilityHint("Swipe up or down to adjust")
```

### Grouping Related Elements

```swift
// Combine children into single element
VStack {
    Text("EQ Frequency")
    Text("\(frequency) Hz")
}
    .accessibilityElement(children: .combine)
    .accessibilityLabel("EQ frequency: \(frequency) Hz")

// Contain children but keep separate
VStack {
    Text("EQ Frequency")
    Text("\(frequency) Hz")
}
    .accessibilityElement(children: .contain)
    .accessibilityLabel("EQ settings")
```

### Custom Accessibility Actions

```swift
Button("Delete") { }
    .accessibilityAction(named: "Delete") { _ in
        // Perform delete
    }
    .accessibilityAction(named: "Cancel") { _ in
        // Cancel deletion
    }
```

### Using Accessible Controls

```swift
// Instead of standard Slider
AccessibleSlider(
    value: $decayTime,
    in: 0...5,
    label: "Reverb Decay",
    format: "%.2f"
)

// Instead of standard Toggle
AccessibleToggle(
    isOn: $reverbEnabled,
    label: "Enable Reverb"
)

// Instead of standard Button
AccessibleButton(
    label: "Save",
    hint: "Save current settings",
    systemImage: "square.and.arrow.down",
    action: { save() }
)
```

### Platform-Specific VoiceOver

```swift
// iOS: Standard VoiceOver
#if os(iOS)
Button("Play") { }
    .accessibilityLabel("Play")
    .accessibilityHint("Double tap to play")
#endif

// tvOS: 10-foot UI, larger focus
#if os(tvOS)
Button("Play") { }
    .accessibilityLabel("Play")
    .accessibilityHint("Press to play")
    .focusable()
#endif

// macOS: Keyboard focus
#if os(macOS)
Button("Play") { }
    .accessibilityLabel("Play")
    .accessibilityHint("Press to play")
    .keyboardShortcut(.space)
#endif
```

---

## Dynamic Type Implementation

### Using Adaptive Fonts

```swift
// ❌ BAD: Fixed size font
Text("Hello")
    .font(.system(size: 17))

// ✅ GOOD: Text style
Text("Hello")
    .font(.body)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
```

### Supporting All Text Sizes

```swift
Text("Long text that should wrap")
    .font(.body)
    .dynamicTypeSize(...DynamicTypeSize.accessibility1)
    .lineLimit(nil) // Don't truncate
    .fixedSize(horizontal: false, vertical: true)
```

### Testing Dynamic Type

```swift
#if DEBUG
struct DynamicTypePreview: PreviewProvider {
    static var previews: some View {
        VStack {
            Text("Extra Small")
                .environment(\.sizeCategory, .extraSmall)

            Text("Large")
                .environment(\.sizeCategory, .large)

            Text("Accessibility XXXL")
                .environment(\.sizeCategory, .accessibilityExtraExtraExtraLarge)
        }
    }
}
#endif
```

### Scaling Touch Targets

```swift
Button("Tap me") { }
    .frame(minWidth: 44, minHeight: 44) // iOS minimum
    .contentShape(Rectangle()) // Ensure entire area tappable
```

---

## High Contrast Implementation

### Detecting High Contrast Mode

```swift
struct HighContrastView: View {
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        if UIAccessibility.isDarkerSystemColorsEnabled {
            // Use high contrast colors
            content.highContrast()
        } else {
            // Use standard colors
            content
        }
    }
}
```

### Using High Contrast Colors

```swift
Text("Important text")
    .foregroundColor(HighContrastColors.text)
    .background(HighContrastColors.background)
```

### Checking Contrast Ratio

```swift
// Verify WCAG AA compliance (4.5:1)
let meetsAA = ContrastChecker.meetsWCAG_AA(
    foreground: .blue,
    background: .white
)

// Verify WCAG AAA compliance (7:1)
let meetsAAA = ContrastChecker.meetsWCAG_AAA(
    foreground: .blue,
    background: .white
)
```

### Color Blindness Support

```swift
// Use icons + text, not color alone
HStack {
    Image(systemName: "checkmark.circle.fill")
        .foregroundColor(.green)
    Text("Success")
}

// Use safe color palette
let safeColors = ColorBlindnessPalettes.blueOrange
```

---

## Keyboard Navigation Implementation

### Making Elements Focusable

```swift
Button("Click me") { }
    .focusable()
    .onKeyPress(.return) { _ in
        // Activate on return key
        return .handled
    }
```

### Setting Tab Order

```swift
VStack {
    TextField("Name", text: $name)
        .tabFocusOrder(1)

    TextField("Email", text: $email)
        .tabFocusOrder(2)

    Button("Submit") { }
        .tabFocusOrder(3)
}
```

### Keyboard Shortcuts

```swift
Button("Save") { }
    .keyboardShortcut("s", modifiers: .command)

Button("Undo") { }
    .keyboardShortcut("z", modifiers: .command)

Button("Redo") { }
    .keyboardShortcut("z", modifiers: [.command, .shift])
```

### Escape Key Handling

```swift
struct DismissableView: View {
    @Environment(\.dismiss) var dismiss

    var body: some View {
        SheetContent()
            .onEscape {
                dismiss()
            }
    }
}
```

### Arrow Key Navigation

```swift
Slider(value: $value, in: 0...1)
    .onArrow(
        up: { value += 0.1 },
        down: { value -= 0.1 }
    )
```

---

## Testing Accessibility

### VoiceOver Testing

```swift
// 1. Enable VoiceOver on device
// Settings → Accessibility → VoiceOver

// 2. Test navigation order
// Navigate with swipe right/left

// 3. Test element labels
// Verify each element has clear label

// 4. Test actions
// Verify double tap activates correctly
```

### Dynamic Type Testing

```swift
// 1. Enable Large Text
// Settings → Accessibility → Display & Text Size → Larger Text

// 2. Test at all sizes
// - Extra Small
// - Medium (default)
// - Large
// - Extra Large
// - XXL, XXXL
// - Accessibility M, L, XL, XXL, XXXL

// 3. Verify no truncation
// 4. Verify touch targets scale
```

### High Contrast Testing

```swift
// 1. Enable Increase Contrast
// Settings → Accessibility → Display & Text Size → Increase Contrast

// 2. Verify all controls visible
// 3. Verify text readable (4.5:1 contrast)
// 4. Verify custom colors work
```

### Keyboard Navigation Testing

```swift
// 1. Enable Full Keyboard Access (macOS)
// System Preferences → Keyboard → Shortcuts → Full Keyboard Access

// 2. Test Tab navigation
// Press Tab to move between controls

// 3. Test keyboard shortcuts
// Verify Cmd+S saves, etc.

// 4. Test Escape key
// Verify Escape cancels/dismisses
```

### Color Blindness Testing

```swift
// 1. Use color blindness simulator
// - macOS: Digital Color Meter
// - Online: Toptal Color Blindness Simulator

// 2. Verify information accessible
// - Icons + text for status
// - Patterns for charts
// - Safe color palettes
```

---

## Common Pitfalls

### 1. Missing Accessibility Labels

```swift
// ❌ BAD: No label
Image(systemName: "play")

// ✅ GOOD: Clear label
Image(systemName: "play")
    .accessibilityLabel("Play")
    .accessibilityHidden(true) // Decorative, or
    .accessibilityLabel("Play button") // Interactive
```

### 2. Using Color Alone

```swift
// ❌ BAD: Color only indication
Circle()
    .fill(status == .success ? .green : .red)

// ✅ GOOD: Icon + text
HStack {
    Image(systemName: status == .success ? "checkmark" : "xmark")
    Text(status == .success ? "Success" : "Error")
}
```

### 3. Small Touch Targets

```swift
// ❌ BAD: Small button
Button("×") { }
    .frame(width: 20, height: 20)

// ✅ GOOD: Minimum 44pt
Button("×") { }
    .touchTarget(size: 44)
```

### 4. Fixed Font Sizes

```swift
// ❌ BAD: Fixed size
Text("Hello")
    .font(.system(size: 17))

// ✅ GOOD: Adaptive
Text("Hello")
    .font(.body)
    .accessibleDynamicType()
```

### 5. Vague Labels

```swift
// ❌ BAD: Vague
Button("Tap here") { }

// ✅ GOOD: Specific
Button("Save project") { }
    .accessibilityHint("Saves to disk as .whiteroom file")
```

### 6. Ignoring Reduce Motion

```swift
// ❌ BAD: Always animated
.animation(.default, value: isVisible)

// ✅ GOOD: Respect reduce motion
.animation(
    UIAccessibility.isReduceMotionEnabled ? .none : .default,
    value: isVisible
)
```

---

## Accessibility Audit Checklist

### Phase 1: VoiceOver
- [ ] All elements have accessibility labels
- [ ] Labels are descriptive and specific
- [ ] Correct accessibility traits set
- [ ] Accessibility hints provided where needed
- [ ] Logical navigation order
- [ ] Custom actions work correctly
- [ ] Grouped elements properly
- [ ] Decorative elements hidden

### Phase 2: Dynamic Type
- [ ] Uses text styles, not fixed sizes
- [ ] Supports all sizes (100%-200%)
- [ ] No text truncation
- [ ] Layout adapts to larger sizes
- [ ] Touch targets scale appropriately
- [ ] Scrollable when needed

### Phase 3: High Contrast
- [ ] System high contrast mode works
- [ ] Custom contrast options work
- [ ] All controls visible (4.5:1)
- [ ] Text remains readable
- [ ] Icons remain visible
- [ ] Borders/enhancements visible

### Phase 4: Keyboard Navigation
- [ ] Tab/Shift+Tab navigation works
- [ ] Logical tab order
- [ ] Arrow keys work for sliders
- [ ] Space/Enter activate buttons
- [ ] Escape cancels/dismisses
- [ ] Keyboard shortcuts documented
- [ ] Visible focus indicators

### Phase 5: Color Blindness
- [ ] Protanopia simulation works
- [ ] Deuteranopia simulation works
- [ ] Tritanopia simulation works
- [ ] Color not sole indicator
- [ ] Icons + text for status
- [ ] Safe color palettes used
- [ ] Patterns for data visualization

### Phase 6: Motor Accessibility
- [ ] Touch targets meet minimum (44pt iOS, 80pt tvOS)
- [ ] Gesture alternatives available
- [ ] Switch Control support
- [ ] AssistiveTouch support
- [ ] Adjustable timing
- [ ] No time limits

### Phase 7: Cognitive Accessibility
- [ ] Language clear and simple
- [ ] Navigation consistent
- [ ] Error messages helpful
- [ ] Undo/redo available
- [ ] Progressive disclosure
- [ ] Memory aids available

---

## Best Practices Summary

1. **Test Early, Test Often**: Test with VoiceOver from day one
2. **Use Platform APIs**: Don't reinvent accessibility
3. **Semantic Markup**: Correct traits and roles
4. **Clear Communication**: Descriptive labels and hints
5. **Multiple Indicators**: Color + icon + text
6. **Keyboard Support**: Full keyboard navigation
7. **Resize Support**: Dynamic Type works at all sizes
8. **High Contrast**: WCAG AA compliance
9. **Motor Accessibility**: Adequate touch targets
10. **Cognitive Accessibility**: Clear language, consistent UI

---

## Resources

### Apple Documentation
- [Accessibility - SwiftUI](https://developer.apple.com/documentation/swiftui/accessibility)
- [VoiceOver - UIKit](https://developer.apple.com/documentation/uikit/accessibility)
- [Accessibility Inspector](https://developer.apple.com/documentation/accessibility/accessibility_inspector)

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding)

### Testing Tools
- [Accessibility Inspector (Xcode)](https://developer.apple.com/documentation/accessibility/accessibility_inspector)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)
- [Color Blindness Simulator](https://www.toptal.com/designers/colorfilter)

### Community
- [Apple Accessibility Forum](https://developer.apple.com/forums)
- [Accessibility Slack](https://a11y-slack.herokuapp.com)
- [Twitter @a11y](https://twitter.com/a11y)

---

**Version**: 1.0
**Last Updated**: 2025-01-15
**Maintainer**: White Room Accessibility Team
