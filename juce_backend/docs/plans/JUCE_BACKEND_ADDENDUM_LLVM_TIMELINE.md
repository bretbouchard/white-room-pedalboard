JUCE Backend Team — Architecture Addendum

Single Transport · Multi-Song Graph · LLVM-Style Execution

Status: Additive clarification
Impact: Low risk, high leverage
No existing DSP work is invalidated

---

0. Executive Summary (Read This First)

We are formalizing the system as a compiler-style pipeline:
- SDK = semantic authority (IR + rules)
- JUCE = execution backend
- One global transport
- Multiple Song graphs evaluated against it

JUCE owns time and audio execution.
JUCE does not invent musical meaning.

---

1. Core Rule (Non-Negotiable)

JUCE owns time.
It never defines musical structure.

If JUCE code is deciding what should play rather than when it plays, that logic is in the wrong layer.

---

2. Transport Model (Critical)

There is exactly:
- One transport
- One tempo grid
- One clock

There are many songs, but they are evaluated, not independently played.

🚫 No per-song transports
🚫 No resync logic
🚫 No drift correction

---

3. What JUCE Will Receive from the SDK

JUCE will consume:
- TimelineModel
- TimelineDiff
- Symbolic EvaluatedEvents per scheduling window

JUCE will not receive:
- per-song clocks
- per-song playheads
- scheduling instructions
- audio-level data

---

4. Execution Loop (Authoritative)

The JUCE audio loop becomes:

1. Advance global transport
2. Request evaluated events for next window
3. Map events → voices / DSP graph
4. Apply gains, fades, routing
5. Render audio

This replaces any notion of syncing multiple transports.

---

5. Song Instances (Runtime Mapping)

Each SongInstance maps to:
- a voice group
- a bus or subgraph
- a gain / fade envelope

All instances:
- share the same clock
- share the same buffer timeline
- respect the same tempo grid

---

6. Crossfades & DJ-Style Transitions

Crossfades are:
- expressed as TimelineDiffs
- evaluated deterministically by the SDK
- executed as gain automation in JUCE

JUCE must not invent fade curves or timing logic beyond execution.

---

7. Interaction Rules (Execution Role)

Interaction rules are semantic outputs, not JUCE heuristics.

JUCE must:
- execute density / energy limits
- apply sidechain-style reductions if instructed
- enforce constraints mechanically

JUCE must not:
- reinterpret rules
- guess intent
- silently "fix" illegal states

If a diff is invalid → reject it.

---

8. Console / Bus Architecture Alignment

This model aligns directly with ConsoleX:
- Each song instance feeds channels
- Channels route to buses
- Buses mix normally
- Master bus remains authoritative

No special transport logic is required.

---

9. Automation & Parameter Control

JUCE must support:
- automation on any console parameter
- sample-accurate execution where possible
- deterministic playback from symbolic control data

SDK defines what changes.
JUCE defines how precisely it executes.

---

10. What JUCE Must Explicitly Avoid

🚫 Multiple clocks
🚫 Per-song scheduling
🚫 Transport ownership leaks
🚫 Structural mutation of models
🚫 Semantic assumptions

If you are writing:

syncSongToTransport()

stop — that is a violation.

---

11. Error Handling Contract

- Illegal diffs are rejected
- Execution errors are surfaced
- No silent fallbacks
- No auto-repair of structure

Failure should be:
- explicit
- inspectable
- non-destructive

---

12. Repository Direction (High-Level)

JUCE should conceptually sit at:

schillinger/
├── core/           // IR + rules (SDK-owned)
├── bindings/
├── sdk-swift/
└── engine-juce/    // time, DSP, execution

JUCE must depend on:
- core schema
- bindings

JUCE must not be depended on by core.

---

13. Determinism Expectations

JUCE execution must:
- be reproducible given same inputs
- respect SDK-defined seeds
- not introduce nondeterministic ordering

Realtime variance is acceptable.
Structural variance is not.

---

14. One-Sentence Law (Put This in JUCE README)

JUCE executes time and sound.
It never defines musical meaning.

---

15. Final Alignment Check

JUCE is correctly aligned if:
- There is only one transport
- Songs do not own clocks
- All structure comes from SDK
- All execution is deterministic given inputs
- ConsoleX remains always-on
- No sync hacks exist

---

End of JUCE Addendum

---

## Phase 2 DSP Instruments (Complete)

All Phase 2 Pure DSP instruments adhere to this addendum:

### Completed Instruments (5/5)

1. **NexSynth** - FM Synthesizer
   - File: `instruments/Nex_synth/`
   - Tests: 9/9 ✅
   - Factory: `DSP::createInstrument("NexSynth")`

2. **SamSampler** - SF2 Sampler
   - File: `instruments/Sam_sampler/`
   - Tests: 9/9 ✅
   - Factory: `DSP::createInstrument("SamSampler")`

3. **KaneMarcoAether** - Aether String v2 Physical Modeling
   - File: `instruments/kane_marco/` (KaneMarcoAetherPureDSP)
   - Tests: 9/9 ✅
   - Factory: `DSP::createInstrument("KaneMarcoAether")`

4. **Kane Marco** - Virtual Analog Synthesizer
   - File: `instruments/kane_marco/` (KaneMarcoPureDSP)
   - Tests: 9/9 ✅
   - Factory: `DSP::createInstrument("KaneMarco")`

5. **LocalGal** - Feel Vector Synthesizer
   - File: `instruments/localgal/`
   - Tests: 9/9 ✅
   - Factory: `DSP::createInstrument("LocalGal")`

### Adherence to Addendum

All instruments correctly:
- ✅ Own time and DSP execution only
- ✅ Do not define musical structure
- ✅ Accept parameters from external control
- ✅ Are deterministic given same inputs
- ✅ Execute without semantic assumptions
- ✅ Support single-transport integration
- ✅ Provide factory creation for dynamic instantiation

### Test Coverage

Total: 45/45 tests passing (100%)

Test runner: `tests/dsp/run_all_instrument_tests.sh`

Completion report: `docs/plans/PHASE_2_COMPREHENSIVE_COMPLETION_REPORT.md`

---

## Next Steps

If you want next, I can:
- produce a single unified architecture diagram
- define the exact event contract between SDK and JUCE
- audit your current JUCE code for violations
- map this directly to Apple TV performance constraints

Just say where to push next.
