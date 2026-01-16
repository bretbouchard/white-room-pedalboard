# Unified Notation System - Implementation Roadmap

## Executive Summary

This document provides a detailed implementation roadmap for White Room's unified notation system, including phases, dependencies, testing strategies, and risk mitigation.

---

## Phase 1: Core Architecture & Piano Roll Expansion

**Timeline:** Weeks 1-1.5 (5-10 hours)
**Status:** ✅ Complete (architecture), 🔄 In Progress (piano roll)

### 1.1 Core Architecture Design ✅

**Tasks:**
- [x] Design universal note data model
- [x] Define NotationView protocol
- [x] Create view registry system
- [x] Design layout manager
- [x] Specify synchronization system

**Deliverables:**
- [x] `UNIFIED_NOTATION_ARCHITECTURE.md` (comprehensive architecture doc)

**Acceptance Criteria:**
- ✅ Universal data model defined
- ✅ View abstraction layer specified
- ✅ Layout system designed
- ✅ Sync protocol defined

---

### 1.2 Piano Roll Expansion for iPad 🔄

**Tasks:**
- [x] Increase range from 3-5 octaves to 7-8 octaves (full 88-key range)
- [x] Make responsive to device size (iPad Pro vs iPad mini)
- [x] Add iPad-specific layout options
- [x] Optimize touch targets for iPad (60pt vs 44pt)
- [x] Support split-view container integration
- [ ] Add C note octave markers for iPad
- [ ] Optimize rendering for larger key range
- [ ] Test on physical iPad devices

**File:** `PianoRollEditor_iOS.swift`

**Deliverables:**
- [x] Expanded piano roll with 88-key range (C0-B7)
- [x] Responsive layout for iPhone/iPad
- [x] Device-optimized touch targets
- [ ] Performance benchmarks

**Acceptance Criteria:**
- [x] iPhone: 3 octaves (C3-B5)
- [x] iPad: 8 octaves (C0-B7)
- [x] Smooth scrolling with 96 keys
- [x] 60fps rendering
- [ ] <100ms to render full viewport
- [ ] <50MB memory usage

**Testing:**
- [ ] Unit tests for MIDI range calculations
- [ ] UI tests on iPad Pro 12.9", iPad Pro 11", iPad mini
- [ ] Performance tests with 1000+ notes
- [ ] Memory leak tests

**Risks:**
- **Risk:** Performance degradation with 88 keys
  **Mitigation:** Virtualization, lazy loading, optimized drawing
- **Risk:** Scrolling performance on older iPads
  **Mitigation:** Reduce visible range, cache rendering

**Completion:** 95% (testing pending)

---

## Phase 2: Tablature Editor

**Timeline:** Weeks 1.5-3 (40-60 hours)
**Status:** ✅ Design Complete, Ready for Implementation

### 2.1 Tablature View Core (20-30 hours)

**Tasks:**
- [ ] Create `TablatureEditor.swift` with basic rendering
- [ ] Implement string/fret grid drawing
- [ ] Add note entry via tap
- [ ] Implement note editing via drag
- [ ] Add note deletion
- [ ] Support selection (single, multi)
- [ ] Implement scroll and zoom

**File:** `TablatureEditor.swift` (design complete)

**Deliverables:**
- [ ] Working tablature view
- [ ] Note entry/editing
- [ ] Selection system
- [ ] Performance benchmarks

**Acceptance Criteria:**
- [ ] 4-12 strings configurable
- [ ] 12-24 frets visible
- [ ] Tap to add note
- [ ] Drag to move note
- [ ] 60fps rendering
- [ ] <50MB memory

**Testing:**
- [ ] Unit tests for string/fret calculations
- [ ] UI tests for note entry
- [ ] Performance tests with 500+ notes

---

### 2.2 Tuning System (10-15 hours)

**Tasks:**
- [ ] Implement configurable tuning per string
- [ ] Add preset tunings (standard, drop-D, open tunings, etc.)
- [ ] Create custom tuning editor
- [ ] Add capo support
- [ ] Implement tuning validation

**Acceptance Criteria:**
- [ ] 8+ preset tunings
- [ ] Custom tuning creation
- [ ] Capo 0-12
- [ ] MIDI pitch calculation correct

---

