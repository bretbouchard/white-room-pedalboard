/*
  ==============================================================================

   KaneMarcoAetherStringDSP.h
   Physical String Modeling Synthesizer with Pedalboard

   Architecture:
   - Karplus-Strong waveguide string (6 voices)
   - Bridge coupling to modal body resonator
   - 6-state articulation state machine (BOW, PICK, SCRAPE, HARMONIC, TREMOLO, NORMAL)
   - 8-pedal pedalboard (Comp, Octave, OD, Dist, RAT, Phaser, Reverb)
   - Configurable signal routing

   Performance Targets:
   - < 20% CPU (6 voices at 48kHz)
   - < 10ms latency for articulation changes
   - NO allocations in processBlock()

  ==============================================================================
*/

#pragma once

#include <juce_dsp/juce_dsp.h>
#include <juce_audio_processors/juce_audio_processors.h>
#include <atomic>
#include <memory>
#include <array>

// v2: Forward declarations
class SharedBridgeCoupling;
class SympatheticStringBank;
struct SympatheticStringConfig;

//==============================================================================
// Component 1: Waveguide String (Karplus-Strong Extension)
//==============================================================================

/**
 * Physical string model using digital waveguide synthesis
 *
 * Features:
 * - Fractional delay line with Lagrange interpolation (pitch tracking)
 * - Allpass filter for stiffness (inharmonicity)
 * - Lowpass filter for damping (brightness)
 * - Bridge coupling for energy transfer to body
 *
 * References:
 * - Smith, J. "Physical Audio Signal Processing - Waveguide Synthesis" (CCRMA)
 * - Karplus, K. & Strong, A. "Digital Synthesis of Plucked String and Drum Timbres" (1983)
 */
class WaveguideString
{
public:
    //==============================================================================
    //==============================================================================
    /** String gauge (mass proxy) for v2 giant instruments */
    enum class StringGauge
    {
        Thin,      // Bright, fast decay, sharp attack
        Normal,    // Balanced (default, guitar-scale)
        Thick,     // Dark, slow decay, soft attack
        Massive    // Very dark, very long sustain, bloom attack
    };

    //==============================================================================
    struct Parameters
    {
        // v1 parameters (unchanged for backward compatibility)
        float frequency = 440.0f;      // String fundamental (Hz)
        float damping = 0.996f;        // Energy loss coefficient (0-1)
        float stiffness = 0.0f;        // Allpass coefficient for inharmonicity (0-0.5)
        float brightness = 0.5f;       // High-frequency damping (0-1)
        float bridgeCoupling = 0.3f;   // Bridge coupling coefficient (0-1)
        float nonlinearity = 0.1f;     // Bridge nonlinearity (0-1)

        // v2 parameters (giant instruments)
        float stringLengthMeters = 0.65f;    // Physical string length (0.65m guitar to 30m+ giant)
        StringGauge stringGauge = StringGauge::Normal;  // Mass proxy (Thin/Normal/Thick/Massive)
        float pickPosition = 0.12f;          // Pick position 0-1 (0.12 = guitar default)
    };

    //==============================================================================
    WaveguideString();
    ~WaveguideString();

    //==============================================================================
    /** Initialize DSP components */
    void prepare(double sampleRate);

    /** Reset delay line and filters to silence */
    void reset();

    //==============================================================================
    /** Fill delay line with exciter signal (pick, bow, scrape, etc.) */
    void excite(const juce::AudioBuffer<float>& exciterSignal, float velocity);

    /** Process single sample through waveguide */
    float processSample();

    //==============================================================================
    /** Set string fundamental frequency (updates delay line length) */
    void setFrequency(float freq);

    /** Set damping coefficient (energy loss) */
    void setDamping(float damping);

    /** Set stiffness coefficient (inharmonicity) */
    void setStiffness(float stiffness);

    /** Set brightness (high-frequency damping) */
    void setBrightness(float brightness);

    /** Set bridge coupling coefficient */
    void setBridgeCoupling(float coupling);

    /** Set bridge nonlinearity */
    void setNonlinearity(float nonlinearity);

    //==============================================================================
    // v2 methods: Giant instrument parameters

    /** Set physical string length in meters (v2)

        Triggers automatic scale physics:
        - stiffness ↓ as length ↑ (more harmonic)
        - damping curve reshaped (better HF/LF sustain)
        - bridgeCoupling ↓ (massive bridge)
        - exciterBrightness ↓ (longer string = darker)

        Range: 0.1m to 100.0m
        Default: 0.65m (guitar-scale)

        @param length    String length in meters
    */
    void setStringLengthMeters(float length);

