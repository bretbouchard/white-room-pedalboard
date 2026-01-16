//
//  JuceFFI.cpp
//  SchillingerEngine
//
//  Minimal FFI bridge for tvOS local-only mode
//  Created for Swift/tvOS integration
//

#include <AppKit/AppKit.h>
#include <juce_core/juce_core.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include "JuceFFI.h"

// ============================================================================
// Sine Wave Generator (Phase 9.5A - Plumbing Proof)
// ============================================================================

struct SineWaveGenerator : public juce::AudioSource {
    double phase = 0.0;
    double frequency = 440.0;  // A4
    double amplitude = 0.1;    // -20dB to prevent clipping
    double sampleRate = 48000.0;
    bool shouldPlay = false;

    // Default constructor
    SineWaveGenerator() = default;

    void setFrequency(double freq) {
        frequency = freq;
    }

    void setAmplitude(double amp) {
        amplitude = juce::jlimit(0.0, 1.0, amp);
    }

    void prepareToPlay(int samplesPerBlock, double newSampleRate) override {
        sampleRate = newSampleRate;
    }

    void releaseResources() override {}

    void getNextAudioBlock(const juce::AudioSourceChannelInfo& buffer) override {
        if (!shouldPlay) {
            // Output silence when not playing
            buffer.clearActiveBufferRegion();
            return;
        }

        for (int sample = 0; sample < buffer.numSamples; ++sample) {
            float sampleValue = static_cast<float>(std::sin(phase) * amplitude);

            for (int channel = 0; channel < buffer.buffer->getNumChannels(); ++channel) {
                buffer.buffer->setSample(channel, buffer.startSample + sample, sampleValue);
            }

            phase += 2.0 * juce::double_Pi * frequency / sampleRate;

            // Wrap phase to prevent accumulation errors
            if (phase >= 2.0 * juce::double_Pi) {
                phase -= 2.0 * juce::double_Pi;
            }
        }
    }

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SineWaveGenerator)
};

// ============================================================================
// Opaque Engine Handle
// ============================================================================

struct SchillingerEngine : public juce::DeletedAtShutdown {
    juce::AudioDeviceManager deviceManager;
    juce::AudioSourcePlayer audioSourcePlayer;
    std::unique_ptr<SineWaveGenerator> toneGenerator;

    bool isPlaying = false;
    double sampleRate = 48000.0;
    int bufferSize = 512;

    SchillingerEngine() {
        // Initialize audio device manager with default settings
        auto error = deviceManager.initialise(
            0,                      // Num input channels
            2,                      // Num output channels (stereo)
            nullptr,                // No XML settings
            true                    // Select default device
        );

        if (error.isEmpty()) {
            // Successfully initialized
            sampleRate = deviceManager.getCurrentAudioDevice()->getCurrentSampleRate();
            DBG("SchillingerEngine: Audio device initialized at " << sampleRate << " Hz");

            // Create and attach tone generator
            toneGenerator = std::make_unique<SineWaveGenerator>();
            toneGenerator->prepareToPlay(bufferSize, sampleRate);
            audioSourcePlayer.setSource(toneGenerator.get());

            DBG("SchillingerEngine: Sine wave generator attached (440 Hz A4)");
        } else {
            DBG("SchillingerEngine: Failed to initialize audio device: " << error);
        }
    }

    ~SchillingerEngine() override {
        audioSourcePlayer.setSource(nullptr);
        toneGenerator.reset();
        deviceManager.closeAudioDevice();
    }

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SchillingerEngine)
};

// ============================================================================
// C API Implementation
// ============================================================================

