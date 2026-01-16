# Multi-View Notation Test Scenarios

## Overview

This document describes comprehensive test scenarios for the iPad split-view notation system. These scenarios cover functionality, performance, and edge cases.

---

## 1. Basic Functionality Tests

### 1.1 Single View Initialization
**Test Case:** Launch multi-view container with default layout
**Expected Result:**
- Single Piano Roll view displayed
- No dividers visible
- Toolbar shows "1 view"
- Add view button enabled

**Steps:**
1. Navigate to Multi-View Notation
2. Verify default view is Piano Roll
3. Check toolbar state

---

### 1.2 Piano Roll + Tablature (50/50 Split)
**Test Case:** Add Tablature view to create 50/50 split
**Expected Result:**
- Two views visible: Piano Roll (left), Tablature (right)
- Vertical divider at center
- Each view takes 50% width
- Both views fully functional

**Steps:**
1. Tap "+" button
2. Select "Tablature" from picker
3. Verify 50/50 layout applied
4. Test editing in both views

---

### 1.3 Piano Roll + Sheet Music (60/40 Split)
**Test Case:** Configure 60/40 layout for primary-secondary workflow
**Expected Result:**
- Piano Roll takes 60% width (left)
- Sheet Music takes 40% width (right)
- Divider position reflects 60/40 ratio

**Steps:**
1. Add Piano Roll and Sheet Music views
2. Tap layout selector button
3. Choose "60/40 Split"
4. Verify layout ratio

---

### 1.4 All Three Views (33/33/33)
**Test Case:** Three-way equal split for comprehensive editing
**Expected Result:**
- Three views visible: Piano Roll, Tablature, Sheet Music
- Two dividers at 33% and 66% positions
- Each view takes ~33% width
- All views responsive

**Steps:**
1. Add Piano Roll view
2. Add Tablature view
3. Add Sheet Music view
4. Apply "33/33/33" layout
5. Test editing in all three views

---

## 2. Dynamic Layout Tests

### 2.1 Layout Preset Switching
**Test Case:** Switch between layout presets with active views
**Expected Result:**
- Layout changes smoothly
- Views maintain their content
- No data loss during transition
- Dividers update position

**Test Sequence:**
1. Start with 50/50 split
2. Switch to 60/40
3. Switch to 70/30
4. Switch back to 50/50
5. Verify content preserved

---

### 2.2 Dynamic View Addition
**Test Case:** Add view to existing layout
**Expected Result:**
- New view appears in appropriate slot
- Existing views resize to accommodate
- Layout recalculates correctly
- No visual glitches

**Test Sequence:**
1. Start with single Piano Roll
2. Add Tablature (50/50)
3. Add Sheet Music (auto-apply three-way layout)
4. Verify smooth transitions

---

### 2.3 View Removal
**Test Case:** Remove view from multi-view layout
**Expected Result:**
- Remaining view(s) expand to fill space
- Layout recalculates appropriately
- No orphaned space
- If only one view remains, switch to single view mode

**Test Sequence:**
1. Start with three-way split
2. Remove one view
3. Verify two-view layout
4. Remove second view
5. Verify single view mode

---

### 2.4 Reset to Single View
**Test Case:** Use reset button to return to single view
**Expected Result:**
- All views except primary removed
- Primary view expands to full width
- Dividers removed
- Toolbar updates

**Steps:**
1. Configure three-way split
2. Tap "X" button in toolbar
3. Verify single view remains
4. Check view is primary (first added)

---

## 3. Drag-to-Resize Tests

### 3.1 Basic Divider Drag
**Test Case:** Drag vertical divider to resize views
**Expected Result:**
- Divider follows finger/touch
- Views resize in real-time
- Haptic feedback on drag start/end
- Smooth 60fps performance

**Steps:**
1. Configure 50/50 split
2. Touch and drag divider
3. Move to 60/40 position
4. Release
5. Verify new ratio persists

---

### 3.2 Resize During Editing
**Test Case:** Drag divider while editing notes
**Expected Result:**
- Editing operation completes
- Resize happens smoothly
- No loss of edit focus
- Views update correctly

**Steps:**
1. Start editing a note in Piano Roll
2. While editing, drag divider
3. Complete note edit
4. Verify note in both views

---

