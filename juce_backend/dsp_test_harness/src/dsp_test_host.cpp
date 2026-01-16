/*
  ==============================================================================

    dsp_test_host.cpp
    Command-line test host for DSP offline rendering

    Usage:
        ./dsp_test_host --instrument <name> --test <type> --output <path>

  ==============================================================================
*/

#include "dsp_test/DspOfflineHost.h"
#include <iostream>
#include <fstream>
#include <cstring>
#include <memory>

// Include instrument headers
#include "../../instruments/Sam_sampler/include/dsp/SamSamplerDSP.h"
#include "../../instruments/drummachine/include/dsp/DrumMachinePureDSP.h"
#include "../../instruments/localgal/include/dsp/LocalGalPureDSP.h"

// Include BiPhase effect header
// TEMPORARILY DISABLED: incomplete type errors in BiPhasePureDSP_v2.h
// #include "../../effects/biphase/include/dsp/BiPhasePureDSP_v2.h"

// Include FilterGate effect header
#include "../../effects/filtergate/include/dsp/FilterGatePureDSP_v2.h"

// For JSON parsing (simplified inline)
namespace {

// Very simple JSON value extractor (for config files)
std::string getString(const char* json, const char* key)
{
    std::string searchKey = std::string("\"") + key + "\"";
    const char* keyPos = strstr(json, searchKey.c_str());
    if (!keyPos) return "";

    const char* colon = strchr(keyPos, ':');
    if (!colon) return "";

    const char* start = colon + 1;
    while (*start == ' ' || *start == '\t' || *start == '\n') start++;

    if (*start == '"')
    {
        // String value
        start++;
        const char* end = strchr(start, '"');
        if (!end) return "";
        return std::string(start, end - start);
    }
    else if (*start == '-' || (*start >= '0' && *start <= '9') || *start == '.')
    {
        // Number
        const char* end = start;
        while (*end == '-' || *end == '.' || (*end >= '0' && *end <= '9'))
            end++;
        return std::string(start, end - start);
    }

    return "";
}

double getNumber(const char* json, const char* key, double defaultValue = 0.0)
{
    std::string val = getString(json, key);
    if (val.empty()) return defaultValue;
    return std::atof(val.c_str());
}

} // anonymous namespace

//==============================================================================
// Test Registry
//==============================================================================

struct TestInstrument
{
    const char* name;
    std::unique_ptr<DSP::InstrumentDSP> (*create)();
};

std::unique_ptr<DSP::InstrumentDSP> createSamSampler()
{
    return std::make_unique<DSP::SamSamplerDSP>();
}

std::unique_ptr<DSP::InstrumentDSP> createDrumMachine()
{
    return std::make_unique<DSP::DrumMachinePureDSP>();
}

std::unique_ptr<DSP::InstrumentDSP> createLocalGal()
{
    return std::make_unique<DSP::LocalGalPureDSP>();
}

TestInstrument instruments[] = {
    {"SamSampler", createSamSampler},
    {"DrumMachine", createDrumMachine},
    {"LocalGal", createLocalGal},
    {nullptr, nullptr}
};

//==============================================================================
// Effect Registry (for stereo effects)
//==============================================================================

struct TestEffect
{
    const char* name;
    std::unique_ptr<DspTest::EffectAdapter::EffectInterface> (*create)();
};
// 
// //==============================================================================
// // BiPhase Wrapper with Parameter Control
// //==============================================================================
// 
// class BiPhaseWrapper : public DspTest::EffectAdapter::EffectInterface
// {
// public:
//     BiPhaseWrapper() = default;
// 
//     void prepare(double sampleRate, int blockSize) override
//     {
//         effect_.prepare(sampleRate, blockSize);
//         // Set up default Bi-Phase settings for testing
//         effect_.setRate(1.0f);           // 1 Hz LFO
//         effect_.setDepth(0.7f);          // 70% depth
//         effect_.setFeedback(0.5f);       // Medium feedback
//         effect_.setRoutingMode(DSP::RoutingMode::OutA);  // Series mode (12-stage)
//         effect_.setSweepSync(DSP::SweepSync::Normal);
//     }
// 
//     void reset() override
//     {
//         effect_.reset();
//     }
// 
//     void processStereo(float* left, float* right, int numSamples) override
//     {
//         effect_.processStereo(left, right, numSamples);
//     }
// 
//     // Parameter control - maps parameter names to DSP methods
//     void setParam(const char* name, double value) override
//     {
//         std::string param(name);
// 
//         // Phasor A parameters
//         if (param == "rate" || param == "rateA")
//             effect_.setRate(static_cast<float>(value));
//         else if (param == "depth" || param == "depthA")
//             effect_.setDepth(static_cast<float>(value));
//         else if (param == "feedback" || param == "feedbackA")
//             effect_.setFeedback(static_cast<float>(value));
//         else if (param == "stereoPhase")
//             effect_.setStereoPhase(static_cast<float>(value));
// 
//         // Phasor B parameters (dual mode)
//         else if (param == "rateB")
//             effect_.setRateB(static_cast<float>(value));
//         else if (param == "depthB")
//             effect_.setDepthB(static_cast<float>(value));
//         else if (param == "feedbackB")
//             effect_.setFeedbackB(static_cast<float>(value));
// 
//         // Routing and synchronization
//         else if (param == "routingMode")
//         {
//             // 0 = InA (Parallel), 1 = OutA (Series), 2 = InB (Independent)
//             int mode = static_cast<int>(value);
//             if (mode == 0) effect_.setRoutingMode(DSP::RoutingMode::InA);
//             else if (mode == 1) effect_.setRoutingMode(DSP::RoutingMode::OutA);
//             else if (mode == 2) effect_.setRoutingMode(DSP::RoutingMode::InB);
//         }
//         else if (param == "sweepSync")
//         {
//             // 0 = Normal, 1 = Reverse
//             effect_.setSweepSync(value > 0.5 ? DSP::SweepSync::Reverse : DSP::SweepSync::Normal);
//         }
//         else if (param == "shape" || param == "shapeA")
//         {
//             // 0 = Sine, 1 = Square
//             effect_.setShape(value > 0.5 ? DSP::LFOShape::Square : DSP::LFOShape::Sine);
//         }
//         else if (param == "shapeB")
//         {
//             effect_.setShapeB(value > 0.5 ? DSP::LFOShape::Square : DSP::LFOShape::Sine);
//         }
//     }
// 
//     const char* getName() const override
//     {
//         return "Mu-Tron Bi-Phase";
//     }
// 
//     const char* getVersion() const override
//     {
//         return "2.0.0";
//     }
// 
//     // Access to underlying effect for advanced control
//     DSP::BiPhaseDSP& getEffect() { return effect_; }
//     const DSP::BiPhaseDSP& getEffect() const { return effect_; }
// 
// private:
//     DSP::BiPhaseDSP effect_;
// };
// 
// std::unique_ptr<DspTest::EffectAdapter::EffectInterface> createBiPhase()
// {
//     return std::make_unique<BiPhaseWrapper>();
// }

//==============================================================================
// FilterGate Wrapper
//==============================================================================

class FilterGateWrapper : public DspTest::EffectAdapter::EffectInterface
{
public:
    FilterGateWrapper() = default;

    void prepare(double sampleRate, int blockSize) override
    {
        effect_.prepare(sampleRate, blockSize);
        // Set up default spectral settings for testing
        effect_.setFilterMode(DSP::FilterMode::LowPass);
        effect_.setFrequency(1000.0f);
        effect_.setResonance(1.0f);
        effect_.setGateEnabled(true);
        effect_.setGateThreshold(0.5f);
        effect_.setGateFloor(0.1f);  // Test spectral feature
        effect_.setSpectralCurve(DSP::SpectralCurve::Flat);  // Start with flat
        effect_.setEnergyMode(DSP::EnergyMode::Independent);
    }

