# Sheet Music Rendering Plan - White Room DAW

## Executive Summary

This document evaluates sheet music rendering options for White Room DAW and provides a recommendation with implementation timeline. Sheet music (standard notation) is essential for classical, jazz, and professional music production workflows.

---

## 1. Rendering Options Analysis

### Option 1: Custom CoreGraphics Renderer (Swift Native)

**Approach:**
Build a Swift-native sheet music renderer using CoreGraphics and SwiftUI Canvas.

**Pros:**
- Full control over rendering pipeline
- Native performance (60fps)
- Deep integration with SwiftUI
- No external dependencies
- Customizable for White Room's design system
- Can leverage Apple Pencil for input

**Cons:**
- High development cost (200-300 hours)
- Complex music engraving rules
- Must implement all notation elements from scratch
- Ongoing maintenance burden
- Risk of engraving quality issues

**Estimated Timeline:**
- Phase 1 (Basic): 120 hours - Notes, rests, staff, clefs
- Phase 2 (Advanced): 100 hours - Beams, ties, slurs, dynamics
- Phase 3 (Polish): 80 hours - Typography, spacing, layout
- **Total: 300 hours (7-8 weeks)**

**Development Cost:** \$30,000-\$50,000

**Quality Risk:** High - Music engraving is subtle and complex

---

### Option 2: VexFlow via WKWebView (JavaScript Bridge)

**Approach:**
Use VexFlow (industry-standard JavaScript notation library) rendered in WKWebView with Swift-JavaScript bridge.

**Pros:**
- VexFlow is mature and battle-tested
- Supports advanced notation (tuplets, cross-staff, etc.)
- Active community and maintenance
- Rapid implementation (40-60 hours)
- Proven engraving quality

**Cons:**
- WebView performance overhead
- JavaScript ↔ Swift bridge complexity
- Limited control over rendering
- WebView UI integration challenges
- Memory overhead (browser engine)
- Apple Pencil support limited

**Estimated Timeline:**
- Integration: 20 hours - WKWebView setup, Swift bridge
- Features: 30 hours - Note entry, editing, scrolling
- Polish: 10 hours - UI integration, performance
- **Total: 60 hours (1.5-2 weeks)**

**Development Cost:** \$6,000-\$10,000

**Quality Risk:** Low - VexFlow is production-proven

---

### Option 3: MusicXML + External Renderer (MuseScore/LilyPond)

**Approach:**
Export to MusicXML, render with external engine, display as static images or PDF.

**Pros:**
- Highest engraving quality (MuseScore)
- Zero custom rendering logic
- Standard format compatibility

**Cons:**
- Not real-time (rendering lag)
- Poor editing experience
- File I/O overhead
- Limited interactivity
- External dependency (MuseScore CLI)
- Memory intensive (image caching)

**Estimated Timeline:**
- Integration: 30 hours - MusicXML export, MuseScore CLI
- Rendering: 20 hours - Image generation, caching
- UI: 20 hours - Display, zooming, panning
- **Total: 70 hours (2 weeks)**

**Development Cost:** \$7,000-\$12,000

**Quality Risk:** Medium - Real-time editing challenges

---

### Option 4: Swift Music Notation Library

**Approach:**
Evaluate and integrate existing Swift notation libraries.

**Available Libraries:**
- **MusicNotationCore**: Notation model, no rendering
- **No mature Swift rendering libraries exist**

**Pros:**
- Native Swift
- Potential community contributions

**Cons:**
- No complete rendering libraries available
- Would still need custom renderer
- Less mature than VexFlow

**Estimated Timeline:** Same as Option 1 (300 hours)

---

### Option 5: Hybrid Approach (Recommended)

**Approach:**
VexFlow for rendering + Custom Swift UI for editing and performance optimization.

**Architecture:**
```
SwiftUI Layer (Native)
├── Note editing gestures
├── Selection and manipulation
├── Playback cursor
├── Zooming and scrolling
└── Performance optimization

WKWebView Layer (VexFlow)
├── Staff rendering
├── Note/rest drawing
├── Beaming and ties
├── Advanced notation
└── SVG output

Swift-JavaScript Bridge
├── Note data sync
├── Viewport coordination
├── Event handling
└── State management
```

**Pros:**
- Best of both worlds
- Fast implementation (80-100 hours)
- Proven engraving quality
- Native feel with SwiftUI overlay
- Can migrate to native renderer later
- Apple Pencil support via overlay

**Cons:**
- More complex architecture
- Two rendering systems to coordinate
- WebView memory overhead

**Estimated Timeline:**
- Phase 1 (VexFlow Integration): 40 hours
- Phase 2 (SwiftUI Overlay): 30 hours
- Phase 3 (Performance): 20 hours
- **Total: 90 hours (2-3 weeks)**

