# White Room Accessibility Guide

## Overview

White Room is committed to accessibility for all users. This guide documents accessibility features, how to use them, and best practices for developers.

## Table of Contents

1. [Accessibility Features](#accessibility-features)
2. [VoiceOver Navigation](#voiceover-navigation)
3. [Dynamic Type Support](#dynamic-type-support)
4. [High Contrast Mode](#high-contrast-mode)
5. [Keyboard Navigation](#keyboard-navigation)
6. [Color Blindness Support](#color-blindness-support)
7. [Motor Accessibility Features](#motor-accessibility-features)
8. [Cognitive Accessibility Features](#cognitive-accessibility-features)
9. [Platform-Specific Features](#platform-specific-features)
10. [Testing Checklist](#testing-checklist)

---

## Accessibility Features

### WCAG Compliance

White Room meets **WCAG 2.1 AA** standards across all platforms:

- **Perceivable**: Information and UI components must be presentable to users in ways they can perceive
- **Operable**: UI components and navigation must be operable
- **Understandable**: Information and UI operation must be understandable
- **Robust**: Content must be robust enough to be interpreted reliably by a wide variety of user agents

### Supported Assistive Technologies

- **VoiceOver** (iOS, macOS, tvOS)
- **Switch Control** (iOS, macOS)
- **AssistiveTouch** (iOS)
- **Full Keyboard Access** (macOS)
- **Zoom** (iOS, macOS)
- **Reduce Motion** (iOS, macOS)
- **High Contrast Mode** (iOS, macOS)

---

## VoiceOver Navigation

### What is VoiceOver?

VoiceOver is a screen reader that describes aloud what appears on your screen. It's essential for users who are blind or have low vision.

### VoiceOver Gestures

#### Basic Navigation

| Gesture | Action |
|---------|--------|
| Single tap | Select item and hear description |
| Double tap | Activate selected item |
| Swipe right | Move to next item |
| Swipe left | Move to previous item |
| Swipe up | Read previous item (rotor) |
| Swipe down | Read next item (rotor) |
| Two-finger tap | Pause/resume speech |
| Two-finger swipe up | Read all from top |
| Two-finger swipe down | Read all from current position |

#### Rotor Control

| Gesture | Action |
|---------|--------|
| Two-finger rotate | Open rotor (adjustable settings) |
| Swipe up/down with rotor | Navigate by rotor setting |

**Rotor settings include:**
- Characters
- Words
- Lines
- Containers
- Headings
- Links
- Form controls

### VoiceOver Labels

All elements in White Room have clear, descriptive labels:

**Example:**
- Button: "Play button, double tap to play"
- Slider: "Reverb decay time, 2.5 seconds, swipe up or down to adjust"
- Toggle: "Enable reverb, on, double tap to toggle"

### VoiceOver Tips

1. **Explore by touch**: Drag your finger around the screen to discover elements
2. **Use the rotor**: Rotate two fingers to change reading settings
3. **Practice gestures**: VoiceOver has its own gesture system
4. **Customize speed**: Adjust speaking rate in Accessibility settings
5. **Use headphones**: For privacy and clarity in public spaces

---

## Dynamic Type Support

### What is Dynamic Type?

Dynamic Type allows users to adjust text size to match their vision needs. White Room supports text sizes from **100% to 200%**.

### Enabling Dynamic Type

#### iOS
1. Open **Settings**
2. Tap **Accessibility**
3. Tap **Display & Text Size**
4. Tap **Larger Text**
5. Adjust slider

#### tvOS
1. Open **Settings**
2. Tap **General**
3. Tap **Accessibility**
4. Tap **Display**
5. Adjust **Text Size**

#### macOS
1. Open **System Preferences**
2. Click **Accessibility**
3. Click **Display**
4. Adjust **Text size** slider

### Supported Text Sizes

| Size | Description |
|------|-------------|
| Extra Small (XS) | Smallest text |
| Small | Smaller than default |
| Medium (Default) | Standard size |
| Large | Slightly larger |
| Extra Large (XL) | Large text |
| XXL | Extra large text |
| XXXL | Very large text |
| Accessibility M | Large accessibility size |
| Accessibility L | Extra large accessibility |
| Accessibility XL | Maximum accessibility size |
| Accessibility XXL | Largest supported size |
| Accessibility XXXL | Maximum size |

### Dynamic Type Tips

1. **Preview sizes**: Test at multiple sizes before committing
2. **Check layout**: Ensure no text is truncated
3. **Test buttons**: Touch targets grow with text size
4. **Use scroll**: Large text may require scrolling
5. **Per-app settings**: Set different sizes for different apps

---

## High Contrast Mode

### What is High Contrast Mode?

High contrast mode increases the contrast between foreground and background colors, making content easier to see for users with low vision.

### Enabling High Contrast Mode

#### iOS/tvOS
1. Open **Settings**
2. Tap **Accessibility**
3. Tap **Display & Text Size**
4. Enable **Increase Contrast**

#### macOS
1. Open **System Preferences**
2. Click **Accessibility**
3. Click **Display**
4. Enable **Increase contrast**

### High Contrast Colors

White Room uses WCAG AAA compliant colors in high contrast mode:

| Element | Color |
|---------|-------|
| Background | Pure black (#000000) |
| Text | Pure white (#FFFFFF) |
| Accent | Yellow (#FFFF00) |
| Success | Green (#00FF00) |
| Warning | Yellow (#FFFF00) |
| Error | Red (#FF0000) |
| Borders | White (#FFFFFF) |

### High Contrast Tips

1. **Combine with Dark Mode**: For maximum contrast
2. **Adjust transparency**: Reduce transparency in accessibility settings
3. **Reduce motion**: Can reduce visual clutter
4. **Test in different lighting**: Adjust brightness for comfort
5. **Customize in app**: White Room has custom contrast options

---

## Keyboard Navigation

### macOS Keyboard Shortcuts

#### Navigation

| Shortcut | Action |
|----------|--------|
| `Tab` | Move to next control |
| `Shift + Tab` | Move to previous control |
| `Arrow Keys` | Navigate within controls |
| `Return/Enter` | Activate button or control |
| `Space` | Toggle checkbox or button |
| `Escape` | Cancel or dismiss |

#### Playback

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `S` | Stop |
| `R` | Record |
| `L` | Loop |

#### Editing

| Shortcut | Action |
|----------|--------|
| `Cmd + Z` | Undo |
| `Cmd + Shift + Z` | Redo |
| `Cmd + S` | Save |
| `Cmd + ,` | Preferences |

#### View

| Shortcut | Action |
|----------|--------|
| `Cmd + 1` | Songs |
| `Cmd + 2` | Performances |
| `Cmd + 3` | Templates |
| `Cmd + 4` | Console |

#### Accessibility

| Shortcut | Action |
|----------|--------|
| `Cmd + Option + F` | Increase focus size |
| `Cmd + Option + B` | Toggle high contrast |
| `Cmd + Option + T` | Increase text size |

### tvOS Siri Remote Navigation

| Button | Action |
|--------|--------|
| Swipe | Navigate between items |
| Click | Activate selected item |
| Press and hold | Show context menu |
| Back | Go back |
| Play/Pause | Play or pause |

### Keyboard Navigation Tips

1. **Use Tab order**: Logical navigation flow
2. **Visible focus**: Clear indication of current focus
3. **Escape always works**: Cancel any operation
4. **Shortcuts documented**: Press `Cmd + /` for help
5. **Customize**: Create custom shortcuts in settings

---

## Color Blindness Support

### Types of Color Blindness

White Room supports all major types of color blindness:

- **Protanopia** (red-blind)
- **Deuteranopia** (green-blind)
- **Tritanopia** (blue-blind)
- **Achromatopsia** (monochromacy)

### Color Blindness Strategies

White Room uses multiple indicators beyond color:

1. **Icons + Text**: Status always includes both
2. **Patterns**: Data visualization uses patterns
3. **Safe Palettes**: Color combinations work for all types
4. **Customizable**: Users can adjust colors

### Example Status Indicators

| Status | Icon | Color |
|--------|------|-------|
| Success | ✓ | Green |
| Warning | ⚠ | Orange |
| Error | ✗ | Red |
| Info | ⓘ | Blue |

### Color Blindness Tips

1. **Don't rely on color alone**: Always use icons/text
2. **Test with simulators**: Verify with color blindness simulators
3. **Use high contrast**: Increases visibility
4. **Customize colors**: Adjust in app settings
5. **Share preferences**: Export/import color settings

---

## Motor Accessibility Features

### Touch Target Sizes

White Room ensures adequate touch target sizes:

| Platform | Minimum Size |
|----------|--------------|
| iOS | 44pt × 44pt |
| tvOS | 80pt × 80pt |
| macOS | No minimum (pointer) |

### Gesture Alternatives

For users who have difficulty with gestures:

| Gesture | Button Alternative |
|---------|-------------------|
| Swipe left | "← Swipe Left" button |
| Swipe right | "Swipe Right →" button |
| Swipe up | "↑ Swipe Up" button |
| Swipe down | "Swipe Down ↓" button |
| Pinch to zoom | "Zoom" button |
| Long press | "Hold" button (adjustable) |

### Adjustable Timing

Users can adjust timing for motor accessibility:

| Setting | Default | Range |
|---------|---------|-------|
| Long press duration | 0.5s | 0.3s - 2.0s |
| Animation duration | 0.3s | 0.1s - 1.0s |
| Toast duration | 2.0s | 1.0s - 5.0s |

### Switch Control Support

Switch Control allows navigation using:

- External switches
- Keyboard
- Head tracking
- Joystick

**Switch Control Navigation:**

1. **Auto-scan**: Items highlighted in sequence
2. **Manual scanning**: Move between items with switch
3. **Group selection**: Navigate by groups/individual items

### AssistiveTouch Support

AssistiveTouch provides:

- On-screen hardware buttons
- Gesture alternatives
- Custom gestures
- Quick actions menu

### Motor Accessibility Tips

1. **Increase touch targets**: Settings → Accessibility → Touch
2. **Enable switch control**: Settings → Accessibility → Switch Control
3. **Use AssistiveTouch**: Settings → Accessibility → Touch → AssistiveTouch
4. **Adjust timing**: Settings → Accessibility → AssistiveAccess
5. **Create custom gestures**: AssistiveTouch menu

---

## Cognitive Accessibility Features

### Clear Language

White Room uses plain language:

- Short sentences (10-15 words)
- Active voice
- Simple vocabulary
- No jargon
- Concrete examples

### Consistent Navigation

- Same navigation items in same order
- Clear back button labels
- Breadcrumbs for hierarchy
- Current location always visible

### Helpful Error Messages

Errors include:

1. **What happened** (plain language)
2. **Why it happened** (if known)
3. **How to fix it** (specific steps)
4. **Example of correct input**

### Progressive Disclosure

Complex features revealed gradually:

- Start with essential options
- Hide advanced features
- Show "Advanced" expander
- Clear indication of hidden content

### Undo/Redo Support

- Undo available for destructive actions
- Clear undo indication
- Redo available
- Context menu options

### Memory Aids

- Recent items history
- Favorites/bookmarks
- State persistence
- Clear visual indicators

### Cognitive Accessibility Tips

1. **Take your time**: No time limits
2. **Use step-by-step wizards**: Break down complex tasks
3. **Enable memory aids**: Settings → Accessibility → Memory Aids
4. **Use favorites**: Mark frequently used items
5. **Enable undo**: Settings → General → Undo

---

## Platform-Specific Features

### iOS Features

| Feature | Description |
|---------|-------------|
| Guided Access | Lock app to single task |
| AssistiveTouch | On-screen buttons |
| VoiceOver | Screen reader |
| Switch Control | Alternative navigation |
| Touch Accommodations | Adjust touch sensitivity |
| Reduce Motion | Reduce animations |
| Speak Selection | Read selected text |

### tvOS Features

| Feature | Description |
|---------|-------------|
| VoiceOver | Screen reader (10-foot UI) |
| Focus Engine | Keyboard navigation |
| High Contrast | WCAG AAA contrast |
| Large Text | Extra large sizes |
| Zoom | Magnify screen |
| Reduce Motion | Reduce animations |

### macOS Features

| Feature | Description |
|---------|-------------|
| Full Keyboard Access | Navigate without mouse |
| VoiceOver | Screen reader |
| Zoom | Magnify screen |
| Increase Contrast | High contrast mode |
| Reduce Motion | Reduce animations |
| Dictation | Voice control |

---

## Testing Checklist

### VoiceOver Testing

- [ ] All screens navigable with VoiceOver
- [ ] All elements have descriptive labels
- [ ] Correct accessibility traits set
- [ ] Logical navigation order
- [ ] Context-aware hints provided
- [ ] Custom actions work correctly

### Dynamic Type Testing

- [ ] Test at all text sizes (100%-200%)
- [ ] No text truncation
- [ ] Layout adapts to larger sizes
- [ ] Touch targets scale appropriately
- [ ] Scrollable content when needed

### High Contrast Testing

- [ ] System high contrast mode works
- [ ] Custom contrast options work
- [ ] All controls visible (4.5:1 contrast)
- [ ] Text remains readable
- [ ] Icons/emblems remain visible

### Keyboard Navigation Testing

- [ ] Tab/Shift+Tab navigation works
- [ ] Arrow keys work for sliders
- [ ] Space/Enter activate buttons
- [ ] Escape cancels/dismisses
- [ ] All features keyboard-accessible

### Color Blindness Testing

- [ ] Protanopia simulation works
- [ ] Deuteranopia simulation works
- [ ] Tritanopia simulation works
- [ ] All information accessible
- [ ] Color not sole indicator

### Motor Accessibility Testing

- [ ] Touch targets meet minimum sizes
- [ ] Gesture alternatives work
- [ ] Switch Control navigation works
- [ ] AssistiveTouch gestures work
- [ ] Adjustable timing works

### Cognitive Accessibility Testing

- [ ] Language is clear and simple
- [ ] Navigation is consistent
- [ ] Error messages are helpful
- [ ] Undo/redo works
- [ ] Progressive disclosure works

---

## Getting Help

### Accessibility Resources

- **Apple Accessibility**: [apple.com/accessibility](https://www.apple.com/accessibility)
- **WCAG Guidelines**: [w3.org/WAI/WCAG21/quickref](https://www.w3.org/WAI/WCAG21/quickref)
- **VoiceOver User Guide**: [support.apple.com/guide/voiceover](https://support.apple.com/guide/voiceover)

### Community Support

- **AppleVis Forum**: [applevis.com](https://www.applevis.com)
- **Accessibility Twitter**: @a11y
- **Reddit r/accessibility**: [reddit.com/r/accessibility](https://www.reddit.com/r/accessibility)

### Reporting Issues

Found an accessibility issue? Please report it:

1. Open White Room
2. Go to Settings → Help → Report Issue
3. Select "Accessibility"
4. Describe the issue
5. Include platform, iOS/tvOS/macOS version

---

## Conclusion

White Room is committed to making music creation accessible to everyone. We continuously improve accessibility features and welcome your feedback.

For questions, suggestions, or feedback:
- Email: accessibility@whiteroom.ai
- Twitter: @WhiteRoomAI
- GitHub: github.com/whiteroom/whiteroom

---

**Version**: 1.0
**Last Updated**: 2025-01-15
**WCAG Level**: AA