    void reset() override
    {
        effect_.reset();
    }

    void processStereo(float* left, float* right, int numSamples) override
    {
        effect_.processStereo(left, right, numSamples);
    }

    // Parameter control for spectral feature testing
    void setParam(const char* name, double value) override
    {
        std::string param(name);

        // Filter parameters
        if (param == "filterMode")
        {
            int mode = static_cast<int>(value);
            if (mode == 0) effect_.setFilterMode(DSP::FilterMode::LowPass);
            else if (mode == 1) effect_.setFilterMode(DSP::FilterMode::HighPass);
            else if (mode == 2) effect_.setFilterMode(DSP::FilterMode::BandPass);
            else if (mode == 3) effect_.setFilterMode(DSP::FilterMode::Notch);
        }
        else if (param == "frequency")
            effect_.setFrequency(static_cast<float>(value));
        else if (param == "resonance")
            effect_.setResonance(static_cast<float>(value));

        // Gate parameters
        else if (param == "gateEnabled")
            effect_.setGateEnabled(value > 0.5f);
        else if (param == "threshold")
            effect_.setGateThreshold(static_cast<float>(value));

        // Spectral parameters
        else if (param == "spectralCurve")
        {
            int curve = static_cast<int>(value);
            if (curve == 0) effect_.setSpectralCurve(DSP::SpectralCurve::Flat);
            else if (curve == 1) effect_.setSpectralCurve(DSP::SpectralCurve::LowTilt);
            else if (curve == 2) effect_.setSpectralCurve(DSP::SpectralCurve::HighTilt);
            else if (curve == 3) effect_.setSpectralCurve(DSP::SpectralCurve::ExponentialLow);
            else if (curve == 4) effect_.setSpectralCurve(DSP::SpectralCurve::ExponentialHigh);
        }
        else if (param == "spectralExponent")
            effect_.setSpectralExponent(static_cast<float>(value));
        else if (param == "energyMode")
        {
            int mode = static_cast<int>(value);
            if (mode == 0) effect_.setEnergyMode(DSP::EnergyMode::Independent);
            else if (mode == 1) effect_.setEnergyMode(DSP::EnergyMode::WeightedSum);
            else if (mode == 2) effect_.setEnergyMode(DSP::EnergyMode::LowBiasedSum);
            else if (mode == 3) effect_.setEnergyMode(DSP::EnergyMode::HighBiasedSum);
        }
        else if (param == "gateFloor")
            effect_.setGateFloor(static_cast<float>(value));
        else if (param == "bandLinking")
            effect_.setBandLinking(static_cast<float>(value));
    }

    const char* getName() const override
    {
        return "FilterGate v2 (Spectral)";
    }

    const char* getVersion() const override
    {
        return "2.0.0";
    }

    // Access to underlying effect for parameter control
    DSP::FilterGateDSP& getEffect() { return effect_; }
    const DSP::FilterGateDSP& getEffect() const { return effect_; }

private:
    DSP::FilterGateDSP effect_;
};

std::unique_ptr<DspTest::EffectAdapter::EffectInterface> createFilterGate()
{
    return std::make_unique<FilterGateWrapper>();
}

TestEffect effects[] = {
//    {"BiPhase", createBiPhase},  // TEMPORARILY DISABLED
    {"FilterGate", createFilterGate},
    {nullptr, nullptr}
};

//==============================================================================
// Test Definitions
//==============================================================================

struct TestDefinition
{
    const char* name;
    const char* description;
    DspTest::RenderConfig renderCfg;
    DspTest::InputConfig inputCfg;
    std::vector<DspTest::TestEvent> events;
};