**Development Cost:** \$9,000-\$15,000

**Quality Risk:** Low - VexFlow proven + SwiftUI polish

---

## 2. Recommended Implementation: Hybrid Approach

### 2.1 Architecture Details

#### Swift Layer (User Interaction)
```swift
struct SheetMusicEditor: View {
    @StateObject private var viewModel: SheetMusicViewModel
    @StateObject private var bridge: VexFlowBridge

    var body: some View {
        ZStack {
            // VexFlow rendering (background)
            VexFlowView(bridge: bridge)
                .allowsHitTesting(false)

            // SwiftUI interaction layer (foreground)
            InteractionOverlay(viewModel: viewModel)
                .gesture(
                    DragGesture()
                        .onChanged { viewModel.handleDrag($0) }
                )
                .onTapGesture { location in
                    viewModel.handleTap(location)
                }
        }
    }
}
```

#### JavaScript Bridge (VexFlow)
```javascript
// VexFlowBridge.js
class VexFlowBridge {
    constructor() {
        this.renderer = new Vex.Flow.Renderer(
            document.getElementById('output'),
            Vex.Flow.Renderer.Backends.SVG
        );
        this.context = this.renderer.getContext();
    }

    renderStave(notes, options) {
        const stave = new Vex.Flow.Stave(10, 40, 500);
        stave.addClef("treble").setContext(this.context).draw();

        const voice = new Vex.Flow.Voice({num_beats: 4,  beat_value: 4});
        voice.addTickables(notes.map(n => this.createNote(n)));

        new Vex.Flow.Formatter()
            .joinVoices([voice])
            .format([voice], 450);

        voice.draw(this.context, stave);
    }

    createNote(noteData) {
        return new Vex.Flow.StaveNote({
            keys: [`${noteData.pitch}/${noteData.octave}`],
            duration: noteData.duration,
            clef: "treble",
            auto_stem: true
        });
    }
}
```

#### Swift-JavaScript Bridge
```swift
class VexFlowBridge: ObservableObject {
    private var webView: WKWebView
    private var bridgeHandler: ScriptMessageHandler

    func renderNotes(_ notes: [UniversalNote]) {
        let jsonData = try! JSONEncoder().encode(notes)
        let jsonString = String(data: jsonData, encoding: .utf8)!

        webView.evaluateJavaScript("bridge.renderStave(\(jsonString))") { result, error in
            if let error = error {
                print("VexFlow rendering error: \(error)")
            }
        }
    }

    func handleTap(at location: CGPoint) -> UniversalNote? {
        // Convert screen coordinates to musical position
        // Query VexFlow for note at location
        // Return UniversalNote for editing
        return nil
    }
}
```

---

### 2.2 Feature Implementation Plan

#### Phase 1: Basic Rendering (Week 1)
- [ ] VexFlow integration via WKWebView
- [ ] Basic staff drawing (treble clef)
- [ ] Note rendering (quarter, half, whole)
- [ ] Rest rendering
- [ ] Time signature support (4/4, 3/4)
- [ ] Basic Swift-JavaScript bridge

#### Phase 2: Note Editing (Week 2)
- [ ] Tap to add notes
- [ ] Drag to move notes
- [ ] Velocity editing (staccato, accent)
- [ ] Duration editing
- [ ] Note deletion
- [ ] Selection and multi-edit
- [ ] Undo/redo integration

#### Phase 3: Advanced Notation (Week 3)
- [ ] Key signatures (all major/minor)
- [ ] Multiple clefs (bass, alto, tenor)
- [ ] Grand staff (piano)
- [ ] Beaming (automatic and manual)
- [ ] Ties and slurs
- [ ] Dynamics (pp, p, mp, mf, f, ff)
- [ ] Articulations (staccato, accent, tenuto)

#### Phase 4: Layout and Formatting (Week 4)
- [ ] Page layout optimization
- [ ] Measure wrapping
- [ ] System breaks
- [ ] Spacing adjustments
- [ ] Typography refinement
- [ ] PDF export

#### Phase 5: Performance and Polish (Week 5)
- [ ] Rendering optimization (virtualization)
- [ ] Smooth zooming and scrolling
- [ ] Playback cursor overlay
- [ ] Apple Pencil integration
- [ ] Keyboard shortcuts
- [ ] Accessibility (VoiceOver)

---

## 3. Notation Requirements Checklist

### Essential (MVP)
- [x] Staff lines (5 lines per staff)
- [x] Clefs (treble, bass)
- [x] Notes (whole, half, quarter, eighth, sixteenth)
- [x] Rests (all durations)
- [x] Time signatures (4/4, 3/4, 6/8, etc.)
- [x] Key signatures (all major/minor keys)
- [x] Note positioning (pitch and timing)
- [x] Note stems (automatic direction)
- [x] Basic beaming