### 2.3 Technique Notation (10-15 hours)

**Tasks:**
- [ ] Add hammer-on notation
- [ ] Add pull-off notation
- [ ] Add slide notation
- [ ] Add bend notation
- [ ] Add vibrato notation
- [ ] Add let ring notation
- [ ] Create technique palette

**Acceptance Criteria:**
- [ ] All 6 techniques render
- [ ] Technique symbols visible
- [ ] Technique persists on save/load

---

### 2.4 Instrument Presets (Optional - 5-10 hours)

**Tasks:**
- [ ] Guitar (6-string)
- [ ] Bass (4-string)
- [ ] Ukulele (4-string)
- [ ] Banjo (5-string)
- [ ] Mandolin (4-string)

**Acceptance Criteria:**
- [ ] All presets working
- [ ] Correct string count
- [ ] Correct default tuning

---

### Phase 2 Testing Strategy

**Unit Tests:**
- Note position to screen coordinate conversion
- Screen coordinate to note position conversion
- MIDI pitch to fret/string calculation
- Fret/string to MIDI pitch calculation

**Integration Tests:**
- Note entry adds to universal note model
- Note editing updates universal note model
- Sync with piano roll works

**UI Tests:**
- Tap adds note at correct position
- Drag moves note correctly
- Technique menu applies technique

**Performance Tests:**
- 60fps with 500 notes
- <100ms to render full view
- <50MB memory usage

**Risks:**
- **Risk:** Fret/string calculation errors
  **Mitigation:** Comprehensive unit tests, validation
- **Risk:** Performance with many notes
  **Mitigation:** Virtualization, caching

**Completion:** 0% (design complete, ready to implement)

---

## Phase 3: Sheet Music Rendering (MVP)

**Timeline:** Weeks 4-8 (80-120 hours)
**Status:** 🔜 Design Complete, Ready to Start

### 3.1 Rendering Engine Selection ✅

**Decision:** Hybrid approach (VexFlow + SwiftUI overlay)

**Rationale:**
- Fast implementation (60 hours vs 300 hours for native)
- Proven engraving quality
- Low risk
- Future path to native renderer

**Document:** `SHEET_MUSIC_RENDERING_PLAN.md`

---

### 3.2 VexFlow Integration (20 hours)

**Tasks:**
- [ ] Set up WKWebView with VexFlow
- [ ] Create Swift-JavaScript bridge
- [ ] Implement basic staff rendering
- [ ] Add note rendering (whole, half, quarter)
- [ ] Add rest rendering
- [ ] Implement time signatures (4/4, 3/4)
- [ ] Add key signatures (C, G, D, F, Bb)

**Acceptance Criteria:**
- [ ] Staff renders correctly
- [ ] Notes render at correct pitch
- [ ] Time signatures work
- [ ] Key signatures work
- [ ] <100ms to render 4 measures

---

### 3.3 SwiftUI Interaction Layer (15 hours)

**Tasks:**
- [ ] Create SwiftUI overlay for gestures
- [ ] Implement tap to add note
- [ ] Implement drag to move note
- [ ] Add velocity editing
- [ ] Implement duration editing
- [ ] Add note deletion
- [ ] Create selection system

**Acceptance Criteria:**
- [ ] Tap adds note at correct pitch/time
- [ ] Drag moves note smoothly
- [ ] Velocity slider works
- [ ] Duration popup works
- [ ] <50ms gesture response time

---

### 3.4 Advanced Notation Features (25 hours)

**Tasks:**
- [ ] Add multiple clefs (treble, bass, alto)
- [ ] Implement grand staff (piano)
- [ ] Add beaming (automatic)
- [ ] Implement ties and slurs
- [ ] Add dynamics (pp, p, mp, mf, f, ff)
- [ ] Add articulations (staccato, accent, tenuto)
- [ ] Implement triplets and tuplets

**Acceptance Criteria:**
- [ ] Grand staff renders
- [ ] Beams correct
- [ ] Ties connect notes
- [ ] Dynamics symbols visible
- [ ] Articulations work

---

### 3.5 Layout and Formatting (15 hours)

**Tasks:**
- [ ] Implement measure wrapping
- [ ] Add system breaks
- [ ] Optimize spacing
- [ ] Add page layout
- [ ] Implement zooming
- [ ] Add smooth scrolling

