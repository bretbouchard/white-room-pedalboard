# LOCAL GAL — synth_bible.md  
**Localized Generative Acid Lab**  
Polyphonic generative acid synthesizer with mono/303 mode, LangGraph control, and JUCE/AUv3 integration.

---

## 1. Overview & Philosophy

### 1.1 Purpose

LOCAL GAL is a **polyphonic acid synthesizer** with an explicit switchable **303-style monophonic mode**. It is designed to be:

- **Drop-in**: a JUCE plugin (VST3 / AU / AUv3 / standalone) usable on macOS, iOS, and Raspberry Pi.
- **Agent-addressable**: fully controllable via MCP tools and a LangGraph backend.
- **Sequencer-aware**: understands step patterns with **gate, tie, slide, and accent** semantics.
- **Feel-driven**: controlled by a small **feel vector** (`rubber`, `bite`, `hollow`, `growl`, `wet`) that maps into detailed DSP parameters.

It’s intended as your “house synth” for:

- Classic acid lines (303 style, in mono mode).
- Polyphonic, harmonic acid textures (poly mode).
- Intelligent, automated pattern generation and transformation by agents.

---

### 1.2 Design Goals

1. **303 behavior when you want it**  
   - Monophonic, constant-time glide, accent behavior, and step semantics.

2. **Modern flexibility when you need it**  
   - Full polyphonic operation (configurable voices).
   - Chords and pads with “acid” tone shaping.

3. **Single source of truth**  
   - All DSP, UI, pattern logic, and agent behavior specified here.
   - Consistent parameter names across JUCE, AUv3, MCP, and LangGraph.

4. **Low friction integration**  
   - JUCE UI ties directly to an `AudioProcessorValueTreeState` (APVTS).
   - FastAPI server exposes `/events` and `/state`.
   - ToolDispatcher bracket for MCP integration.

---

### 1.3 High-Level Feature List

- **DSP Engine**
  - 2 main oscillators (polyphonic).
  - Offset waveform / phase offset for acid squelch.
  - Diode-ladder style filter.
  - Amp & mod envelopes.
  - LFO for filter and pitch modulation.
  - FX: drive, chorus, delay, reverb.

- **Temporal Engine**
  - Step pattern with: `midiNote`, `gate`, `tie`, `slide`, `accent`, `velocity`.
  - 303-style step rules.
  - Switchable poly / mono playback semantics.

- **Control Engine**
  - Feel vector → DSP parameter mapping:
    - `rubber` → glide & offset
    - `bite`   → resonance & env amount
    - `hollow` → base cutoff
    - `growl`  → drive
    - `wet`    → reserved for FX later
  - Direct parameter control via APVTS & MCP.

- **Agents & Integration**
  - LangGraph graph with:
    - `UserAgent`
    - `SequencerAgent`
    - `SynthAgent`
    - `TransportAgent`
    - `StorageAgent`
  - FastAPI HTTP bridge (`/events`, `/state`).

- **Targets**
  - macOS (VST3, AU, standalone).
  - iOS (AUv3 + host app).
  - Raspberry Pi (headless, remote controlled).

---

## 2. Terminology Definitions

- **LOCAL GAL**: This synth implementation and all its components (DSP, UI, agent system).
- **Poly mode**: Full polyphonic operation with multiple concurrent voices (e.g. 8–16).
- **Mono/303 mode**: Forced monophonic operation with TB-303-like glide and accent semantics.
- **Feel vector**: High-level control parameters: `rubber`, `bite`, `hollow`, `growl`, `wet`.
- **APVTS**: `juce::AudioProcessorValueTreeState` — JUCE parameter container.
- **Step**: A single sequencer step with gate/tie/slide/accent/pitch/velocity.
- **Pattern**: Collection of steps, plus timing and swing.
- **Accent**: Emphasis where filter env amount, amp env, and sometimes drive increase.
- **Slide**: Glide from one note to another without retriggering envelopes.
- **Tie**: Sustains the previous note across steps without a new note-on event.
- **MCP tools**: External tool functions (e.g. `set_feel`, `noteOnWithAccent`) invoked by agents.