### 3.3 Boundary Constraints
**Test Case:** Attempt to drag divider beyond valid range
**Expected Result:**
- Divider stops at minimum (20%)
- Divider stops at maximum (80%)
- Visual feedback at boundaries
- No overlapping views

**Test Sequence:**
1. Try to drag divider to 10% (should stop at 20%)
2. Try to drag divider to 90% (should stop at 80%)
3. Verify constraints enforced

---

## 4. Synchronization Tests

### 4.1 Note Selection Sync
**Test Case:** Select note in Piano Roll, verify selection in Tablature
**Expected Result:**
- Selection highlights in both views
- Same note identified in both representations
- Selection state consistent
- <16ms sync latency

**Steps:**
1. Configure Piano Roll + Tablature split
2. Tap note in Piano Roll
3. Verify note highlighted in Tablature
4. Deselect in Piano Roll
5. Verify deselected in Tablature

---

### 4.2 Note Edit Sync
**Test Case:** Edit note pitch in one view, verify in other
**Expected Result:**
- Change propagates to all views
- All views show updated note
- Edit history consistent
- No conflicting states

**Test Sequence:**
1. Create note in Piano Roll (C4)
2. Change to Tablature view
3. Modify pitch to D4
4. Return to Piano Roll
5. Verify pitch is D4

---

### 4.3 Playback Position Sync
**Test Case:** Start playback, verify position indicator in all views
**Expected Result:**
- Playhead moves in sync
- Timing aligned across views
- No lag between views
- Smooth 60fps rendering

**Steps:**
1. Start with three-way split
2. Begin playback
3. Watch playhead in all views
4. Verify alignment

---

### 4.4 Tempo and Time Signature Sync
**Test Case:** Change tempo in one view, verify in all
**Expected Result:**
- Tempo updates globally
- All views reflect new tempo
- Time signature changes sync
- Metronome updates

**Test Sequence:**
1. Set tempo to 120 BPM
2. Change to 140 BPM in one view
3. Check tempo display in all views
4. Verify tempo is 140 everywhere

---

## 5. Performance Tests

### 5.1 Two-View Performance (100 notes)
**Test Case:** 100 notes across 2 views
**Expected Result:**
- 60fps rendering
- <100MB memory usage
- <16ms sync latency
- Smooth scrolling

**Steps:**
1. Create 100 notes in Piano Roll
2. Open Tablature view
3. Measure frame rate
4. Profile memory

---

### 5.2 Three-View Performance (1000 notes)
**Test Case:** 1000 notes across 3 views
**Expected Result:**
- 60fps rendering (with virtualization)
- <250MB memory usage
- <16ms sync latency
- Acceptable performance

**Steps:**
1. Create 1000 notes across full range
2. Configure three-way split
3. Scroll through all views
4. Measure performance metrics

---

### 5.3 Rapid Edit Performance
**Test Case:** Rapid note creation/deletion across views
**Expected Result:**
- Edits complete without lag
- UI remains responsive
- No dropped frames
- Sync keeps up

**Test Sequence:**
1. Enable three-way split
2. Rapidly add 50 notes
3. Rapidly delete 25 notes
4. Monitor frame rate and sync

---

### 5.4 Large File Performance
**Test Case:** Load complex composition (5000 notes)
**Expected Result:**
- Virtualization activates
- Only visible notes rendered
- Memory stays <300MB
- Scrolling smooth

**Steps:**
1. Load 5000-note composition
2. Open multi-view
3. Verify virtualization enabled
4. Test scrolling performance

---

## 6. Edge Cases

### 6.1 Minimum/Maximum View Size
**Test Case:** Resize views to minimum (20%) and maximum (80%)
**Expected Result:**
- Views remain usable at minimum
- Content not clipped
- Touch targets still accessible
- Performance acceptable

**Test Sequence:**
1. Drag to 20/80 split
2. Test editing in smaller view
3. Drag to 80/20 split
4. Test editing in smaller view

---

### 6.2 Orientation Change
**Test Case:** Rotate iPad during multi-view editing
**Expected Result:**
- Layout recalculates
- Views adjust to new dimensions
- Content preserved
- Dividers reposition correctly

**Steps:**
1. Configure 50/50 split in portrait
2. Rotate to landscape
3. Verify layout adapts
4. Rotate back to portrait

---

### 6.3 Background/Foreground Transition
**Test Case:** Background app, return to multi-view
**Expected Result:**
- Views restored correctly
- Layout preserved
- Edits saved
- Sync re-established