### Important (Professional)
- [x] Grand staff (treble + bass)
- [x] Multiple staves (instruments)
- [x] Advanced beaming (cross-beam, subdivisions)
- [x] Ties and slurs
- [x] Dynamics (pp to ff)
- [x] Articulations (staccato, accent, tenuto, marcato)
- [x] Triplets and tuplets
- [x] Grace notes
- [x] Accidentals (sharp, flat, natural, double sharp/flat)
- [x] Ledger lines
- [x] Measure numbering

### Advanced (Complete)
- [x] Alto and tenor clefs
- [x] Percussion clef
- [x] Tablature staff (optional)
- [x] Lyrics support
- [x] Chord symbols
- [x] Repeat signs and codas
- [x] Key and time signature changes
- [x] Tempo markings
- [x] Expression text
- [x] Crescendo/decrescendo hairpins
- [x] Arpeggios and glissandos
- [x] Tremolos
- [x] Trills and ornaments
- [x] Octave shifts (8va, 15ma)
- [x] Polyrhythms
- [x] Microtonal notation

---

## 4. Export Formats

### MusicXML Export (Essential)
```swift
func exportToMusicXML(_ song: Song) -> String {
    var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
    xml += "<!DOCTYPE score-partwise PUBLIC \"-//Recordare//DTD MusicXML 3.1 Partwise//EN\" \"http://www.musicxml.org/dtds/partwise.dtd\">\n"
    xml += "<score-partwise version=\"3.1\">\n"

    // Write part list
    xml += "<part-list>\n"
    for track in song.tracks {
        xml += "<score-part id=\"\(track.id)\">\n"
        xml += "<part-name>\(track.name)</part-name>\n"
        xml += "</score-part>\n"
    }
    xml += "</part-list>\n"

    // Write notes for each track
    for track in song.tracks {
        xml += "<part id=\"\(track.id)\">\n"
        for measure in parseMeasures(from: track.notes) {
            xml += "<measure number=\"\(measure.number)\">\n"
            xml += "<attributes>\n"
            xml += "<divisions>1</divisions>\n"
            xml += "<key><fifths>\(measure.keySignature)</fifths></key>\n"
            xml += "<time><beats>\(measure.timeSignature.numerator)</beats><beat-type>\(measure.timeSignature.denominator)</beat-type></time>\n"
            xml += "<clef><sign>G</sign><line>2</line></clef>\n"
            xml += "</attributes>\n"

            for note in measure.notes {
                xml += "<note>\n"
                xml += "<pitch><step>\(note.step)</step><octave>\(note.octave)</octave></pitch>\n"
                xml += "<duration>\(note.duration)</duration>\n"
                xml += "<type>\(note.noteType)</type>\n"
                xml += "</note>\n"
            }

            xml += "</measure>\n"
        }
        xml += "</part>\n"
    }

    xml += "</score-partwise>"
    return xml
}
```

### PDF Export (Important)
Use VexFlow's SVG export + Safari PDF generation, or integrate with a C library like `libharu`.

### MIDI Export (Essential)
Already supported by White Room's MIDI engine.

### ABC Notation (Nice to Have)
Simple text-based notation format for folk/traditional music.

---

## 5. Performance Optimization

### 5.1 Virtualization
Only render visible measures:
```swift
struct SheetMusicVirtualizedList: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(visibleMeasures, id: \.id) { measure in
                    MeasureView(measure: measure)
                        .frame(height: measureHeight)
                }
            }
        }
    }

    private var visibleMeasures: [Measure] {
        let viewport = scrollView.visibleRect
        return measures.filter { measure in
            measure.frame.intersects(viewport)
        }
    }
}
```

### 5.2 Caching
Cache rendered SVGs:
```swift
class MeasureCache {
    private var cache = NSCache<NSString, SVGImage>()

    func getCachedMeasure(_ measureId: UUID) -> SVGImage? {
        return cache.object(forKey: measureId.uuidString as NSString)
    }

    func cacheMeasure(_ measureId: UUID, image: SVGImage) {
        cache.setObject(image, forKey: measureId.uuidString as NSString)
    }
}
```

### 5.3 Rendering Pipeline
```
User Input → SwiftUI → Bridge → VexFlow → SVG → Display
     ↑                                                      ↓
     └────────────────── 16ms (60fps) ←────────────────────┘
```

---

## 6. Integration with White Room

### 6.1 Data Flow
```
UniversalNote (White Room)
    ↓ convertToSheetMusic()
SheetNote (VexFlow format)
    ↓ VexFlowBridge.render()
SVG (displayed in WKWebView)
    ↓ overlay
SwiftUI Interaction Layer
    ↓ edit events
UniversalNote (updated)
```