    /** Set string gauge (v2)

        Semantic macro for mass-per-length

        Thin:    brightness +20%, decay -30% (bright, fast)
        Normal:  baseline (balanced)
        Thick:   brightness -25%, decay +50% (dark, slow)
        Massive: brightness -40%, decay +150% (very dark, very long)

        @param gauge    String gauge
    */
    void setStringGauge(StringGauge gauge);

    /** Set pick position along string (v2)

        Creates comb filtering in excitation spectrum

        Range: 0.0 (bridge) to 1.0 (nut)
        Default: 0.12 (12% from bridge, guitar-style)

        Near bridge (0.0-0.15): Bright, sharp, harmonics emphasized
        Middle (0.3-0.7): Warm, balanced, fundamental emphasis
        Near nut (0.85-1.0): Dark, soft, muted tone

        @param position    Pick position 0-1
    */
    void setPickPosition(float position);

    //==============================================================================
    /** Get current delay line length (samples) */
    float getCurrentDelay() const;

    /** Get maximum delay line length */
    int getMaximumDelayInSamples() const;

    /** Get bridge energy output (goes to body resonator) */
    float getBridgeEnergy() const { return lastBridgeEnergy; }

    //==============================================================================
    Parameters params;

private:
    //==============================================================================
    // Fractional delay line (Linear interpolation for pitch tracking)
    // Note: JUCE version may not support Lagrange, using Linear as fallback
    juce::dsp::DelayLine<float, juce::dsp::DelayLineInterpolationTypes::Linear> fractionalDelay;

    // Stiffness filter (allpass for inharmonicity)
    juce::dsp::FirstOrderTPTFilter<float> stiffnessFilter;

    // Damping filter (lowpass for brightness control)
    juce::dsp::FirstOrderTPTFilter<float> dampingFilter;

    // State variables
    double sr = 48000.0;
    float lastBridgeEnergy = 0.0f;
    int maxDelayInSamples = 0;  // Cache max delay for getMaximumDelayInSamples()

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(WaveguideString)
};

//==============================================================================
// Component 2: Bridge Coupling
//==============================================================================

/**
 * Bridge coupling between string and body resonator
 *
 * Physics:
 * - String vibrates → Bridge moves → Body resonates
 * - Bridge reflects some energy back to string
 * - Nonlinear saturation prevents explosion
 *
 * Energy Transfer:
 * bridgeEnergy = tanh(stringOut * coupling * (1 + nonlinearity))
 * reflectedEnergy = stringOut - bridgeEnergy
 */
class BridgeCoupling
{
public:
    //==============================================================================
    BridgeCoupling();
    ~BridgeCoupling();

    //==============================================================================
    /** Initialize bridge (no-op for now, for API consistency) */
    void prepare(double sampleRate) { juce::ignoreUnused(sampleRate); }

    //==============================================================================
    /** Process string output through bridge coupling */
    float processString(float stringOutput);

    /** Get bridge energy (goes to body resonator) */
    float getBridgeEnergy() const { return bridgeEnergy; }

    //==============================================================================
    /** Set coupling coefficient (0-1) */
    void setCouplingCoefficient(float coeff) { couplingCoefficient = juce::jlimit(0.0f, 1.0f, coeff); }

    /** Set nonlinearity (0-1) */
    void setNonlinearity(float nonlin) { nonlinearity = juce::jlimit(0.0f, 1.0f, nonlin); }

    //==============================================================================
    float couplingCoefficient = 0.3f;
    float nonlinearity = 0.1f;

private:
    //==============================================================================
    float bridgeEnergy = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(BridgeCoupling)
};

//==============================================================================
// Component 3: Modal Body Resonator
//==============================================================================

/**
 * Single modal resonator (one mode of body vibration)
 */
struct ModalFilter
{
    float frequency = 440.0f;      // Modal frequency (Hz)
    float amplitude = 1.0f;        // Mode amplitude (0-1)
    float decay = 1.0f;            // Decay time (seconds)
    float phase = 0.0f;            // Current phase (0-1)
    float energy = 0.0f;           // Current energy level
    float baseAmplitude = 1.0f;    // Base amplitude for scaling

    //==============================================================================
    void prepare(double sampleRate);
    float processSample(float excitation);
    void reset();

private:
    double sr = 48000.0;
};