**Steps:**
1. Configure three-way split
2. Edit notes in all views
3. Background app (home button)
4. Return to app
5. Verify state preserved

---

### 6.4 Memory Warning
**Test Case:** Receive memory warning during multi-view
**Expected Result:**
- Non-essential resources released
- Views remain functional
- No data loss
- Performance degrades gracefully

**Steps:**
1. Configure three-way split
2. Trigger memory warning (debug)
3. Monitor memory usage
4. Verify functionality

---

## 7. Accessibility Tests

### 7.1 VoiceOver Navigation
**Test Case:** Navigate multi-view with VoiceOver
**Expected Result:**
- Each view announced
- Dividers navigable
- Layout described
- Editing accessible

**Steps:**
1. Enable VoiceOver
2. Navigate to multi-view
3. Swipe through views
4. Verify announcements

---

### 7.2 Keyboard Navigation
**Test Case:** Use keyboard shortcuts to switch views
**Expected Result:**
- Cmd+1 switches to view 1
- Cmd+2 switches to view 2
- Cmd+3 switches to view 3
- Focus indicator visible

**Test Sequence:**
1. Connect keyboard
2. Configure three-way split
3. Press Cmd+1, Cmd+2, Cmd+3
4. Verify view switching

---

### 7.3 Dynamic Type Support
**Test Case:** Increase system font size
**Expected Result:**
- Text scales appropriately
- Layout remains functional
- Touch targets adequate
- No clipping

**Steps:**
1. Configure multi-view
2. Increase Dynamic Type to Extra Large
3. Verify text scaling
4. Test editing

---

## 8. Error Recovery Tests

### 8.1 View Creation Failure
**Test Case:** View creation fails (out of memory)
**Expected Result:**
- User alerted with error message
- Existing views unaffected
- Can retry creation
- Graceful degradation

**Steps:**
1. Simulate memory pressure
2. Attempt to add view
3. Verify error handling
4. Confirm existing views stable

---

### 8.2 Sync Failure Recovery
**Test Case:** Sync fails between views
**Expected Result:**
- Views continue functioning independently
- Conflict resolution offered
- Can manually resync
- Data not corrupted

**Test Sequence:**
1. Break sync connection (simulate)
2. Edit note in one view
3. Attempt to sync
4. Verify recovery options

---

## 9. User Experience Tests

### 9.1 First-Time User Flow
**Test Case:** New user experiences multi-view for first time
**Expected Result:**
- Intuitive layout
- Clear affordances
- Helpful tooltips
- Smooth learning curve

**Steps:**
1. Fresh install
2. Navigate to multi-view
3. Explore without guidance
4. Note confusion points

---

### 9.2 Professional Workflow
**Test Case:** Professional composer uses multi-view
**Expected Result:**
- Efficient workflow
- Minimal friction
- Advanced features accessible
- Performance adequate

**Test Sequence:**
1. Load complex composition
2. Edit across multiple views
3. Use keyboard shortcuts
4. Sync edits
5. Evaluate productivity

---

## 10. Success Criteria

All tests must pass with:

- **Performance:** 60fps rendering with 3 views and 1000 notes
- **Memory:** <250MB with 3 active views
- **Latency:** <16ms to propagate edits across views
- **Reliability:** 99.9% crash-free sessions
- **Usability:** 4.5+ stars for split-view workflow

---

## Test Execution Priority

**P0 (Critical):**
- 1.2, 1.4 (Basic splits)
- 2.1, 2.2 (Dynamic layout)
- 4.1, 4.2 (Synchronization)
- 5.1, 5.2 (Performance)

**P1 (High):**
- 1.3, 2.3, 2.4
- 3.1, 3.2
- 4.3, 4.4
- 6.1, 6.2

**P2 (Medium):**
- 1.1, 2.1, 3.3
- 5.3, 5.4
- 6.3, 6.4
- 7.1, 7.2

**P3 (Low):**
- 8.1, 8.2
- 9.1, 9.2
- 7.3

---

## Automated Testing

Where possible, these scenarios should be automated using:
- XCTest for unit tests
- XCUITest for UI tests
- Performance testing with Instruments
- Memory leak detection

---

## Conclusion

These test scenarios ensure the multi-view notation system meets quality standards for professional music production workflows.