### 6.2 Synchronization
Real-time sync with piano roll and tablature:
```swift
class NotationSyncManager {
    func syncNoteEdit(_ edit: NoteEdit) {
        // Update universal note
        let universalNote = applyEdit(edit)

        // Update all active views
        pianoRollView.updateNote(universalNote)
        tablatureView.updateNote(universalNote)
        sheetMusicView.updateNote(universalNote)
    }
}
```

---

## 7. Testing Strategy

### Unit Tests
- Note conversion to/from VexFlow format
- MusicXML export validation
- Measure layout calculations

### Integration Tests
- VexFlow bridge communication
- SwiftUI overlay gesture handling
- Multi-view synchronization

### Visual Tests
- Screenshot comparison for rendering quality
- Manual review by musician

### Performance Tests
- Rendering time for 1000+ notes
- Memory usage with large scores
- Scrolling and zooming frame rate

---

## 8. Success Metrics

- **Rendering Quality:** Professional engraving standards
- **Performance:** 60fps with 500+ notes visible
- **Latency:** <50ms from edit to visual update
- **Memory:** <150MB for typical song (50 measures)
- **User Satisfaction:** 4.5+ stars for notation editing

---

## 9. Risk Mitigation

### Risk 1: VexFlow WebView Performance
**Mitigation:**
- Aggressive caching
- Virtualization (render only visible)
- SVG pre-rendering
- Fallback to simplified rendering

### Risk 2: Swift-JavaScript Bridge Complexity
**Mitigation:**
- Well-defined protocol
- Comprehensive error handling
- Extensive logging
- Fallback for failed renders

### Risk 3: Apple Pencil Support
**Mitigation:**
- SwiftUI overlay for pencil input
- Pressure sensitivity for dynamics
- Palm rejection
- Gesture recognition

### Risk 4: MusicXML Export Quality
**Mitigation:**
- Test with multiple applications
- Validate against MusicXML DTD
- User testing with import/export workflows

---

## 10. Migration Path to Native Renderer

Future plan to replace VexFlow with native CoreGraphics renderer:

### Phase 1: Parallel Development (Months 6-12)
- Build native renderer alongside VexFlow
- A/B testing for quality and performance
- Feature parity validation

### Phase 2: Gradual Migration (Months 12-18)
- Switch to native for simple scores
- Keep VexFlow for complex notation
- Performance comparison

### Phase 3: Full Native (Months 18-24)
- Complete migration to native renderer
- Remove VexFlow dependency
- WebView overhead eliminated

---

## 11. Cost-Benefit Analysis

| Option | Development Time | Cost | Quality Risk | Performance |
|--------|-----------------|------|--------------|-------------|
| Custom CoreGraphics | 300 hrs | \$40k | High | Excellent |
| VexFlow Bridge | 60 hrs | \$8k | Low | Good |
| MusicXML + External | 70 hrs | \$10k | Medium | Poor |
| **Hybrid (Recommended)** | **90 hrs** | **\$12k** | **Low** | **Good** |

---

## 12. Final Recommendation

**Adopt Hybrid Approach:**

1. **Short-term (Weeks 1-6):**
   - Integrate VexFlow via WKWebView
   - Build SwiftUI interaction overlay
   - Implement basic note editing
   - Add MusicXML export

2. **Medium-term (Months 2-3):**
   - Add advanced notation features
   - Optimize performance
   - Implement Apple Pencil support
   - Refine typography and layout

3. **Long-term (Months 6-24):**
   - Develop native CoreGraphics renderer
   - Gradual migration from VexFlow
   - Eliminate WebView dependency
   - Maximize performance

**This approach balances:**
- Speed to market (2-3 weeks for MVP)
- Proven engraving quality (VexFlow)
- Future-proofing (path to native)
- Cost-effectiveness (\$12k vs \$40k)
- Low risk (battle-tested components)

---

## 13. Next Steps

1. **Spike (Week 1):**
   - VexFlow proof-of-concept
   - WKWebView integration test
   - Performance benchmark

2. **MVP Development (Weeks 2-3):**
   - Basic rendering
   - Note editing
   - Sync with piano roll

3. **Beta Testing (Week 4):**
   - User feedback
   - Quality review
   - Performance tuning

4. **Production Launch (Week 5):**
   - Final polish
   - Documentation
   - Training materials

---

## Conclusion

The hybrid approach using VexFlow + SwiftUI overlay is the best choice for White Room DAW. It delivers professional sheet music rendering quickly and cost-effectively, with a clear path to a future native implementation. This strategy balances immediate user needs with long-term technical goals.