---

## 3. Architectural Overview

LOCAL GAL is composed of:

1. **DSP Engine** (C++/JUCE)
   - Voices, oscillators, filters, envelopes, FX.
   - Exposes parameters through APVTS.

2. **UI Layer** (JUCE)
   - `SynthEditor` + panels:
     - `OscPanel`
     - `FilterEnvPanel`
     - `LfoAcidPanel`
     - `FeelPanel`
     - `StepSequencerComponent` (pattern view/editor).
   - Communicates with:
     - APVTS (local parameter state).
     - `LangGraphClient` (backend events).

3. **Backend LangGraph + FastAPI**
   - Global `AcidState` for pattern, feel, tempo, playback.
   - Agents for sequencing and tool calls.
   - HTTP endpoints for UI (`/events`, `/state`).

4. **MCP Tool Layer**
   - Synth tools (hosted by LOCAL GAL or a dedicated synth agent service).
   - Implementation-specific / pluggable.

**Dual-mode** architecture:

- Poly engine always exists.
- Mono/303 behavior is a front-end control mode with associated voice allocation and glide/accents rules.

---

## 4. DSP Engine

### 4.1 Oscillators

Two primary oscillators per voice:

- **Oscillator 1** (OSC1)
  - Waveforms: Sine/Saw/Square/Triangle/Noise.
  - Parameters:
    - `osc1_wave`
    - `osc1_level`
    - `osc1_detune`
    - `osc1_coarse`
    - `osc1_offset` (for acid squelch / asymmetry).
    - `osc1_free_run` (retrigger vs continuous).

- **Oscillator 2** (OSC2)
  - Same waveforms and parameters:
    - `osc2_wave`
    - `osc2_level`
    - `osc2_detune`
    - `osc2_coarse`
    - `osc2_offset`
    - `osc2_free_run`

**Oscillator param IDs (example)**