**Acceptance Criteria:**
- [ ] Measures wrap correctly
- [ ] Spacing looks professional
- [ ] Zoom is smooth (60fps)
- [ ] Scrolling is smooth (60fps)

---

### 3.6 Export Formats (10 hours)

**Tasks:**
- [ ] MusicXML export
- [ ] PDF export
- [ ] MIDI export (already exists)
- [ ] ABC notation export (optional)

**Acceptance Criteria:**
- [ ] MusicXML valid
- [ ] PDF renders correctly
- [ ] Export completes <1s

---

### Phase 3 Testing Strategy

**Unit Tests:**
- Note to VexFlow format conversion
- MusicXML generation
- Measure layout calculations

**Integration Tests:**
- VexFlow bridge communication
- SwiftUI overlay gestures
- Sync with piano roll and tablature

**Visual Tests:**
- Screenshot comparison
- Manual musician review
- Engraving quality assessment

**Performance Tests:**
- 60fps with 500 notes visible
- <150ms to render page
- <150MB memory usage

**Risks:**
- **Risk:** VexFlow WebView performance
  **Mitigation:** Caching, virtualization, SVG pre-rendering
- **Risk:** Swift-JavaScript bridge complexity
  **Mitigation:** Well-defined protocol, comprehensive error handling
- **Risk:** Apple Pencil support limited
  **Mitigation:** SwiftUI overlay for pencil input

**Completion:** 0% (ready to start)

---

## Phase 4: Split-View System

**Timeline:** Weeks 9-10 (30-40 hours)
**Status:** ✅ Design Complete, Ready to Implement

### 4.1 Layout Manager (10 hours)

**Tasks:**
- [ ] Implement LayoutManager class
- [ ] Create layout presets (50/50, 60/40, 70/30, 3-way)
- [ ] Implement slot calculation
- [ ] Add layout persistence
- [ ] Create layout picker UI

**File:** `IPAD_SPLIT_VIEW_DESIGN.md` (design complete)

**Acceptance Criteria:**
- [ ] All presets calculate correctly
- [ ] Layout saves/restores
- [ ] Layout picker works

---

### 4.2 Multi-View Container (10 hours)

**Tasks:**
- [ ] Create MultiViewNotationContainer
- [ ] Implement view rendering
- [ ] Add view coordination
- [ ] Implement view swapping
- [ ] Add view closing

**Acceptance Criteria:**
- [ ] 2 views render simultaneously
- [ ] 3 views render simultaneously
- [ ] Views sync correctly
- [ ] 60fps rendering

---

### 4.3 Resize Handles (8 hours)

**Tasks:**
- [ ] Implement SplitViewDivider
- [ ] Add drag gesture
- [ ] Implement slot recalculation
- [ ] Add haptic feedback
- [ ] Add visual feedback

**Acceptance Criteria:**
- [ ] Dragging smoothly resizes views
- [ ] Haptic feedback on drag
- [ ] Visual indicator during drag
- [ ] Views maintain aspect ratios

---

### 4.4 View Registry (5 hours)

**Tasks:**
- [ ] Implement NotationViewRegistry
- [ ] Create view picker sheet
- [ ] Add view type registration
- [ ] Implement view creation
- [ ] Add view activation/deactivation

**Acceptance Criteria:**
- [ ] All view types registered
- [ ] View picker shows available views
- [ ] View creation works
- [ ] View activation works

---

### 4.5 State Synchronization (7 hours)

**Tasks:**
- [ ] Implement NotationViewStateManager
- [ ] Add selection sync
- [ ] Implement playback position sync
- [ ] Add note edit sync
- [ ] Create notification system

**Acceptance Criteria:**
- [ ] Selection syncs across views
- [ ] Playback cursor syncs
- [ ] Note edits sync
- [ ] <16ms sync latency

---

### Phase 4 Testing Strategy

**Unit Tests:**
- Layout calculation accuracy
- Divider offset handling
- State synchronization

**Integration Tests:**
- Multi-view rendering
- View switching
- Sync propagation

**UI Tests:**
- Layout preset application
- Divider dragging
- Multi-view editing

**Performance Tests:**
- 60fps with 3 views
- <250MB memory usage
- <16ms sync latency