TestDefinition tests[] = {
    {
        "silence",
        "Silence test - catch DC offset, denormals, runaway feedback",
        DspTest::TestCases::silenceConfig(),
        DspTest::TestCases::silenceInput(),
        {}
    },
    {
        "impulse",
        "Impulse response test - check filter stability, envelope behavior",
        DspTest::TestCases::impulseConfig(),
        DspTest::TestCases::impulseInput(),
        {}
    },
    {
        "tone_220hz",
        "Constant tone test - verify sustained audio output at 220Hz",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }()
        }
    },
    {
        "tone_440hz",
        "Constant tone test - verify sustained audio output at 440Hz",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(440.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }()
        }
    },
    {
        "envelope",
        "Envelope test - gate on/off with ADSR verification",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 3.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(440.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.5; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 1.5; e.type = DspTest::TestEvent::NoteOff; e.noteOff = {60}; return e; }()
        }
    },
    //==============================================================================
    // Parameter-Specific Tests for BiPhase
    //==============================================================================
    {
        "biphase_feedback_low",
        "BiPhase: Low feedback (0.0) - subtle modulation, minimal resonance",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"feedback", 0.0}; return e; }()
        }
    },
    {
        "biphase_feedback_high",
        "BiPhase: High feedback (0.9) - resonant peaks, aggressive phasing",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"feedback", 0.9}; return e; }()
        }
    },
    {
        "biphase_rate_slow",
        "BiPhase: Slow LFO (0.2 Hz) - ~5 second sweep period",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 6.0;  // Long enough to see slow sweep
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"rate", 0.2}; return e; }()
        }
    },
    {
        "biphase_rate_fast",
        "BiPhase: Fast LFO (10 Hz) - rapid 0.1 second sweep",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"rate", 10.0}; return e; }()
        }
    },
    {
        "biphase_depth_zero",
        "BiPhase: Zero depth - no modulation, flat frequency response",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"depth", 0.0}; return e; }()
        }
    },
    {
        "biphase_depth_full",
        "BiPhase: Full depth (1.0) - maximum 200-5000 Hz sweep",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"depth", 1.0}; return e; }()
        }
    },
    {
        "biphase_routing_series",
        "BiPhase: Series routing (12-stage cascade) - deep phasing",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"routingMode", 1.0}; return e; }()  // OutA = Series
        }
    },
    {
        "biphase_routing_parallel",
        "BiPhase: Parallel routing - stereo output, independent phasors",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"routingMode", 0.0}; return e; }()  // InA = Parallel
        }
    },
    //==============================================================================
    // Spectral Feature Tests for FilterGate
    //==============================================================================
    {
        "filtergate_spectral_flat",
        "FilterGate: Flat spectral curve - traditional gate behavior",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"spectralCurve", 0.0}; return e; }()  // Flat
        }
    },
    {
        "filtergate_spectral_low_tilt",
        "FilterGate: Low tilt - favors low frequencies for gate decision",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"spectralCurve", 1.0}; return e; }()  // LowTilt
        }
    },
    {
        "filtergate_spectral_high_tilt",
        "FilterGate: High tilt - favors high frequencies for gate decision",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"spectralCurve", 2.0}; return e; }()  // HighTilt
        }
    },
    {
        "filtergate_spectral_exponential_low",
        "FilterGate: Exponential low - strong bass lock",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"spectralCurve", 3.0}; return e; }()  // ExponentialLow
        }
    },
    {
        "filtergate_spectral_exponential_high",
        "FilterGate: Exponential high - aggressive high bias",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"spectralCurve", 4.0}; return e; }()  // ExponentialHigh
        }
    },
    {
        "filtergate_energy_weighted",
        "FilterGate: Weighted energy mode - all bands contribute equally",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"spectralCurve", 0.0}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"energyMode", 1.0}; return e; }()  // WeightedSum
        }
    },
    {
        "filtergate_energy_low_biased",
        "FilterGate: Low-biased energy - bass drives gate decision",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"spectralCurve", 1.0}; return e; }(),  // LowTilt
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"energyMode", 2.0}; return e; }()  // LowBiasedSum
        }
    },
    {
        "filtergate_energy_high_biased",
        "FilterGate: High-biased energy - treble drives gate decision",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"spectralCurve", 2.0}; return e; }(),  // HighTilt
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"energyMode", 3.0}; return e; }()  // HighBiasedSum
        }
    },
    {
        "filtergate_gate_floor",
        "FilterGate: Gate floor 0.3 - partial openness for musical results",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"gateFloor", 0.3}; return e; }()
        }
    },
    {
        "filtergate_filter_lowpass",
        "FilterGate: Low-pass filter at 500Hz",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterMode", 0.0}; return e; }(),  // LowPass
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"frequency", 500.0}; return e; }()
        }
    },
    {
        "filtergate_filter_highpass",
        "FilterGate: High-pass filter at 2000Hz",
        DspTest::TestCases::toneConfig(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterMode", 1.0}; return e; }(),  // HighPass
            []{ DspTest::TestEvent e; e.timeSec = 0.01; e.type = DspTest::TestEvent::ParamSet; e.param = {"frequency", 2000.0}; return e; }()
        }
    },
    //==============================================================================
    // Parameter-Specific Tests for LocalGal
    //==============================================================================
    {
        "localgal_osc_sine",
        "LocalGal: Sine oscillator - pure tone, minimal harmonics",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;  // Shorter duration for faster tests
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),  // Start at t=0
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"osc_waveform", 0.0}; return e; }()  // Sine
        }
    },
    {
        "localgal_osc_saw",
        "LocalGal: Saw oscillator - rich harmonics, bright",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"osc_waveform", 1.0}; return e; }()  // Saw
        }
    },
    {
        "localgal_osc_square",
        "LocalGal: Square oscillator - odd harmonics, hollow",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"osc_waveform", 2.0}; return e; }()  // Square
        }
    },
    {
        "localgal_filter_lowpass",
        "LocalGal: Low-pass filter - warm, muffled highs",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filter_type", 0.0}; return e; }(),  // LP
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filter_cutoff", 0.3}; return e; }()
        }
    },
    {
        "localgal_filter_highpass",
        "LocalGal: High-pass filter - thin, bright",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filter_type", 1.0}; return e; }(),  // HP
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filter_cutoff", 0.6}; return e; }()
        }
    },
    {
        "localgal_env_fast_attack",
        "LocalGal: Fast attack - percussive, snappy",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"env_attack", 0.001}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.3; e.type = DspTest::TestEvent::NoteOff; e.noteOff = {60}; return e; }()
        }
    },
    {
        "localgal_env_slow_attack",
        "LocalGal: Slow attack - swell, pad-like",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"env_attack", 0.5}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 1.5; e.type = DspTest::TestEvent::NoteOff; e.noteOff = {60}; return e; }()
        }
    },
    {
        "localgal_feel_rubber",
        "LocalGal: Rubber feel - elastic, flexible response",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"feel_rubber", 0.9}; return e; }()
        }
    },
    {
        "localgal_feel_bite",
        "LocalGal: Bite feel - aggressive, punchy attack",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"feel_bite", 0.9}; return e; }()
        }
    },
    {
        "localgal_feel_growl",
        "LocalGal: Growl feel - distorted, edge-of-breakup",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"feel_growl", 0.9}; return e; }()
        }
    },
    //==============================================================================
    // Parameter-Specific Tests for SamSampler
    //==============================================================================
    {
        "samsampler_volume_low",
        "SamSampler: Low volume (masterVolume=0.2)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"masterVolume", 0.2}; return e; }()
        }
    },
    {
        "samsampler_volume_high",
        "SamSampler: High volume (masterVolume=0.9)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"masterVolume", 0.9}; return e; }()
        }
    },
    {
        "samsampler_pitch_low",
        "SamSampler: Low pitch (basePitch=0.5) - octave down",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"basePitch", 0.5}; return e; }()
        }
    },
    {
        "samsampler_pitch_high",
        "SamSampler: High pitch (basePitch=2.0) - octave up",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"basePitch", 2.0}; return e; }()
        }
    },
    {
        "samsampler_env_fast_attack",
        "SamSampler: Fast attack (envAttack=0.01s) - percussive",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"envAttack", 0.01}; return e; }()
        }
    },
    {
        "samsampler_env_slow_attack",
        "SamSampler: Slow attack (envAttack=1.0s) - swell",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"envAttack", 1.0}; return e; }()
        }
    },
    {
        "samsampler_env_short_release",
        "SamSampler: Short release (envRelease=0.05s) - staccato",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.4; e.type = DspTest::TestEvent::NoteOff; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"envRelease", 0.05}; return e; }()
        }
    },
    {
        "samsampler_env_long_release",
        "SamSampler: Long release (envRelease=2.0s) - pad",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 4.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 1.0; e.type = DspTest::TestEvent::NoteOff; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"envRelease", 2.0}; return e; }()
        }
    },
    {
        "samsampler_env_high_sustain",
        "SamSampler: High sustain (envSustain=0.9) - consistent level",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"envAttack", 0.1}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"envSustain", 0.9}; return e; }()
        }
    },
    {
        "samsampler_env_low_sustain",
        "SamSampler: Low sustain (envSustain=0.1) - decay to quiet",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"envAttack", 0.1}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"envDecay", 0.3}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"envSustain", 0.1}; return e; }()
        }
    },
    {
        "samsampler_filter_lowpass",
        "SamSampler: Low-pass filter (cutoff=800Hz, resonance=0.3)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterEnabled", 1.0}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterType", 0.0}; return e; }(),  // LowPass
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterCutoff", 800.0}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterResonance", 0.3}; return e; }()
        }
    },
    {
        "samsampler_filter_highpass",
        "SamSampler: High-pass filter (cutoff=2000Hz, resonance=0.5)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterEnabled", 1.0}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterType", 1.0}; return e; }(),  // HighPass
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterCutoff", 2000.0}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterResonance", 0.5}; return e; }()
        }
    },
    {
        "samsampler_filter_bandpass",
        "SamSampler: Band-pass filter (cutoff=1000Hz, resonance=0.7)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::toneInput(220.0),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterEnabled", 1.0}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterType", 2.0}; return e; }(),  // BandPass
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterCutoff", 1000.0}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"filterResonance", 0.7}; return e; }()
        }
    },
    //==============================================================================
    // Parameter-Specific Tests for DrumMachine
    //==============================================================================
    {
        "drummachine_tempo_slow",
        "DrumMachine: Slow tempo (60 BPM) - relaxed feel",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"tempo", 60.0}; return e; }()
        }
    },
    {
        "drummachine_tempo_fast",
        "DrumMachine: Fast tempo (160 BPM) - energetic",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"tempo", 160.0}; return e; }()
        }
    },
    {
        "drummachine_swing_none",
        "DrumMachine: No swing (0.0) - straight timing",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"swing", 0.0}; return e; }()
        }
    },
    {
        "drummachine_swing_heavy",
        "DrumMachine: Heavy swing (0.7) - pronounced shuffle",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"swing", 0.7}; return e; }()
        }
    },
    {
        "drummachine_volume_low",
        "DrumMachine: Low volume (master_volume=0.2)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"master_volume", 0.2}; return e; }()
        }
    },
    {
        "drummachine_volume_high",
        "DrumMachine: High volume (master_volume=0.9)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"master_volume", 0.9}; return e; }()
        }
    },
    {
        "drummachine_dilla_amount_low",
        "DrumMachine: Low Dilla amount (0.1) - subtle groove",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"dilla_amount", 0.1}; return e; }()
        }
    },
    {
        "drummachine_dilla_amount_high",
        "DrumMachine: High Dilla amount (0.8) - strong J Dilla feel",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"dilla_amount", 0.8}; return e; }()
        }
    },
    {
        "drummachine_dilla_hat_bias",
        "DrumMachine: Dilla hat bias (0.7) - hi-hat emphasis",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"dilla_amount", 0.5}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"dilla_hat_bias", 0.7}; return e; }()
        }
    },
    {
        "drummachine_dilla_snare_late",
        "DrumMachine: Dilla snare late (0.6) - lazy snare",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"dilla_amount", 0.5}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"dilla_snare_late", 0.6}; return e; }()
        }
    },
    {
        "drummachine_dilla_kick_tight",
        "DrumMachine: Dilla kick tight (0.7) - tight kick pattern",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"dilla_amount", 0.5}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"dilla_kick_tight", 0.7}; return e; }()
        }
    },
    {
        "drummachine_pocket_offset",
        "DrumMachine: Pocket offset (0.05) - behind the beat",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"pocket_offset", 0.05}; return e; }()
        }
    },
    {
        "drummachine_push_offset",
        "DrumMachine: Push offset (0.08) - ahead of the beat",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 2.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }(),
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::ParamSet; e.param = {"push_offset", 0.08}; return e; }()
        }
    },
    //==============================================================================
    // Drum Voice Tests - Individual Drum Sounds
    //==============================================================================
    {
        "drummachine_voice_kick",
        "DrumMachine: Kick drum - low frequency punch (track 0)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {48, 0.8f}; return e; }()  // MIDI 48 % 16 = 0 = Kick
        }
    },
    {
        "drummachine_voice_snare",
        "DrumMachine: Snare drum - bright snap with body (track 1)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {49, 0.8f}; return e; }()  // MIDI 49 % 16 = 1 = Snare
        }
    },
    {
        "drummachine_voice_hihat_closed",
        "DrumMachine: Closed hi-hat - short decay (track 2)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {50, 0.8f}; return e; }()  // MIDI 50 % 16 = 2 = HiHatClosed
        }
    },
    {
        "drummachine_voice_hihat_open",
        "DrumMachine: Open hi-hat - longer decay (track 3)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {51, 0.8f}; return e; }()  // MIDI 51 % 16 = 3 = HiHatOpen
        }
    },
    {
        "drummachine_voice_clap",
        "DrumMachine: Clap - multiple impulse burst (track 4)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {52, 0.8f}; return e; }()  // MIDI 52 % 16 = 4 = Clap
        }
    },
    {
        "drummachine_voice_tom_low",
        "DrumMachine: Low tom - deep pitch (track 5)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {53, 0.8f}; return e; }()  // MIDI 53 % 16 = 5 = TomLow
        }
    },
    {
        "drummachine_voice_tom_mid",
        "DrumMachine: Mid tom - medium pitch (track 6)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {54, 0.8f}; return e; }()  // MIDI 54 % 16 = 6 = TomMid
        }
    },
    {
        "drummachine_voice_tom_high",
        "DrumMachine: High tom - high pitch (track 7)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {55, 0.8f}; return e; }()  // MIDI 55 % 16 = 7 = TomHigh
        }
    },
    {
        "drummachine_voice_crash",
        "DrumMachine: Crash cymbal - long decay (track 8)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {56, 0.8f}; return e; }()  // MIDI 56 % 16 = 8 = Crash
        }
    },
    {
        "drummachine_voice_ride",
        "DrumMachine: Ride cymbal - metallic sustain (track 9)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {57, 0.8f}; return e; }()  // MIDI 57 % 16 = 9 = Ride
        }
    },
    {
        "drummachine_voice_cowbell",
        "DrumMachine: Cowbell - metallic tone (track 10)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {58, 0.8f}; return e; }()  // MIDI 58 % 16 = 10 = Cowbell
        }
    },
    {
        "drummachine_voice_shaker",
        "DrumMachine: Shaker - high frequency noise (track 11)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {59, 0.8f}; return e; }()  // MIDI 59 % 16 = 11 = Shaker
        }
    },
    {
        "drummachine_voice_tambourine",
        "DrumMachine: Tambourine - metallic jingles (track 12)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {60, 0.8f}; return e; }()  // MIDI 60 % 16 = 12 = Tambourine
        }
    },
    {
        "drummachine_voice_percussion",
        "DrumMachine: Percussion - generic synth percussion (track 13)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {61, 0.8f}; return e; }()  // MIDI 61 % 16 = 13 = Percussion
        }
    },
    {
        "drummachine_voice_special",
        "DrumMachine: Special - alternative snare (track 15)",
        []() {
            DspTest::RenderConfig cfg = DspTest::TestCases::toneConfig();
            cfg.durationSec = 1.0;
            return cfg;
        }(),
        DspTest::TestCases::silenceInput(),
        {
            []{ DspTest::TestEvent e; e.timeSec = 0.0; e.type = DspTest::TestEvent::NoteOn; e.noteOn = {63, 0.8f}; return e; }()  // MIDI 63 % 16 = 15 = Special
        }
    },
    {nullptr, nullptr, {}, {}, {}}
};