/**
 * Modal body resonator (8-16 modes for guitar body simulation)
 *
 * Typical Acoustic Guitar Body Modes:
 * - Mode 1: Air resonance (~95 Hz)
 * - Mode 2: Top plate (~190 Hz)
 * - Mode 3: Back plate (~280 Hz)
 * - Mode 4: Helmholtz resonance (~400 Hz)
 * - Mode 5-8: Higher stiffness modes
 *
 * References:
 * - "Circuit Based Classical Guitar Model" (ScienceDirect 2015)
 * - Desvages, C. "Physical Modelling of the Bowed String" (PhD Thesis 2018)
 */
class ModalBodyResonator
{
public:
    //==============================================================================
    ModalBodyResonator();
    ~ModalBodyResonator();

    //==============================================================================
    /** Initialize all modes */
    void prepare(double sampleRate);

    /** Reset all modes to silence */
    void reset();

    //==============================================================================
    /** Process excitation through modal bank */
    float processSample(float bridgeEnergy);

    //==============================================================================
    /** Set resonance amount (scales all mode amplitudes) */
    void setResonance(float amount);

    /** Load guitar body preset (8 modes) */
    void loadGuitarBodyPreset();

    //==============================================================================
    /** Get number of modes */
    int getNumModes() const { return static_cast<int>(modes.size()); }

    /** Get specific mode frequency */
    float getModeFrequency(int index) const;

    //==============================================================================
    std::vector<ModalFilter> modes;

private:
    //==============================================================================
    double sr = 48000.0;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ModalBodyResonator)
};

//==============================================================================
// Component 4: Articulation State Machine (Week 2 - Complete Implementation)
//==============================================================================

/**
 * Articulation states for physical string excitation
 * Week 2: Full state machine with 6 states and 4 exciter generators
 */
enum class ArticulationState
{
    IDLE,               // No note playing
    ATTACK_PLUCK,       // Initial pluck attack
    DECAY,              // Pluck decay
    SUSTAIN_BOW,        // Bowed sustain
    RELEASE_GHOST,      // Ghost release (natural decay)
    RELEASE_DAMP        // Damped release (hand muting)
};

//==============================================================================
/**
 * Gesture parameters for v2 giant instrument articulation
 *
 * Controls the shape and character of excitation:
 * - Force: Energy amount (0-1)
 * - Speed: Attack speed (0-1, giant = slow)
 * - Contact area: Excitation bandwidth (0-1, giant = wide)
 * - Roughness: Noise texture (0-1)
 */
struct GestureParameters
{
    float force = 0.7f;         // Excitation energy (0.0 to 1.0)
    float speed = 0.2f;         // Attack speed (0.0 = slow giant, 1.0 = fast guitar)
    float contactArea = 0.6f;   // Contact width (0.0 = sharp, 1.0 = wide)
    float roughness = 0.3f;     // Texture/noise (0.0 = smooth, 1.0 = rough)
};

/**
 * Articulation state machine with glitch-free crossfading
 *
 * States:
 * - IDLE: Waiting for noteOn
 * - ATTACK_PLUCK: Initial 50ms attack phase
 * - DECAY: Natural decay (1s default)
 * - SUSTAIN_BOW: Continuous bowed excitation
 * - RELEASE_GHOST: Natural release (2s default)
 * - RELEASE_DAMP: Quick damping (300ms)
 *
 * Crossfade: Equal-power (cos/sin) over 10ms
 */
class ArticulationStateMachine
{
public:
    //==============================================================================
    ArticulationStateMachine();
    ~ArticulationStateMachine();

    //==============================================================================
    void prepare(double sampleRate);
    void reset();

    //==============================================================================
    /** Trigger pluck articulation */
    void triggerPluck(float velocity);

    /** Trigger bow articulation */
    void triggerBow(float velocity, float bowPressure);

    /** Trigger scrape articulation */
    void triggerScrape(float velocity);

    /** Trigger harmonic articulation */
    void triggerHarmonic(float velocity);

    /** Trigger damp (immediate transition to RELEASE_DAMP) */
    void triggerDamp();

    //==============================================================================
    /** Get current state */
    ArticulationState getCurrentState() const { return currentState; }

    /** Get previous state (for crossfading) */
    ArticulationState getPreviousState() const { return previousState; }

    /** Get crossfade progress (0-1) */
    float getCrossfadeProgress() const { return static_cast<float>(crossfadeProgress); }