```cpp
namespace SynthParams {
    static constexpr const char* osc1Wave    = "osc1_wave";
    static constexpr const char* osc1Level   = "osc1_level";
    static constexpr const char* osc1Detune  = "osc1_detune";
    static constexpr const char* osc1Coarse  = "osc1_coarse";
    static constexpr const char* osc1Offset  = "osc1_offset";
    static constexpr const char* osc1FreeRun = "osc1_free_run";

    static constexpr const char* osc2Wave    = "osc2_wave";
    static constexpr const char* osc2Level   = "osc2_level";
    static constexpr const char* osc2Detune  = "osc2_detune";
    static constexpr const char* osc2Coarse  = "osc2_coarse";
    static constexpr const char* osc2Offset  = "osc2_offset";
    static constexpr const char* osc2FreeRun = "osc2_free_run";
}

Oscillators are typically juce::dsp::Oscillator<float> with custom lambda or look-up waveforms.

⸻

4.2 Offset Waveforms

“Offset waveform” is critical for classic acid squelch:
	•	Represented by osc1_offset / osc2_offset.
	•	Semantics:
	•	At 0.0: symmetric waveform (canonical shape).
	•	At 0.5: strongly asymmetrical wave, more odd harmonics.
	•	At ~0.6: strongly skewed; very “rubbery” acid tone when fed into resonant filter.

Implementation options:
	1.	Phase offset:
	•	y = wave(phase + offsetPhase)
	•	Effective but simpler.
	2.	Waveshaper:
	•	Generate base waveform, then apply nonlinear function with offset as parameter.
	3.	DC + shaping:
	•	Add DC offset, then pass through filter/HPF to trim low frequency artifacts.

For LOCAL GAL, use a lightweight approach:

float generateOffsetSaw(float phase, float offset)
{
    // base saw: -1 to 1
    float saw = 2.0f * phase - 1.0f;
    float skew = juce::jlimit(0.0f, 0.999f, offset);
    // Warp the phase space
    float warped = std::tanh(saw * (1.0f + skew * 4.0f));
    return warped;
}


⸻

4.3 Ring Mod / Drive

LOCAL GAL uses drive mainly at the filter output and a dedicated drive parameter controlled by growl in the feel vector.
	•	Parameter: fx_drive_amount (0..1).
	•	Implementation:
	•	Pre-shaping or waveshaper on filter output.
	•	Ex:

auto& drive = fxChain.get<0>();
drive.function = [driveAmt](float x) {
    float driveGain = 1.0f + driveAmt * 10.0f;
    return std::tanh(x * driveGain);
};

Ring mod is optional and can be added later as a multiply of two oscillators with its own mix parameter.

⸻

4.4 Filter Topologies

Primary filter:
	•	Diode Ladder Filter (acid-style low-pass).
	•	Provide switches for multiple topologies if needed later (SVF, ladder).

Parameter IDs (example):

namespace SynthParams {
    static constexpr const char* filterType   = "filter_type";   // LP, BP, HP
    static constexpr const char* filterCutoff = "filter_cutoff"; // Hz or normalized
    static constexpr const char* filterRes    = "filter_resonance";
    static constexpr const char* filterEnvAmt = "filter_env_amt";
    static constexpr const char* filterKeyTrk = "filter_key_track";
}

The diode ladder should saturate internally for added squelch. Use JUCE dsp::LadderFilter or a custom diode ladder if needed.

⸻

4.5 Envelope Generators

Two main ADSR envelopes:
	•	Amp envelope (ampA, ampD, ampS, ampR).
	•	Mod envelope (used for filter, pitch, other mod targets).

Parameters:

namespace SynthParams {
    static constexpr const char* ampAttack  = "amp_attack";
    static constexpr const char* ampDecay   = "amp_decay";
    static constexpr const char* ampSustain = "amp_sustain";
    static constexpr const char* ampRelease = "amp_release";

    static constexpr const char* modAttack  = "mod_attack";
    static constexpr const char* modDecay   = "mod_decay";
    static constexpr const char* modSustain = "mod_sustain";
    static constexpr const char* modRelease = "mod_release";
}

Implementation:
	•	Use juce::ADSR or custom envelope with linear/log curves.
	•	Envelope mod depth into filter is controlled by filter_env_amt.

⸻

4.6 Modulation Matrix

Initial version can be simple:
	•	modEnv → filter cutoff.
	•	LFO → filter cutoff / pitch.
	•	Velocity/accent → amp and filter.

Later expand to a generic mod matrix.

⸻

4.7 Accent Engine

Accent is a per-voice flag plus some global mapping.

Per-step accent flag or velocity threshold:
	•	At voice level, track:

bool activeAccent { false };
float noteVelocity { 1.0f };

Accent behavior in rendering:
	•	Increase:
	•	Filter envelope amount.
	•	Filter cutoff.
	•	Amp envelope level.
	•	Possibly drive.

Example:

bool accented = activeAccent || accentDetector.isAccented(noteVelocity);

float envAmt = baseEnvAmt * (accented ? 1.3f : 1.0f);
float cutoff = baseCutoff * (accented ? 1.2f : 1.0f);
float ampScale = accented ? 1.1f : 1.0f;

Accent can be set via:
	•	Pattern step accent = true.
	•	User’s velocity-based accent logic.
	•	External MCP control.

⸻

4.8 Glide Engine

Glide is crucial for acid lines:
	•	Parameter: glide_time in ms.
	•	Implementation: per-voice glide object that smooths frequency transitions.

Pseudo-interface:

class Glide
{
public:
    void setTimeMs(float ms, double sampleRate);
    void reset(float freq);
    void setTarget(float freq);
    float process(); // returns current freq per-sample
};

303-style behavior in 303 mode:
	•	Glide triggers when:
	•	Two steps are legato/slid (slide flag set) or
	•	Next note is played while previous note is held/gated.
	•	Envelope is NOT retriggered on slides.

In poly mode:
	•	Glide becomes per-voice legato:
	•	Each voice glides independently based on its note legato chain.
	•	Mono mode uses a single “lead voice”, with special note priority rules.

⸻

4.9 Distortion Models

Initial version:
	•	Single waveshaper drive parameter (drive).
	•	Later expansions:
	•	Different curves (soft clip, hard clip, diode clip).
	•	Multimode distortions based on growl.

⸻

5. Temporal Engine

5.1 Pattern Representation

Core structs:

// SynthEngine/Pattern.h
struct Step
{
    int   midiNote   = 0;    // 0–127
    bool  gate       = false;
    bool  tie        = false;
    bool  slide      = false;
    bool  accent     = false;
    float velocity   = 1.0f; // 0.0–1.0
};

struct Pattern
{
    std::string id          = "pattern-1";
    std::string name        = "Untitled Pattern";
    std::vector<Step> steps;

    int   stepsPerBar       = 16;     // e.g. 16th notes
    float stepDurationBeats = 0.25f;  // 1/16
    float swing             = 0.0f;   // future use
};

	•	Steps can represent monophonic sequences or poly sequences (via multiple patterns or multi-channel patterns later).
	•	id and name used for persistence and agent referencing.

⸻

5.2 Step Attributes

Each Step carries:
	•	midiNote: pitch.
	•	gate: on/off for that step.
	•	tie: sustain the previous note (no new note-on).
	•	slide: mark this step as the target of a glide from the previous note.
	•	accent: mark this step as accented.
	•	velocity: note velocity (used for amplitude and accent detection).

⸻

5.3 Tie, Slide, Accent Rules

In 303-style mono mode:

Given consecutive steps i-1 and i:
	•	If step i has tie = true:
	•	No new note-on, no note-off; sustain previous note.
	•	Accent flag may or may not update (project decision; default: do not change accent).
	•	If step i has slide = true and gate = true:
	•	Do NOT send noteOff for previous step.
	•	Do NOT retrigger envelopes.
	•	Set new target frequency using slideToNote(...).
	•	If step i has gate = true, tie = false, slide = false:
	•	If previous note was active, send noteOff.
	•	Then send noteOnWithAccent(...).
	•	If step i has gate = false and tie = false:
	•	Send noteOff (if previous note active).

Accent in 303 mode:
	•	Comes from step accent or velocity threshold.
	•	Affects filter env, cutoff, and amp.

In poly mode:
	•	Same step semantics, but you can:
	•	Use poly pattern playback (multiple notes simultaneously via multiple patterns).
	•	Or treat each pattern as monophonic but assign to multiple voices for chords.

⸻

5.4 Step Evaluation Engine

Pattern player logic:

class PatternPlayer
{
public:
    PatternPlayer (SynthEngine& eng) : engine (eng) {}

    void setPattern (Pattern p) { pattern = std::move(p); stepIndex = -1; currentNote = -1; }
    void setTempo (double bpm)   { tempoBpm = bpm; }

    void processBeatPosition (double hostBeat)
    {
        if (!pattern.steps.size())
            return;

        double stepBeats = pattern.stepDurationBeats;
        int newStep = (int) std::floor(hostBeat / stepBeats) %
                      (int) pattern.steps.size();

        if (newStep == stepIndex)
            return; // same step

        stepIndex = newStep;
        const Step& st = pattern.steps[(size_t) stepIndex];

        if (!st.gate && !st.tie)
        {
            if (currentNote >= 0)
                engine.noteOff(1, currentNote, 0.0f, true);
            currentNote = -1;
            return;
        }

        if (st.tie)
        {
            // sustain current note, no new event
            return;
        }

        if (st.slide && currentNote >= 0)
        {
            engine.slideToNote(1, st.midiNote, st.accent, st.velocity);
            currentNote = st.midiNote;
            return;
        }

        if (currentNote >= 0)
            engine.noteOff(1, currentNote, 0.0f, true);

        currentNote = st.midiNote;
        engine.noteOnWithAccent(1, currentNote, st.velocity, st.accent);
    }

private:
    SynthEngine& engine;
    Pattern pattern;
    int stepIndex { -1 };
    int currentNote { -1 }; // mono-style; poly uses voice allocator
    double tempoBpm { 120.0 };
};

For poly mode, currentNote becomes a set or a per-voice structure, but the above is sufficient for 303-style behavior.

⸻

6. Control Engine

6.1 Feel Vector → DSP Mapping

Feel vector definition:

struct FeelVector
{
    float rubber = 0.0f;
    float bite   = 0.0f;
    float hollow = 0.0f;
    float growl  = 0.0f;
    float wet    = 0.0f; // reserved for FX blend
};

Helper:

inline float lerp (float a, float b, float t) { return a + (b - a) * t; }

Mappings:

float glideMs   (float rubber) { return lerp(10.0f, 120.0f, rubber); }
float oscOffset (float rubber) { return lerp(0.05f, 0.6f, rubber); }

float resonance (float bite)   { return lerp(0.4f, 0.95f, bite); }
float envAmount (float bite)   { return lerp(800.0f, 2000.0f, bite); }

float baseCutoff(float hollow) { return lerp(220.0f, 900.0f, hollow); }

float driveFromGrowl(float g)  { return lerp(1.0f, 3.0f, g); }

Swift mapping example (AUv3):

func applyFeel(_ f: FeelVector, to synth: AUParameterTree) {
    synth["glide_time"]?.value = glideMs(from: f.rubber)
    synth["osc1_offset"]?.value = oscOffset(from: f.rubber)

    synth["filter_resonance"]?.value = resonance(from: f.bite)
    synth["filter_env_amt"]?.value = envAmount(from: f.bite)

    synth["filter_cutoff"]?.value = baseCutoff(from: f.hollow)

    synth["drive"]?.value = drive(from: f.growl)
}

This mapping is also replicated on the backend in Python for tests and state introspection.

⸻

6.2 Automation / Modulation Interface
	•	APVTS exposes all primary DSP parameters as automatable.
	•	Feel vector can be automatically adjusted by:
	•	Host automation (optional).
	•	Agents (via MCP).

Automation rules:
	•	Direct parameter changes (e.g. host automation) override feel-vector-mapped defaults for that parameter.
	•	Agents can choose to operate in:
	•	Feel mode: adjust rubber, bite, etc.
	•	Param mode: adjust raw DSP parameters.

⸻

6.3 Parameter Interpolation System

To avoid zipper noise:
	•	Control changes are smoothed at audio rate (e.g. SmoothedValue<float>).
	•	Especially important for:
	•	filter_cutoff
	•	glide_time (if changed in real-time)
	•	drive
	•	FX parameters (delay/reverb mix, etc.)

⸻

7. Preset Infrastructure

7.1 JSON Serialization

Base preset structure:

{
  "name": "Classic Acid",
  "mode": "acid",
  "feel": {
    "rubber": 0.7,
    "bite":   0.6,
    "hollow": 0.3,
    "growl":  0.2,
    "wet":    0.0
  },
  "params": {
    "osc1_wave": 1,
    "osc1_offset": 0.52,
    "osc1_free_run": 1,

    "filter_cutoff": 420,
    "filter_resonance": 0.85,
    "filter_env_amt": 1450,

    "glide_time": 65,
    "drive": 2.0,

    "accent_threshold": 0.75,
    "accent_amount": 0.6
  }
}

	•	mode: "poly" | "mono" | "legato" | "acid" (acid implies mono behavior + accent emphasis).

⸻

7.2 Default Presets

Provide a small curated set:
	•	Classic Acid
	•	Rubber Bass
	•	Hollow Pad
	•	Growl Lead
	•	Clean Poly

Each preset has:
	•	A feel configuration.
	•	Detailed params for DSP fine-tuning.

⸻

7.3 Factory Banks

Group presets by tags:

{
  "bank_name": "LOCAL GAL Factory 1",
  "presets": [ ...preset objects... ]
}

Agents can use tags (“acid”, “bass”, “poly pad”) to select relevant starting points.

⸻

8. Local Agent Architecture

8.1 LangGraph Node Definitions

Nodes:
	•	UserAgent — classify user/UI events into graph events.
	•	SequencerAgent — manages patterns, step logic.
	•	SynthAgent — maps sequencer events to synth MCP tool calls.
	•	TransportAgent — updates beat position from tempo and delta time.
	•	StorageAgent — persists patterns/presets.

Core state (AcidState):

@dataclass
class AcidState:
    pattern: Optional[Pattern] = None
    pattern_id: Optional[str] = None
    synth_params: dict = field(default_factory=dict)
    feel_vector: dict = field(default_factory=dict)
    tempo: float = 120.0
    beat_position: float = 0.0
    playback: bool = False
    last_step_index: Optional[int] = None
    pending_user_event: Optional[dict] = None


⸻

8.2 Event Routing

Event types:
	•	From UI/User:
	•	USER_EDIT_PATTERN
	•	USER_GENERATE_PATTERN
	•	USER_SET_FEEL
	•	USER_SET_TEMPO
	•	USER_PLAY
	•	USER_STOP
	•	From Transport:
	•	BEAT_TICK
	•	From Sequencer:
	•	SEQUENCER_NOTE_ON
	•	SEQUENCER_NOTE_OFF
	•	SEQUENCER_SLIDE
	•	SEQUENCER_TIE
	•	PATTERN_UPDATED

Graph edges (conceptually):
	•	USER_* → UserAgent → appropriate downstream agent.
	•	USER_PLAY → TransportAgent
	•	BEAT_TICK → SequencerAgent
	•	SEQUENCER_* → SynthAgent
	•	PATTERN_UPDATED → StorageAgent

⸻

8.3 Agent Behaviors (Sketch)

SequencerAgent:

def sequencer_agent(state: AcidState):
    if not state.playback or state.pattern is None:
        return state, None

    p = state.pattern
    if not p.steps:
        return state, None

    step_beats = p.stepDurationBeats
    idx = int(state.beat_position / step_beats) % len(p.steps)

    if state.last_step_index == idx:
        return state, None  # no change

    step = p.steps[idx]
    state.last_step_index = idx

    if not step.gate and not step.tie:
        return state, ("SEQUENCER_NOTE_OFF", {})
    if step.tie:
        return state, ("SEQUENCER_TIE", {"step": idx})
    if step.slide:
        return state, ("SEQUENCER_SLIDE", {
            "note": step.midiNote,
            "accent": step.accent,
            "velocity": step.velocity
        })
    return state, ("SEQUENCER_NOTE_ON", {
        "note": step.midiNote,
        "accent": step.accent,
        "velocity": step.velocity
    })

TransportAgent:

def transport_agent(state: AcidState, delta_seconds: float):
    if not state.playback:
        return state
    beats_per_second = state.tempo / 60.0
    state.beat_position += beats_per_second * delta_seconds
    return state

SynthAgent:
	•	Receives SEQUENCER_* events and calls MCP tools (noteOnWithAccent, slideToNote, noteOff).

⸻

9. External Interface

9.1 HTTP Bridge (FastAPI Server)

Endpoints:
	•	POST /events — receive UI/agent events.
	•	GET /state — return current AcidState JSON.

Example POST /events for USER_SET_FEEL:

{
  "type": "USER_SET_FEEL",
  "feel": {
    "rubber": 0.8,
    "bite":   0.5,
    "hollow": 0.2,
    "growl":  0.3,
    "wet":    0.0
  }
}

Server applies feel → params mapping and calls set_feel MCP tool.

⸻

9.2 MCP Tooling

Example tools manifest section:

{
  "name": "local_gal_synth",
  "description": "Controls the LOCAL GAL JUCE synth via feel vectors and direct DSP parameters.",
  "version": "1.0.0",
  "tools": [
    {
      "name": "set_feel",
      "description": "Set high-level feel parameters (rubber, bite, hollow, growl, wet).",
      "input_schema": {
        "type": "object",
        "properties": {
          "rubber": { "type": "number", "minimum": 0, "maximum": 1 },
          "bite":   { "type": "number", "minimum": 0, "maximum": 1 },
          "hollow": { "type": "number", "minimum": 0, "maximum": 1 },
          "growl":  { "type": "number", "minimum": 0, "maximum": 1 },
          "wet":    { "type": "number", "minimum": 0, "maximum": 1 }
        }
      }
    },
    {
      "name": "set_params",
      "description": "Set DSP parameters directly.",
      "input_schema": {
        "type": "object",
        "additionalProperties": { "type": "number" }
      }
    },
    {
      "name": "noteOnWithAccent",
      "description": "Start a note with optional accent.",
      "input_schema": {
        "type": "object",
        "properties": {
          "note": { "type": "integer" },
          "velocity": { "type": "number" },
          "accent": { "type": "boolean" }
        },
        "required": ["note", "velocity"]
      }
    },
    {
      "name": "slideToNote",
      "description": "Slide currently held note to new note without retriggering envelope.",
      "input_schema": {
        "type": "object",
        "properties": {
          "note": { "type": "integer" },
          "velocity": { "type": "number" },
          "accent": { "type": "boolean" }
        },
        "required": ["note"]
      }
    },
    {
      "name": "noteOff",
      "description": "Release the current note.",
      "input_schema": {
        "type": "object",
        "properties": {}
      }
    }
  ]
}


⸻

9.3 AUv3 Parameter Exposure

Expose key parameters as AUParameters with stable IDs:
	•	glide_time
	•	filter_cutoff
	•	filter_resonance
	•	filter_env_amt
	•	drive
	•	osc1_offset
	•	FX mix controls, etc.

Swift side reads/writes:
	•	Using AUParameterTree.
	•	Mapping from feel vector into parameters.

⸻

9.4 JUCE UI → Backend Messaging
	•	LangGraphClient handles HTTP calls to the FastAPI server.
	•	SynthEditor:
	•	Uses APVTS for local parameter visualization.
	•	Sends USER_* events via LangGraphClient::sendEvent.
	•	Polls /state periodically (e.g. 15 Hz) and updates UI (pattern, step highlight, etc.).

⸻

10. Platform Integration

10.1 macOS
	•	Build formats: VST3, AU, Standalone.
	•	CMake example:

juce_add_plugin(LOCALGAL
    COMPANY_NAME "YourCompany"
    BUNDLE_ID com.yourcompany.localgal
    IS_SYNTH TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    FORMATS VST3 AU Standalone
    PRODUCT_NAME "LOCAL GAL")


⸻

10.2 iOS / AUv3
	•	Additional AUv3 format in juce_add_plugin.
	•	iOS target requires:
	•	Host app that embeds AUv3 extension.
	•	Parameter tree integrated with feel mapping and UI.

⸻

10.3 Linux / Raspberry Pi
	•	Build as standalone app or LV2/VST3 plugin (depending on JUCE configuration).
	•	Run FastAPI + LangGraph server locally.
	•	Use HEADLESS mode for performance.

⸻

11. Testing

11.1 Unit Tests (Python / Backend)
	•	test_sequencer_agent.py:
	•	Test noteOn / slide / tie / noteOff logic for sequential steps.
	•	test_feel_mapping.py:
	•	Ensure monotonic mapping of feel vector to DSP params.
	•	test_graph_routing.py:
	•	Ensure USER_PLAY → transport_agent → sequencer_agent → SEQUENCER_NOTE_*.

⸻

11.2 Integration Tests
	•	Test FastAPI endpoints:
	•	POST /events with USER_SET_FEEL updates state and calls tools.
	•	POST /events with USER_EDIT_PATTERN, then GET /state returns pattern.
	•	Test graph loop:
	•	Run graph_loop for simulated time and ensure sequence of MCP tool calls (in mocked ToolDispatcher).

⸻

11.3 Audio Validation Tests
	•	Offline rendering tests:
	•	For given pattern and preset, render X seconds and:
	•	Confirm amplitude bounds.
	•	Confirm non-silent output.
	•	Future: compare spectral signatures to golden references.

⸻

11.4 Pattern Validity Tests
	•	Validate pattern JSON against schema:
	•	Ensure steps have valid fields.
	•	Ensure tie is only allowed after a gate step.
	•	Ensure no out-of-bounds notes (0..127).

⸻

12. Roadmap & Extension Points
	•	More filter models: switchable 18/24 dB ladder, MS-20 style, etc.
	•	Extended mod matrix: user-defined routings.
	•	Multiple patterns + chaining: A-B-A-C pattern songs.
	•	Randomization tools:
	•	acidize_pattern, invert_pattern, octave_shuffle, density_adjust.
	•	Additional FX:
	•	Vintage chorus, dynamic distortion, phaser.
	•	Host-synced LFOs: beat-synced modulations.

⸻

13. Appendix

13.1 Pattern JSON Schema

{
  "type": "object",
  "properties": {
    "id":   { "type": "string" },
    "name": { "type": "string" },
    "stepsPerBar":       { "type": "integer" },
    "stepDurationBeats": { "type": "number" },
    "swing":             { "type": "number" },
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "midiNote": { "type": "integer" },
          "gate":     { "type": "boolean" },
          "tie":      { "type": "boolean" },
          "slide":    { "type": "boolean" },
          "accent":   { "type": "boolean" },
          "velocity": { "type": "number" }
        },
        "required": ["gate", "tie", "slide", "accent"]
      }
    }
  },
  "required": ["id", "steps"]
}


⸻

13.2 Feel Vector JSON Schema

{
  "type": "object",
  "properties": {
    "rubber": { "type": "number", "minimum": 0, "maximum": 1 },
    "bite":   { "type": "number", "minimum": 0, "maximum": 1 },
    "hollow": { "type": "number", "minimum": 0, "maximum": 1 },
    "growl":  { "type": "number", "minimum": 0, "maximum": 1 },
    "wet":    { "type": "number", "minimum": 0, "maximum": 1 }
  }
}


⸻

13.3 Mermaid Diagram: High-Level Architecture

flowchart LR
    UI[JUCE UI\n(SynthEditor + Panels)] -->|HTTP /events| Backend[FastAPI + LangGraph]
    Backend -->|HTTP /state| UI

    subgraph Backend
        UA[UserAgent]
        TA[TransportAgent]
        SA[SequencerAgent]
        SyA[SynthAgent]
        StA[StorageAgent]

        UA --> SA
        UA --> TA
        TA --> SA
        SA --> SyA
        SA --> StA
    end

    SyA -->|MCP tools| SynthDSP[LOCAL GAL DSP Engine]


⸻

13.4 Example API Events

Play:

{
  "type": "USER_PLAY"
}

Stop:

{
  "type": "USER_STOP"
}

Set Tempo:

{
  "type": "USER_SET_TEMPO",
  "tempo_bpm": 128
}

Edit Pattern:

{
  "type": "USER_EDIT_PATTERN",
  "pattern": {
    "id": "acid_01",
    "name": "Acid Demo",
    "stepsPerBar": 16,
    "stepDurationBeats": 0.25,
    "swing": 0.0,
    "steps": [
      { "midiNote": 48, "gate": true, "tie": false, "slide": false, "accent": true, "velocity": 0.9 },
      { "midiNote": 50, "gate": true, "tie": false, "slide": true,  "accent": false, "velocity": 0.8 },
      { "midiNote": 0,  "gate": false, "tie": true,  "slide": false, "accent": false, "velocity": 0.0 },
      { "midiNote": 0,  "gate": false, "tie": false, "slide": false, "accent": false, "velocity": 0.0 }
    ]
  }
}


⸻

This file (“synth_bible.md”) is the master spec for LOCAL GAL.

You can:
	•	Drop it into /docs/synth_bible.md in your repo.
	•	Split sections into separate docs if needed.
	•	Use it as the single source of truth for DSP, sequencer, agents, and integration.

If you want, I can next:
	•	Generate a minimal starter repo layout that matches this spec.
	•	Or produce a checklist for implementing LOCAL GAL step-by-step (DSP → UI → backend → tests).