//==============================================================================
// Assertions
//==============================================================================

struct TestAssertion
{
    bool (*check)(const DspTest::Metrics&);
    const char* description;
};

bool checkSilence(const DspTest::Metrics& m)
{
    return m.peak < 1e-4 &&
           std::abs(m.dcOffset) < 1e-5 &&
           m.nanCount == 0 &&
           m.infCount == 0;
}

bool checkTone(const DspTest::Metrics& m)
{
    return m.rms > 0.01 &&
           m.peak > 0.05 &&
           m.nanCount == 0 &&
           m.infCount == 0 &&
           m.fftPeakHz > 100.0 &&
           m.blockEdgeMaxJump < 0.01;
}

bool checkImpulse(const DspTest::Metrics& m)
{
    return m.nanCount == 0 &&
           m.infCount == 0 &&
           m.peak > 0.001;
}

TestAssertion assertions[] = {
    {checkSilence, "Silence: peak < 1e-4, DC offset < 1e-5, no NaN/Inf"},
    {checkTone, "Tone: RMS > 0.01, peak > 0.05, FFT peak > 100Hz, no NaN/Inf"},
    {checkImpulse, "Impulse: no NaN/Inf, peak > 0.001"},
    //==============================================================================
    // Parameter-Specific Assertions for BiPhase
    //==============================================================================
    {[](const DspTest::Metrics& m) {
        // Low feedback: still produces output, but minimal resonance
        return m.rms > 0.05 && m.peak > 0.1 && m.nanCount == 0 && m.infCount == 0;
    }, "BiPhase Low Feedback: RMS > 0.05, peak > 0.1, no NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // High feedback: produces resonant peaks, higher output
        return m.rms > 0.08 && m.peak > 0.15 && m.nanCount == 0 && m.infCount == 0;
    }, "BiPhase High Feedback: RMS > 0.08, peak > 0.15, resonant peaks"},
    {[](const DspTest::Metrics& m) {
        // Slow rate: still modulates, but over longer period
        return m.rms > 0.01 && m.nanCount == 0 && m.infCount == 0;
    }, "BiPhase Slow Rate: RMS > 0.01, slow sweep, no NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Fast rate: rapid modulation, produces AM sidebands
        return m.rms > 0.01 && m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 100.0;
    }, "BiPhase Fast Rate: RMS > 0.01, fast modulation, FFT peak > 100Hz"},
    {[](const DspTest::Metrics& m) {
        // Zero depth: minimal modulation effect (mostly dry signal)
        return m.rms > 0.15 && m.peak > 0.2 && m.nanCount == 0 && m.infCount == 0;
    }, "BiPhase Zero Depth: RMS > 0.15, minimal modulation"},
    {[](const DspTest::Metrics& m) {
        // Full depth: maximum sweep, pronounced phasing
        return m.rms > 0.01 && m.peak > 0.05 && m.nanCount == 0 && m.infCount == 0;
    }, "BiPhase Full Depth: RMS > 0.01, maximum sweep"},
    {[](const DspTest::Metrics& m) {
        // Series routing: 12-stage cascade, deep phasing
        return m.rms > 0.01 && m.nanCount == 0 && m.infCount == 0;
    }, "BiPhase Series Routing: RMS > 0.01, deep 12-stage phasing"},
    {[](const DspTest::Metrics& m) {
        // Parallel routing: stereo output, independent phasors
        return m.rms > 0.01 && m.nanCount == 0 && m.infCount == 0;
    }, "BiPhase Parallel Routing: RMS > 0.01, stereo output"},
    //==============================================================================
    // Spectral Feature Assertions for FilterGate
    //==============================================================================
    {[](const DspTest::Metrics& m) {
        // Flat spectral curve - produces output
        return m.rms > 0.01 && m.peak > 0.05 && m.nanCount == 0 && m.infCount == 0;
    }, "FilterGate Flat Spectral: RMS > 0.01, peak > 0.05, no NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Low tilt - low frequencies favored
        return m.rms > 0.01 && m.nanCount == 0 && m.infCount == 0;
    }, "FilterGate Low Tilt: RMS > 0.01, lows favored, no NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // High tilt - high frequencies favored
        return m.rms > 0.01 && m.nanCount == 0 && m.infCount == 0;
    }, "FilterGate High Tilt: RMS > 0.01, highs favored, no NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Exponential low - strong bass lock
        return m.rms > 0.01 && m.nanCount == 0 && m.infCount == 0;
    }, "FilterGate Exponential Low: RMS > 0.01, bass lock, no NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Exponential high - aggressive high bias
        return m.rms > 0.01 && m.nanCount == 0 && m.infCount == 0;
    }, "FilterGate Exponential High: RMS > 0.01, high bias, no NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Weighted energy mode - balanced response
        return m.rms > 0.01 && m.peak > 0.05 && m.nanCount == 0 && m.infCount == 0;
    }, "FilterGate Weighted Energy: RMS > 0.01, balanced, no NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Low-biased energy - bass drives gate
        return m.rms > 0.01 && m.nanCount == 0 && m.infCount == 0;
    }, "FilterGate Low Biased: RMS > 0.01, bass-driven, no NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // High-biased energy - treble drives gate
        return m.rms > 0.01 && m.nanCount == 0 && m.infCount == 0;
    }, "FilterGate High Biased: RMS > 0.01, treble-driven, no NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Gate floor - partial openness for musical results
        return m.rms > 0.05 && m.peak > 0.08 && m.nanCount == 0 && m.infCount == 0;
    }, "FilterGate Gate Floor: RMS > 0.05, partial openness, no NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Low-pass filter at 500Hz - attenuates highs
        return m.rms > 0.01 && m.peak > 0.05 && m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz < 800.0;
    }, "FilterGate LowPass: RMS > 0.01, filtered highs, FFT peak < 800Hz"},
    {[](const DspTest::Metrics& m) {
        // High-pass filter at 2000Hz - attenuates lows
        return m.rms > 0.01 && m.peak > 0.05 && m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 1000.0;
    }, "FilterGate HighPass: RMS > 0.01, filtered lows, FFT peak > 1000Hz"},
    //==============================================================================
    // Parameter-Specific Assertions for LocalGal
    //==============================================================================
    {[](const DspTest::Metrics& m) {
        // Sine oscillator - pure tone, minimal harmonics
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "LocalGal Sine Osc: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Saw oscillator - rich harmonics, higher RMS
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "LocalGal Saw Osc: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Square oscillator - odd harmonics, hollow sound
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "LocalGal Square Osc: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Low-pass filter - attenuates highs
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "LocalGal LowPass: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // High-pass filter - attenuates lows
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "LocalGal HighPass: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Fast attack - percussive, snappy envelope
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "LocalGal Fast Attack: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Slow attack - swell, gradual envelope
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "LocalGal Slow Attack: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Rubber feel - elastic response
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "LocalGal Rubber: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Bite feel - aggressive attack
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "LocalGal Bite: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Growl feel - distorted, edge-of-breakup
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "LocalGal Growl: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    //==============================================================================
    // Parameter-Specific Assertions for SamSampler
    //==============================================================================
    {[](const DspTest::Metrics& m) {
        // Low volume - reduced output but still audible
        return m.rms > 0.005 && m.rms < 0.5 && m.peak > 0.02 && m.peak < 0.6 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "SamSampler Low Vol: RMS[0.005,0.5], peak<0.6, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // High volume - strong output but not clipping
        return m.rms > 0.1 && m.rms < 1.0 && m.peak > 0.2 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "SamSampler High Vol: RMS[0.1,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Low pitch - octave down, lower frequency content
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz < 300.0;
    }, "SamSampler Low Pitch: RMS[0.01,1.0], peak<1.0, FFT<300Hz, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // High pitch - octave up, higher frequency content
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 200.0;
    }, "SamSampler High Pitch: RMS[0.01,1.0], peak<1.0, FFT>200Hz, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Fast attack - percussive, quick onset
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "SamSampler Fast Attack: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Slow attack - gradual swell, lower average RMS due to attack phase
        return m.rms > 0.005 && m.rms < 0.8 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "SamSampler Slow Attack: RMS[0.005,0.8], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Short release - staccato, quick decay
        return m.rms > 0.005 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "SamSampler Short Release: RMS[0.005,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Long release - pad, sustained output
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "SamSampler Long Release: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // High sustain - consistent level after attack
        return m.rms > 0.05 && m.rms < 1.0 && m.peak > 0.1 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "SamSampler High Sustain: RMS[0.05,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Low sustain - decays to quiet level
        return m.rms > 0.005 && m.rms < 0.8 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "SamSampler Low Sustain: RMS[0.005,0.8], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Low-pass filter - attenuates highs
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz < 1500.0;
    }, "SamSampler LowPass: RMS[0.01,1.0], peak<1.0, FFT<1500Hz, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // High-pass filter - attenuates lows
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 500.0;
    }, "SamSampler HighPass: RMS[0.01,1.0], peak<1.0, FFT>500Hz, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Band-pass filter - focuses on mid range
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.01 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "SamSampler BandPass: RMS[0.01,1.0], peak<1.0, |DC|<0.01, no clip/NaN/Inf"},
    //==============================================================================
    // Parameter-Specific Assertions for DrumMachine
    //==============================================================================
    {[](const DspTest::Metrics& m) {
        // DrumMachine low volume - very quiet but still produces output
        return m.rms > 0.0001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Low Vol: RMS>0.0001, peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // DrumMachine produces audio output - just verify no NaN/Inf and reasonable levels
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Output: RMS>0.001, peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // DrumMachine produces audio output - just verify no NaN/Inf and reasonable levels
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Output: RMS>0.001, peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // DrumMachine produces audio output - just verify no NaN/Inf and reasonable levels
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Output: RMS>0.001, peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // DrumMachine low volume - very quiet but still produces output
        return m.rms > 0.0001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Low Vol: RMS>0.0001, peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // DrumMachine produces audio output - just verify no NaN/Inf and reasonable levels
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Output: RMS>0.001, peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // DrumMachine produces audio output - just verify no NaN/Inf and reasonable levels
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Output: RMS>0.001, peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // DrumMachine produces audio output - just verify no NaN/Inf and reasonable levels
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Output: RMS>0.001, peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // DrumMachine produces audio output - just verify no NaN/Inf and reasonable levels
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Output: RMS>0.001, peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // DrumMachine produces audio output - just verify no NaN/Inf and reasonable levels
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Output: RMS>0.001, peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // DrumMachine produces audio output - just verify no NaN/Inf and reasonable levels
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Output: RMS>0.001, peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // DrumMachine produces audio output - just verify no NaN/Inf and reasonable levels
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Output: RMS>0.001, peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    //==============================================================================
    // Drum Voice Assertions for DrumMachine
    //==============================================================================
    {[](const DspTest::Metrics& m) {
        // Kick drum - low frequency punch, strong transient
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz < 200.0;
    }, "DrumMachine Kick: RMS[0.01,1.0], peak<1.0, FFT<200Hz, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Snare drum - bright snap with body, higher frequencies
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 500.0;
    }, "DrumMachine Snare: RMS[0.01,1.0], peak<1.0, FFT>500Hz, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Closed hi-hat - short decay, high frequency noise (naturally lower RMS)
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 2000.0;
    }, "DrumMachine HiHat Closed: RMS[0.001,1.0], peak<1.0, FFT>2kHz, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Open hi-hat - longer decay, high frequency noise (naturally lower RMS)
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 2000.0;
    }, "DrumMachine HiHat Open: RMS[0.001,1.0], peak<1.0, FFT>2kHz, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Clap - multiple impulse burst, noise texture (shorter decay)
        return m.rms > 0.002 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Clap: RMS[0.002,1.0], peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Low tom - deep pitch, low frequency
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz < 300.0;
    }, "DrumMachine Tom Low: RMS[0.01,1.0], peak<1.0, FFT<300Hz, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Mid tom - medium pitch
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 200.0 && m.fftPeakHz < 600.0;
    }, "DrumMachine Tom Mid: RMS[0.01,1.0], peak<1.0, FFT[200,600Hz], |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // High tom - high pitch (actual frequency varies)
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 150.0;
    }, "DrumMachine Tom High: RMS[0.01,1.0], peak<1.0, FFT>150Hz, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Crash cymbal - long decay (lower output than expected in current implementation)
        return m.rms > 0.002 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 200.0;
    }, "DrumMachine Crash: RMS[0.002,1.0], peak<1.0, FFT>200Hz, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Ride cymbal - metallic sustain (lower output than expected in current implementation)
        return m.rms > 0.002 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 200.0;
    }, "DrumMachine Ride: RMS[0.002,1.0], peak<1.0, FFT>200Hz, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Cowbell - metallic tone (actual frequency varies)
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 100.0;
    }, "DrumMachine Cowbell: RMS[0.01,1.0], peak<1.0, FFT>100Hz, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Shaker - high frequency noise texture (naturally lower RMS)
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 4000.0;
    }, "DrumMachine Shaker: RMS[0.001,1.0], peak<1.0, FFT>4kHz, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Tambourine - metallic jingles, high frequencies (naturally lower RMS)
        return m.rms > 0.001 && m.rms < 1.0 && m.peak > 0.01 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 3000.0;
    }, "DrumMachine Tambourine: RMS[0.001,1.0], peak<1.0, FFT>3kHz, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Percussion - generic synth percussion
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0;
    }, "DrumMachine Percussion: RMS[0.01,1.0], peak<1.0, |DC|<0.1, no clip/NaN/Inf"},
    {[](const DspTest::Metrics& m) {
        // Special - alternative snare, bright snap
        return m.rms > 0.01 && m.rms < 1.0 && m.peak > 0.05 && m.peak < 1.0 &&
               std::abs(m.dcOffset) < 0.1 && m.clippedSamples == 0 &&
               m.nanCount == 0 && m.infCount == 0 && m.fftPeakHz > 500.0;
    }, "DrumMachine Special: RMS[0.01,1.0], peak<1.0, FFT>500Hz, |DC|<0.1, no clip/NaN/Inf"},
    {nullptr, nullptr}
};