**Risks:**
- **Risk:** Performance with 3 views
  **Mitigation:** Lazy loading, view recycling, optimization
- **Risk:** Sync conflicts
  **Mitigation:** Well-defined sync protocol, conflict resolution

**Completion:** 0% (design complete, ready to implement)

---

## Phase 5: Additional Notation Views

**Timeline:** Ongoing (Weeks 11+)
**Status:** ❌ Not Started

### 5.1 Drum Grid Editor (25-35 hours)

**Priority:** P1 - Essential for rhythm production

**Tasks:**
- [ ] Design drum grid interface
- [ ] Implement drum map
- [ ] Add pattern editing
- [ ] Implement velocity per step
- [ ] Add swing/groove
- [ ] Create pattern chaining

**Dependencies:** None

**Risk:** Low (well-established pattern)

---

### 5.2 MIDI Event List (15-20 hours)

**Priority:** P1 - Precision editing

**Tasks:**
- [ ] Create event list view
- [ ] Implement inline editing
- [ ] Add event filtering
- [ ] Implement copy/paste
- [ ] Add event insertion/deletion

**Dependencies:** None

**Risk:** Low (straightforward implementation)

---

### 5.3 Arrangement View (30-40 hours)

**Priority:** P1 - Song organization

**Tasks:**
- [ ] Design timeline interface
- [ ] Implement track headers
- [ ] Add section markers
- [ ] Create clip representation
- [ ] Implement drag-and-drop
- [ ] Add automation lanes

**Dependencies:** None

**Risk:** Medium (complex UI)

---

### 5.4 Step Sequencer (25-35 hours)

**Priority:** P1 - Electronic music production

**Tasks:**
- [ ] Design grid interface
- [ ] Implement step editing
- [ ] Add velocity per step
- [ ] Implement probability
- [ ] Add swing/groove
- [ ] Create scale lock

**Dependencies:** None

**Risk:** Low (well-established pattern)

---

## Testing Strategy Overview

### Unit Testing
- Note conversions between views
- Sync manager change propagation
- Layout calculations
- MIDI pitch calculations
- Tuning calculations

### Integration Testing
- Multi-view synchronization
- View registry operations
- State management
- Data flow

### UI Testing
- Note editing in different views
- Layout switching
- Resize handle dragging
- View picker navigation
- Gesture handling

### Performance Testing
- Rendering frame rate (target: 60fps)
- Memory usage (target: <250MB for 3 views)
- Sync latency (target: <16ms)
- Note rendering (target: <100ms for 500 notes)

### Visual Testing
- Screenshot comparison
- Manual musician review
- Engraving quality assessment
- Typography review

---

## Risk Management

### High-Risk Areas

1. **VexFlow Performance**
   - **Risk:** WebView overhead, slow rendering
   - **Mitigation:** Aggressive caching, virtualization, SVG pre-rendering
   - **Contingency:** Simplified rendering, fallback to static images

2. **Multi-View Sync**
   - **Risk:** Conflicting edits, state corruption
   - **Mitigation:** Immutable data, optimistic updates, conflict resolution
   - **Contingency:** Single-view mode fallback

3. **Piano Roll Performance**
   - **Risk:** 88-key rendering slow
   - **Mitigation:** Virtualization, lazy loading, optimized drawing
   - **Contingency:** Reduced range option

### Medium-Risk Areas

1. **Tablature Tuning**
   - **Risk:** Incorrect pitch calculations
   - **Mitigation:** Comprehensive unit tests, validation
   - **Contingency:** Preset-only tunings

2. **Split-View Layouts**
   - **Risk:** Incorrect slot calculations
   - **Mitigation:** Extensive testing, visual validation
   - **Contingency:** Fixed layouts only

### Low-Risk Areas

1. **View Registry**
   - **Risk:** View registration failures
   - **Mitigation:** Type-safe protocol, error handling
   - **Contingency:** Manual view instantiation

2. **State Management**
   - **Risk:** State inconsistencies
   - **Mitigation:** Single source of truth, Combine publishers
   - **Contingency:** Manual state synchronization

---

## Dependencies

### External Dependencies

- **VexFlow 4.x:** JavaScript notation library
- **WebKit:** WKWebView for VexFlow rendering
- **SwiftUI:** Native UI framework
- **Combine:** Reactive programming