    //==============================================================================
    /** Update state machine (call once per sample) */
    void update(float deltaTime);

    //==============================================================================
    /** Get previous state gain (equal-power crossfade) */
    float getPreviousGain() const;

    /** Get current state gain (equal-power crossfade) */
    float getCurrentGain() const;

    /** Get current excitation sample */
    float getCurrentExcitation();

    //==============================================================================
    // v2 methods: Gesture parameters

    /** Set gesture parameters for v2 giant instrument articulation

        @param gesture    Gesture parameters (force, speed, contactArea, roughness)
    */
    void setGestureParameters(const GestureParameters& gesture);

    /** Get current gesture parameters */
    const GestureParameters& getGestureParameters() const { return gesture; }

    //==============================================================================
    ArticulationState currentState = ArticulationState::IDLE;
    ArticulationState previousState = ArticulationState::IDLE;

private:
    //==============================================================================
    void transitionTo(ArticulationState newState);

    //==============================================================================
    double crossfadeProgress = 1.0;
    double stateTimer = 0.0;
    double crossfadeTime = 0.01;  // 10ms crossfade

    double sr = 48000.0;

    // Exciter buffer (pre-allocated for realtime safety)
    static constexpr int exciterBufferSize = 1000;
    float exciterBuffer[1000];
    int exciterIndex = 0;
    int exciterLength = 0;

    // Exciter parameters
    float exciterAmplitude = 0.0f;

    // v2: Gesture parameters
    GestureParameters gesture;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(ArticulationStateMachine)
};

//==============================================================================
// Component 5: Voice Structure (Week 3)
//==============================================================================

// Forward declaration (Pedalboard defined after Voice)
struct Pedalboard;

/**
 * Polyphonic voice combining all DSP components
 *
 * Signal Path:
 * MIDI → FSM Exciter → Waveguide String → Bridge Coupling → Body Resonator → Pedalboard → Output
 *
 * v2 Extension:
 * → Shared Bridge (multi-string coupling) → Sympathetic Strings → Output
 *
 * Each voice represents one note in the polyphonic synthesizer
 */
struct Voice
{
    //==============================================================================
    WaveguideString string;
    BridgeCoupling bridge;
    ModalBodyResonator body;
    ArticulationStateMachine fsm;
    Pedalboard* pedalboard = nullptr;  // Week 4: Pointer to shared pedalboard (optional per-voice)

    // v2: Shared components (optional, disabled by default for backward compatibility)
    SharedBridgeCoupling* sharedBridge = nullptr;  // v2: Multi-string coupling
    SympatheticStringBank* sympatheticStrings = nullptr;  // v2: Sympathetic resonance

    //==============================================================================
    bool isActive = false;
    int currentNote = -1;
    float currentVelocity = 0.0f;
    float age = 0.0f;  // For voice stealing (LRU)

    //==============================================================================
    /** Initialize voice components */
    void prepare(double sampleRate);

    /** Trigger note on */
    void noteOn(int note, float velocity);

    /** Trigger note off (release) */
    void noteOff();

    /** Process block of samples */
    void processBlock(float* output, int numSamples);
};

//==============================================================================
// Component 6: Voice Manager (Week 3)
//==============================================================================

/**
 * Polyphonic voice manager with LRU voice stealing
 *
 * Features:
 * - 6 voices max (CPU budget < 20%)
 * - LRU voice stealing when all voices active
 * - Note retrigger support
 * - Voice age tracking
 */
struct VoiceManager
{
    //==============================================================================
    std::array<Voice, 6> voices;  // 6 voices max

    //==============================================================================
    /** Initialize all voices */
    void prepare(double sampleRate, int samplesPerBlock);

    /** Find free voice (or steal oldest) */
    Voice* findFreeVoice();

    /** Find voice playing specific note */
    Voice* findVoiceForNote(int note);

    /** Handle MIDI note on */
    void handleNoteOn(int note, float velocity);

    /** Handle MIDI note off */
    void handleNoteOff(int note);

    /** Panic: stop all voices immediately */
    void allNotesOff();

    /** Process all active voices */
    void processBlock(float* output, int numSamples);

    /** Get number of active voices */
    int getActiveVoiceCount() const;

    //==============================================================================
    // v2 methods: Giant instrument features

    /** Enable or disable shared bridge coupling (v2)

        When enabled, all voices share a common bridge for string-to-string coupling

        @param enabled    True to enable shared bridge
    */
    void enableSharedBridge(bool enabled);