extern "C" {

// Engine creation/destruction
schillinger_engine_t schillinger_engine_create() {
    auto* engine = new SchillingerEngine();
    return reinterpret_cast<schillinger_engine_t>(engine);
}

void schillinger_engine_destroy(schillinger_engine_t engine) {
    if (engine) {
        auto* e = reinterpret_cast<SchillingerEngine*>(engine);
        delete e;
    }
}

// Audio start/stop (Phase 9.5A - direct control)
schillinger_error_t schillinger_audio_start(
    schillinger_engine_t engine,
    double sample_rate,
    uint32_t frames_per_buffer
) {
    if (!engine) {
        return SCHILLINGER_ERROR_INVALID_ARGUMENT;
    }

    auto* e = reinterpret_cast<SchillingerEngine*>(engine);

    if (!e->toneGenerator) {
        return SCHILLINGER_ERROR_ENGINE_FAILED;
    }

    // Start audio callback
    if (!e->isPlaying) {
        e->deviceManager.addAudioCallback(&e->audioSourcePlayer);
        e->toneGenerator->shouldPlay = true;
        e->isPlaying = true;
        DBG("SchillingerEngine: Audio started at " << sample_rate << " Hz, "
            << static_cast<int>(frames_per_buffer) << " frames");
    }

    return SCHILLINGER_ERROR_NONE;
}

schillinger_error_t schillinger_audio_stop(schillinger_engine_t engine) {
    if (!engine) {
        return SCHILLINGER_ERROR_INVALID_ARGUMENT;
    }

    auto* e = reinterpret_cast<SchillingerEngine*>(engine);

    if (e->isPlaying) {
        e->toneGenerator->shouldPlay = false;
        e->deviceManager.removeAudioCallback(&e->audioSourcePlayer);
        e->isPlaying = false;
        DBG("SchillingerEngine: Audio stopped");
    }

    return SCHILLINGER_ERROR_NONE;
}

// Transport control (minimal implementation for P0)
schillinger_error_t schillinger_transport_command(
    schillinger_engine_t engine,
    const schillinger_transport_intent_t* intent
) {
    if (!engine || !intent) {
        return SCHILLINGER_ERROR_INVALID_ARGUMENT;
    }

    auto* e = reinterpret_cast<SchillingerEngine*>(engine);

    // Handle play/stop commands
    switch (intent->command) {
        case SCHILLINGER_TRANSPORT_PLAY:
            if (!e->isPlaying) {
                e->deviceManager.addAudioCallback(&e->audioSourcePlayer);
                e->toneGenerator->shouldPlay = true;
                e->isPlaying = true;
                DBG("SchillingerEngine: Playback started (440 Hz sine wave)");
            }
            return SCHILLINGER_ERROR_NONE;

        case SCHILLINGER_TRANSPORT_STOP:
            if (e->isPlaying) {
                e->toneGenerator->shouldPlay = false;
                e->deviceManager.removeAudioCallback(&e->audioSourcePlayer);
                e->isPlaying = false;
                DBG("SchillingerEngine: Playback stopped");
            }
            return SCHILLINGER_ERROR_NONE;

        default:
            return SCHILLINGER_ERROR_NOT_SUPPORTED;
    }
}

// Transport state polling
schillinger_error_t schillinger_transport_get_state(
    schillinger_engine_t engine,
    schillinger_transport_state_t* out_state
) {
    if (!engine || !out_state) {
        return SCHILLINGER_ERROR_INVALID_ARGUMENT;
    }

    auto* e = reinterpret_cast<SchillingerEngine*>(engine);

    // Fill state structure
    out_state->is_playing = e->isPlaying;
    out_state->position = 0.0;  // Not implemented yet (no timeline)
    out_state->tempo = 120.0;    // Default tempo
    out_state->is_recording = false;

    return SCHILLINGER_ERROR_NONE;
}

// Version info
void schillinger_get_version(schillinger_version_t* version) {
    if (version) {
        version->major = 1;
        version->minor = 0;
        version->patch = 0;
    }
}

// Panic (emergency stop)
schillinger_error_t schillinger_panic(schillinger_engine_t engine) {
    if (!engine) {
        return SCHILLINGER_ERROR_INVALID_ARGUMENT;
    }

    auto* e = reinterpret_cast<SchillingerEngine*>(engine);

    // Stop all audio immediately
    if (e->toneGenerator) {
        e->toneGenerator->shouldPlay = false;
    }
    e->deviceManager.removeAudioCallback(&e->audioSourcePlayer);
    e->isPlaying = false;

    DBG("SchillingerEngine: PANIC - all audio stopped");

    return SCHILLINGER_ERROR_NONE;
}

} // extern "C"