### Internal Dependencies

- **Universal Note Model:** All views depend on this
- **NotationSyncManager:** Multi-view sync requires this
- **LayoutManager:** Split-view requires this
- **NotationViewRegistry:** All views must register

### Platform Dependencies

- **iOS 15+:** For SwiftUI advanced features
- **iPadOS 15+:** For split-view multitasking
- **Mac (future):** For macOS version

---

## Success Metrics

### Phase 1 (Piano Roll)
- [x] 88-key range (C0-B7)
- [x] Responsive layout (iPhone/iPad)
- [ ] 60fps rendering
- [ ] <100ms render time
- [ ] <50MB memory

### Phase 2 (Tablature)
- [ ] 4-12 strings
- [ ] 8+ preset tunings
- [ ] Note entry/editing
- [ ] Technique notation
- [ ] 60fps rendering
- [ ] <50MB memory

### Phase 3 (Sheet Music)
- [ ] Basic staff rendering
- [ ] Note/rest rendering
- [ ] Time/key signatures
- [ ] Grand staff
- [ ] Dynamics and articulations
- [ ] MusicXML export
- [ ] 60fps rendering
- [ ] <150MB memory

### Phase 4 (Split-View)
- [ ] 2-way splits (50/50, 60/40, 70/30)
- [ ] 3-way splits (33/33/33, 50/25/25)
- [ ] Resize handles
- [ ] View synchronization
- [ ] 60fps rendering
- [ ] <250MB memory
- [ ] <16ms sync latency

### Overall System
- [ ] 3+ notation views
- [ ] Real-time sync
- [ ] <250MB memory (3 views)
- [ ] 60fps rendering
- [ ] <16ms edit latency
- [ ] 4.5+ star user rating

---

## Timeline Summary

| Phase | Duration | Hours | Status |
|-------|----------|-------|--------|
| Phase 1: Architecture | 1 week | 10 | ✅ Complete |
| Phase 1: Piano Roll | 0.5 week | 5 | 🔄 95% |
| Phase 2: Tablature | 1.5 weeks | 60 | 🔜 Ready |
| Phase 3: Sheet Music | 5 weeks | 85 | 🔜 Ready |
| Phase 4: Split-View | 2 weeks | 40 | 🔜 Ready |
| **Total (Core)** | **10 weeks** | **200 hours** | **In Progress** |

**Future Phases:**
- Phase 5: Additional Views (ongoing, 100+ hours each)
- Phase 6: Native Renderer (months 6-12, 300 hours)
- Phase 7: Advanced Features (ongoing)

---

## Recommendations for Immediate Implementation

### Priority 1 (This Week)
1. **Complete Piano Roll Testing**
   - Test on physical iPads
   - Performance benchmarks
   - Memory profiling
   - Bug fixes

### Priority 2 (Weeks 2-3)
1. **Implement Tablature Editor**
   - Core rendering (20 hours)
   - Tuning system (10 hours)
   - Technique notation (10 hours)
   - Testing (10 hours)

### Priority 3 (Weeks 4-8)
1. **Implement Sheet Music (MVP)**
   - VexFlow integration (20 hours)
   - SwiftUI overlay (15 hours)
   - Basic features (25 hours)
   - Testing (10 hours)

### Priority 4 (Weeks 9-10)
1. **Implement Split-View System**
   - Layout manager (10 hours)
   - Multi-view container (10 hours)
   - Resize handles (8 hours)
   - State sync (7 hours)
   - Testing (5 hours)

---

## Conclusion

This roadmap provides a clear path to implementing White Room's unified notation system. The phased approach balances speed to market (10 weeks for core features) with quality and extensibility.

**Key Success Factors:**
1. Follow the architecture strictly
2. Implement comprehensive testing
3. Optimize for performance early
4. Gather user feedback continuously
5. Iterate based on real-world usage

**Next Steps:**
1. Complete piano roll testing
2. Begin tablature implementation
3. Set up VexFlow proof-of-concept
4. Create detailed task breakdowns

The unified notation system will be a powerful differentiator for White Room DAW, enabling musicians to work in the notation views that suit their workflow while maintaining perfect synchronization across all views.