    /** Enable or disable sympathetic strings (v2)

        When enabled, adds a bank of sympathetic strings that resonate with bridge energy

        @param config    Sympathetic string configuration
    */
    void enableSympatheticStrings(const SympatheticStringConfig& config);

    /** Get shared bridge (for external access/testing) */
    SharedBridgeCoupling* getSharedBridge() { return sharedBridge.get(); }

    /** Get sympathetic string bank (for external access/testing) */
    SympatheticStringBank* getSympatheticStrings() { return sympatheticStrings.get(); }

private:
    //==============================================================================
    // v2: Shared components (owned by VoiceManager)
    std::unique_ptr<SharedBridgeCoupling> sharedBridge;
    std::unique_ptr<SympatheticStringBank> sympatheticStrings;
};

//==============================================================================
// Component 7: Pedalboard (Week 4)
//==============================================================================

/**
 * RAT Distortion with switchable diodes
 *
 * Diode Types:
 * - Silicon: 1N914 ~0.7V forward voltage (standard RAT sound)
 * - Germanium: 1N270 ~0.3V forward voltage (softer, more asymmetrical)
 * - LED: ~1.5V forward voltage (higher headroom, cleaner)
 *
 * Circuit Model:
 * - Pre-filter (lowpass @ 4kHz) prevents aliasing
 * - Asymmetric diode clipping (soft knee using tanh)
 * - Tone filter (lowpass, adjustable 200Hz-5kHz)
 * - Drive control (1.0 to 10.0)
 *
 * References:
 * - ProCo RAT schematic analysis
 * - "Diode Clipping Distortion" (DAFX)
 */
struct RATDistortion
{
    //==============================================================================
    enum class DiodeType
    {
        Silicon,     // 0.7V threshold, 1.0 asymmetry
        Germanium,   // 0.3V threshold, 1.2 asymmetry
        LED          // 1.5V threshold, 1.0 asymmetry
    };

    //==============================================================================
    DiodeType diodeType = DiodeType::Silicon;
    float drive = 1.0f;        // 1.0 to 10.0
    float filter = 0.5f;       // Lowpass filter cutoff (0.0 to 1.0)
    float output = 1.0f;       // Output level

    //==============================================================================
    float threshold = 0.7f;    // Diode forward voltage
    float asymmetry = 1.0f;    // Asymmetric clipping amount

    //==============================================================================
    RATDistortion() = default;

    //==============================================================================
    /** Initialize RAT distortion */
    void prepare(double sampleRate);

    /** Reset filter state */
    void reset();

    //==============================================================================
    /** Set diode type (updates threshold and asymmetry) */
    void setDiodeType(DiodeType type);

    //==============================================================================
    /** Process single sample through RAT distortion */
    float processSample(float input);

    //==============================================================================
    // Pre-filter (anti-aliasing)
    juce::dsp::FirstOrderTPTFilter<float> preFilter;

    // Tone filter (user-adjustable lowpass)
    juce::dsp::FirstOrderTPTFilter<float> toneFilter;

    // Filter state (per-channel)
    float filterState = 0.0f;

    double sr = 48000.0;
};

/**
 * Pedal types for 8-slot pedalboard
 */
enum class PedalType
{
    Compressor,   // JUCE built-in compressor
    Octaver,      // Octave down (simple pitch shifter)
    Overdrive,    // Soft clipping (tube-like)
    Distortion,   // Hard clipping (aggressive)
    RAT,          // Custom RAT distortion
    Phaser,       // JUCE built-in phaser
    Reverb,       // JUCE built-in reverb
    Bypass        // No effect
};

/**
 * Single pedal slot with dry/wet mix
 *
 * Each pedal has:
 * - type: Effect type
 * - enabled: Bypass switch
 * - param1: Primary parameter (e.g., drive, rate)
 * - param2: Secondary parameter (e.g., tone, depth)
 * - mix: Dry/wet mix (0.0 = dry, 1.0 = wet)
 */
struct Pedal
{
    //==============================================================================
    PedalType type = PedalType::Bypass;
    bool enabled = false;
    float param1 = 0.5f;  // Primary parameter
    float param2 = 0.5f;  // Secondary parameter
    float mix = 1.0f;     // Dry/wet mix (0.0 = dry, 1.0 = wet)