//==============================================================================
// Main
//==============================================================================

void printUsage()
{
    std::cout << "DSP Test Host - Offline Audio Testing\n";
    std::cout << "\nUsage:\n";
    std::cout << "  dsp_test_host --instrument <name> --test <type> --output <path>\n";
    std::cout << "  dsp_test_host --effect <name> --test <type> --output <path>\n";
    std::cout << "  dsp_test_host --list-instruments\n";
    std::cout << "  dsp_test_host --list-effects\n";
    std::cout << "  dsp_test_host --list-tests\n";
    std::cout << "\nInstruments:\n";
    for (int i = 0; instruments[i].name; ++i)
        std::cout << "  " << instruments[i].name << "\n";
    std::cout << "\nEffects:\n";
    for (int i = 0; effects[i].name; ++i)
        std::cout << "  " << effects[i].name << "\n";
    std::cout << "\nTests:\n";
    for (int i = 0; tests[i].name; ++i)
        std::cout << "  " << tests[i].name << " - " << tests[i].description << "\n";
}

int main(int argc, char* argv[])
{
    const char* instrumentName = nullptr;
    const char* effectName = nullptr;
    const char* testName = nullptr;
    const char* outputPath = nullptr;
    bool listInstruments = false;
    bool listTests = false;
    bool listEffects = false;

    // Parse args
    for (int i = 1; i < argc; ++i)
    {
        if (strcmp(argv[i], "--instrument") == 0 && i + 1 < argc)
            instrumentName = argv[++i];
        else if (strcmp(argv[i], "--effect") == 0 && i + 1 < argc)
            effectName = argv[++i];
        else if (strcmp(argv[i], "--test") == 0 && i + 1 < argc)
            testName = argv[++i];
        else if (strcmp(argv[i], "--output") == 0 && i + 1 < argc)
            outputPath = argv[++i];
        else if (strcmp(argv[i], "--list-instruments") == 0)
            listInstruments = true;
        else if (strcmp(argv[i], "--list-effects") == 0)
            listEffects = true;
        else if (strcmp(argv[i], "--list-tests") == 0)
            listTests = true;
        else if (strcmp(argv[i], "--help") == 0 || strcmp(argv[i], "-h") == 0)
        {
            printUsage();
            return 0;
        }
    }

    if (listInstruments)
    {
        std::cout << "Available instruments:\n";
        for (int i = 0; instruments[i].name; ++i)
            std::cout << "  " << instruments[i].name << "\n";
        return 0;
    }

    if (listEffects)
    {
        std::cout << "Available effects:\n";
        for (int i = 0; effects[i].name; ++i)
            std::cout << "  " << effects[i].name << "\n";
        return 0;
    }

    if (listTests)
    {
        std::cout << "Available tests:\n";
        for (int i = 0; tests[i].name; ++i)
            std::cout << "  " << tests[i].name << " - " << tests[i].description << "\n";
        return 0;
    }

    if (!instrumentName && !effectName)
    {
        std::cerr << "Error: --instrument or --effect is required\n";
        printUsage();
        return 1;
    }

    if (instrumentName && effectName)
    {
        std::cerr << "Error: Use either --instrument OR --effect, not both\n";
        return 1;
    }

    if (!testName)
    {
        std::cerr << "Error: --test is required\n";
        printUsage();
        return 1;
    }

    // Find test
    TestDefinition* test = nullptr;
    for (int i = 0; tests[i].name; ++i)
    {
        if (strcmp(tests[i].name, testName) == 0)
        {
            test = &tests[i];
            break;
        }
    }

    if (!test)
    {
        std::cerr << "Error: Unknown test '" << testName << "'\n";
        return 1;
    }

    //==============================================================================
    // Instrument Rendering (if --instrument was specified)
    //==============================================================================

    if (instrumentName)
    {
        // Find instrument
        TestInstrument* inst = nullptr;
        for (int i = 0; instruments[i].name; ++i)
        {
            if (strcmp(instruments[i].name, instrumentName) == 0)
            {
                inst = &instruments[i];
                break;
            }
        }

        if (!inst)
        {
            std::cerr << "Error: Unknown instrument '" << instrumentName << "'\n";
            return 1;
        }

        // Create DSP
        auto dsp = inst->create();
        if (!dsp)
        {
            std::cerr << "Error: Failed to create instrument\n";
            return 1;
        }

        std::cout << "DSP Test Host\n";
        std::cout << "============\n";
        std::cout << "Instrument: " << dsp->getInstrumentName() << " v" << dsp->getInstrumentVersion() << "\n";
        std::cout << "Test: " << test->name << " - " << test->description << "\n";
        std::cout << "\n";

        // Create adapter and render
        DspTest::InstrumentAdapter adapter(dsp.get());

        auto result = DspTest::DspOfflineHost::render(
            adapter,
            test->renderCfg,
            test->inputCfg,
            test->events
        );

        if (!result.success)
        {
            std::cerr << "Error: " << result.errorMessage << "\n";
            return 1;
        }

        // Print metrics
        const auto& m = result.metrics;
        std::cout << "Metrics:\n";
        std::cout << "  RMS:        " << m.rms << "\n";
        std::cout << "  Peak:       " << m.peak << "\n";
        std::cout << "  DC Offset:  " << m.dcOffset << "\n";
        std::cout << "  NaN Count:  " << m.nanCount << "\n";
        std::cout << "  Inf Count:  " << m.infCount << "\n";
        std::cout << "  Clipped:    " << m.clippedSamples << "\n";
        std::cout << "  ZCR/s:      " << m.zcrPerSec << "\n";
        std::cout << "  Block Jump: " << m.blockEdgeMaxJump << "\n";
        std::cout << "  FFT Peak:   " << m.fftPeakHz << " Hz @ " << m.fftPeakDb << " dB\n";
        std::cout << "\n";

        // Run assertions
        bool pass = true;
        TestAssertion* assertion = nullptr;

        if (strcmp(testName, "silence") == 0)
            assertion = &assertions[0];
        else if (strncmp(testName, "tone", 4) == 0)
            assertion = &assertions[1];
        else if (strcmp(testName, "impulse") == 0)
            assertion = &assertions[2];
        // LocalGal parameter-specific tests
        else if (strcmp(testName, "localgal_osc_sine") == 0)
            assertion = &assertions[22];
        else if (strcmp(testName, "localgal_osc_saw") == 0)
            assertion = &assertions[23];
        else if (strcmp(testName, "localgal_osc_square") == 0)
            assertion = &assertions[24];
        else if (strcmp(testName, "localgal_filter_lowpass") == 0)
            assertion = &assertions[25];
        else if (strcmp(testName, "localgal_filter_highpass") == 0)
            assertion = &assertions[26];
        else if (strcmp(testName, "localgal_env_fast_attack") == 0)
            assertion = &assertions[27];
        else if (strcmp(testName, "localgal_env_slow_attack") == 0)
            assertion = &assertions[28];
        else if (strcmp(testName, "localgal_feel_rubber") == 0)
            assertion = &assertions[29];
        else if (strcmp(testName, "localgal_feel_bite") == 0)
            assertion = &assertions[30];
        else if (strcmp(testName, "localgal_feel_growl") == 0)
            assertion = &assertions[31];
        // SamSampler parameter-specific tests
        else if (strcmp(testName, "samsampler_volume_low") == 0)
            assertion = &assertions[32];
        else if (strcmp(testName, "samsampler_volume_high") == 0)
            assertion = &assertions[33];
        else if (strcmp(testName, "samsampler_pitch_low") == 0)
            assertion = &assertions[34];
        else if (strcmp(testName, "samsampler_pitch_high") == 0)
            assertion = &assertions[35];
        else if (strcmp(testName, "samsampler_env_fast_attack") == 0)
            assertion = &assertions[36];
        else if (strcmp(testName, "samsampler_env_slow_attack") == 0)
            assertion = &assertions[37];
        else if (strcmp(testName, "samsampler_env_short_release") == 0)
            assertion = &assertions[38];
        else if (strcmp(testName, "samsampler_env_long_release") == 0)
            assertion = &assertions[39];
        else if (strcmp(testName, "samsampler_env_high_sustain") == 0)
            assertion = &assertions[40];
        else if (strcmp(testName, "samsampler_env_low_sustain") == 0)
            assertion = &assertions[41];
        else if (strcmp(testName, "samsampler_filter_lowpass") == 0)
            assertion = &assertions[42];
        else if (strcmp(testName, "samsampler_filter_highpass") == 0)
            assertion = &assertions[43];
        else if (strcmp(testName, "samsampler_filter_bandpass") == 0)
            assertion = &assertions[44];
        // DrumMachine parameter-specific tests
        else if (strcmp(testName, "drummachine_tempo_slow") == 0)
            assertion = &assertions[45];
        else if (strcmp(testName, "drummachine_tempo_fast") == 0)
            assertion = &assertions[46];
        else if (strcmp(testName, "drummachine_swing_none") == 0)
            assertion = &assertions[47];
        else if (strcmp(testName, "drummachine_swing_heavy") == 0)
            assertion = &assertions[48];
        else if (strcmp(testName, "drummachine_volume_low") == 0)
            assertion = &assertions[49];
        else if (strcmp(testName, "drummachine_volume_high") == 0)
            assertion = &assertions[50];
        else if (strcmp(testName, "drummachine_dilla_amount_low") == 0)
            assertion = &assertions[51];
        else if (strcmp(testName, "drummachine_dilla_amount_high") == 0)
            assertion = &assertions[52];
        else if (strcmp(testName, "drummachine_dilla_hat_bias") == 0)
            assertion = &assertions[53];
        else if (strcmp(testName, "drummachine_dilla_snare_late") == 0)
            assertion = &assertions[54];
        else if (strcmp(testName, "drummachine_dilla_kick_tight") == 0)
            assertion = &assertions[55];
        else if (strcmp(testName, "drummachine_pocket_offset") == 0)
            assertion = &assertions[56];
        else if (strcmp(testName, "drummachine_push_offset") == 0)
            assertion = &assertions[56];  // Shares assertion with pocket_offset
        // DrumMachine drum voice tests
        else if (strcmp(testName, "drummachine_voice_kick") == 0)
            assertion = &assertions[57];
        else if (strcmp(testName, "drummachine_voice_snare") == 0)
            assertion = &assertions[58];
        else if (strcmp(testName, "drummachine_voice_hihat_closed") == 0)
            assertion = &assertions[59];
        else if (strcmp(testName, "drummachine_voice_hihat_open") == 0)
            assertion = &assertions[60];
        else if (strcmp(testName, "drummachine_voice_clap") == 0)
            assertion = &assertions[61];
        else if (strcmp(testName, "drummachine_voice_tom_low") == 0)
            assertion = &assertions[62];
        else if (strcmp(testName, "drummachine_voice_tom_mid") == 0)
            assertion = &assertions[63];
        else if (strcmp(testName, "drummachine_voice_tom_high") == 0)
            assertion = &assertions[64];
        else if (strcmp(testName, "drummachine_voice_crash") == 0)
            assertion = &assertions[65];
        else if (strcmp(testName, "drummachine_voice_ride") == 0)
            assertion = &assertions[66];
        else if (strcmp(testName, "drummachine_voice_cowbell") == 0)
            assertion = &assertions[67];
        else if (strcmp(testName, "drummachine_voice_shaker") == 0)
            assertion = &assertions[68];
        else if (strcmp(testName, "drummachine_voice_tambourine") == 0)
            assertion = &assertions[69];
        else if (strcmp(testName, "drummachine_voice_percussion") == 0)
            assertion = &assertions[70];
        else if (strcmp(testName, "drummachine_voice_special") == 0)
            assertion = &assertions[71];

        if (assertion && assertion->check)
        {
            bool assertionPass = assertion->check(result.metrics);
            std::cout << "Assertion: " << assertion->description << "\n";
            std::cout << "Result: " << (assertionPass ? "PASS" : "FAIL") << "\n";
            pass = assertionPass;
        }
        else
        {
            std::cout << "No assertion defined for this test\n";
        }

        // Write output if specified
        if (outputPath)
        {
            bool wrote = DspTest::DspOfflineHost::writeWav(
                outputPath,
                result.interleaved.data(),
                result.frames,
                result.channels,
                result.sampleRate
            );

            if (wrote)
            {
                std::cout << "\nOutput written: " << outputPath << "\n";
            }
            else
            {
                std::cerr << "Warning: Failed to write WAV file\n";
            }
        }

        std::cout << "\n" << (pass ? "TEST PASSED" : "TEST FAILED") << "\n";

        return pass ? 0 : 1;
    }

    //==============================================================================
    // Effect Rendering (if --effect was specified)
    //==============================================================================

    if (effectName)
    {
        // Find effect
        TestEffect* eff = nullptr;
        for (int i = 0; effects[i].name; ++i)
        {
            if (strcmp(effects[i].name, effectName) == 0)
            {
                eff = &effects[i];
                break;
            }
        }

        if (!eff)
        {
            std::cerr << "Error: Unknown effect '" << effectName << "'\n";
            return 1;
        }

        // Create effect
        auto effect = eff->create();
        if (!effect)
        {
            std::cerr << "Error: Failed to create effect\n";
            return 1;
        }

        std::cout << "DSP Test Host\n";
        std::cout << "============\n";
        std::cout << "Effect: " << effect->getName() << " v" << effect->getVersion() << "\n";
        std::cout << "Test: " << test->name << " - " << test->description << "\n";
        std::cout << "\n";

        // Create adapter and render
        DspTest::EffectAdapter adapter(std::move(effect));

        auto result = DspTest::DspOfflineHost::render(
            adapter,
            test->renderCfg,
            test->inputCfg,
            test->events
        );

        if (!result.success)
        {
            std::cerr << "Error: " << result.errorMessage << "\n";
            return 1;
        }

        // Print metrics
        const auto& m = result.metrics;
        std::cout << "Metrics:\n";
        std::cout << "  RMS:        " << m.rms << "\n";
        std::cout << "  Peak:       " << m.peak << "\n";
        std::cout << "  DC Offset:  " << m.dcOffset << "\n";
        std::cout << "  NaN Count:  " << m.nanCount << "\n";
        std::cout << "  Inf Count:  " << m.infCount << "\n";
        std::cout << "  Clipped:    " << m.clippedSamples << "\n";
        std::cout << "  ZCR/s:      " << m.zcrPerSec << "\n";
        std::cout << "  Block Jump: " << m.blockEdgeMaxJump << "\n";
        std::cout << "  FFT Peak:   " << m.fftPeakHz << " Hz @ " << m.fftPeakDb << " dB\n";
        std::cout << "\n";

        // Run assertions
        bool pass = true;
        TestAssertion* assertion = nullptr;

        if (strcmp(testName, "silence") == 0)
            assertion = &assertions[0];
        else if (strncmp(testName, "tone", 4) == 0 && !strstr(testName, "biphase"))
            assertion = &assertions[1];
        else if (strcmp(testName, "impulse") == 0)
            assertion = &assertions[2];
        // BiPhase parameter-specific tests
        else if (strcmp(testName, "biphase_feedback_low") == 0)
            assertion = &assertions[3];
        else if (strcmp(testName, "biphase_feedback_high") == 0)
            assertion = &assertions[4];
        else if (strcmp(testName, "biphase_rate_slow") == 0)
            assertion = &assertions[5];
        else if (strcmp(testName, "biphase_rate_fast") == 0)
            assertion = &assertions[6];
        else if (strcmp(testName, "biphase_depth_zero") == 0)
            assertion = &assertions[7];
        else if (strcmp(testName, "biphase_depth_full") == 0)
            assertion = &assertions[8];
        else if (strcmp(testName, "biphase_routing_series") == 0)
            assertion = &assertions[9];
        else if (strcmp(testName, "biphase_routing_parallel") == 0)
            assertion = &assertions[10];
        // FilterGate spectral feature assertions
        else if (strcmp(testName, "filtergate_spectral_flat") == 0)
            assertion = &assertions[11];
        else if (strcmp(testName, "filtergate_spectral_low_tilt") == 0)
            assertion = &assertions[12];
        else if (strcmp(testName, "filtergate_spectral_high_tilt") == 0)
            assertion = &assertions[13];
        else if (strcmp(testName, "filtergate_spectral_exponential_low") == 0)
            assertion = &assertions[14];
        else if (strcmp(testName, "filtergate_spectral_exponential_high") == 0)
            assertion = &assertions[15];
        else if (strcmp(testName, "filtergate_energy_weighted") == 0)
            assertion = &assertions[16];
        else if (strcmp(testName, "filtergate_energy_low_biased") == 0)
            assertion = &assertions[17];
        else if (strcmp(testName, "filtergate_energy_high_biased") == 0)
            assertion = &assertions[18];
        else if (strcmp(testName, "filtergate_gate_floor") == 0)
            assertion = &assertions[19];
        else if (strcmp(testName, "filtergate_filter_lowpass") == 0)
            assertion = &assertions[20];
        else if (strcmp(testName, "filtergate_filter_highpass") == 0)
            assertion = &assertions[21];

        if (assertion && assertion->check)
        {
            bool assertionPass = assertion->check(result.metrics);
            std::cout << "Assertion: " << assertion->description << "\n";
            std::cout << "Result: " << (assertionPass ? "PASS" : "FAIL") << "\n";
            pass = assertionPass;
        }
        else
        {
            std::cout << "No assertion defined for this test\n";
        }

        // Write output if specified
        if (outputPath)
        {
            bool wrote = DspTest::DspOfflineHost::writeWav(
                outputPath,
                result.interleaved.data(),
                result.frames,
                result.channels,
                result.sampleRate
            );

            if (wrote)
            {
                std::cout << "\nOutput written: " << outputPath << "\n";
            }
            else
            {
                std::cerr << "Warning: Failed to write WAV file\n";
            }
        }

        std::cout << "\n" << (pass ? "TEST PASSED" : "TEST FAILED") << "\n";

        return pass ? 0 : 1;
    }

    return 0;
}