    //==============================================================================
    // JUCE DSP processors (for built-in effects)
    juce::dsp::Compressor<float> compressor;
    juce::dsp::Phaser<float> phaser;
    juce::dsp::Reverb reverb;

    // Custom RAT distortion
    RATDistortion rat;

    //==============================================================================
    /** Initialize pedal processors */
    void prepare(double sampleRate, int samplesPerBlock);

    /** Process single sample through pedal */
    float processSample(float input);
};

/**
 * 8-Pedal Pedalboard with configurable routing
 *
 * Features:
 * - 8 pedal slots
 * - Series or parallel routing
 * - Configurable pedal order
 * - Bypass optimization (skip disabled pedals)
 *
 * CPU Target: < 5% with all pedals enabled
 * Realtime Safety: No allocations in processSample()
 */
struct Pedalboard
{
    //==============================================================================
    std::array<Pedal, 8> pedals;
    std::array<int, 8> routingOrder = {0, 1, 2, 3, 4, 5, 6, 7};  // Default series
    bool parallelMode = false;  // If true, pedals run in parallel

    //==============================================================================
    /** Initialize all pedals */
    void prepare(double sampleRate, int samplesPerBlock);

    //==============================================================================
    /** Process single sample through pedalboard */
    float processSample(float input);

    //==============================================================================
    /** Set pedal type and enable/disable */
    void setPedal(int index, PedalType type, bool enable);

    /** Set routing order (for series mode) */
    void setRouting(int index, int pedalIndex);
};

//==============================================================================
// Component 8: MIDI Handler (Week 3)
//==============================================================================

/**
 * MIDI message handler for polyphonic synthesizer
 *
 * Features:
 * - NoteOn/NoteOff
 * - Pitch bend (±2 semitones)
 * - Mod wheel → bridge coupling
 * - All notes off
 */
struct MIDIHandler
{
    //==============================================================================
    VoiceManager& voiceManager;

    //==============================================================================
    float pitchBendRange = 2.0f;  // ±2 semitones
    float modulationAmount = 0.0f;  // Mod wheel
    float currentPitchBend = 0.0f;  // -8192 to +8192

    //==============================================================================
    MIDIHandler(VoiceManager& vm) : voiceManager(vm) {}

    /** Process MIDI buffer */
    void processMidi(juce::MidiBuffer& midiMessages);

    /** Apply pitch bend to all active voices */
    void applyPitchBend();

    /** Apply modulation to all active voices */
    void applyModulation();
};

//==============================================================================
// Main DSP Engine: Kane Marco Aether String
//==============================================================================

/**
 * Complete physical string modeling synthesizer
 *
 * Signal Path:
 * MIDI → Exciter → Waveguide String → Bridge Coupling → Body Resonator → Pedalboard → Output
 *               ↑                                    ↑
 *         Articulation FSM                    Modal Synthesis (8 modes)
 *
 * Polyphony: 6 voices (guitar strings)
 * Sample Rates: 44.1k, 48k, 88.2k, 96k supported
 * CPU Target: < 20% (6 voices at 48kHz)
 */
class KaneMarcoAetherStringDSP : public juce::AudioProcessor
{
public:
    //==============================================================================
    KaneMarcoAetherStringDSP();
    ~KaneMarcoAetherStringDSP() override;

    //==============================================================================
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

    void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    //==============================================================================
    juce::AudioProcessorEditor* createEditor() override { return nullptr; }
    const juce::String getName() const override { return "Kane Marco Aether String"; }
    bool hasEditor() const override { return false; }

    //==============================================================================
    double getTailLengthSeconds() const override { return 0.0; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }

    //==============================================================================
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    //==============================================================================
    void getStateInformation(juce::MemoryBlock&) override {}
    void setStateInformation(const void*, int) override {}

    //==============================================================================
    // For testing: Direct access to DSP components
    WaveguideString& getTestString() { return testString; }
    BridgeCoupling& getTestBridge() { return testBridge; }
    ModalBodyResonator& getTestBody() { return testBody; }
    VoiceManager& getVoiceManager() { return voiceManager; }

private:
    //==============================================================================
    // Week 3: Polyphony and MIDI
    VoiceManager voiceManager;
    std::unique_ptr<MIDIHandler> midiHandler;

    // Test components (for unit testing)
    WaveguideString testString;
    BridgeCoupling testBridge;
    ModalBodyResonator testBody;

    // Realtime-safe parameter smoothing
    std::atomic<float> masterGain { 0.8f };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(KaneMarcoAetherStringDSP)
};
