//
//  audio_only_bridge.mm
//  JUCE Backend - Audio Only FFI
//
//  This file provides ONLY audio-related FFI functions for iOS.
//  All transport/engine functions are handled by SchillingerEngineCore.
//
//  Architecture:
//  - Singleton audio engine managed by JUCE backend
//  - iOS-specific: Uses AVAudioEngine with manual rendering for real-time DSP
//  - macOS/tvOS: Uses JUCE AudioDeviceManager
//  - Generic instrument factory supporting all instruments via InstrumentDSP interface
//

#include <cstdint>
#include <cstdio>
#include <memory>
#include <vector>
#include <atomic>
#include <cstring>
#include <map>

// JUCE module includes
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_events/juce_events.h>

// Platform-specific includes
#if defined(__IOS__) || defined(TARGET_OS_IPHONE)
    #import <AVFoundation/AVFoundation.h>
    #import <AudioToolbox/AudioToolbox.h>

    // Include generic InstrumentDSP interface
    // Note: We include instruments individually to avoid type definition conflicts
    #include "dsp/InstrumentDSP.h"

    // LocalGal instrument (no conflicts)
    #include "dsp/LocalGalPureDSP.h"

    // TODO: Add other instruments one at a time to resolve namespace conflicts:
    // - NexSynthDSP.h (conflicts with SamSampler FilterType)
    // - SamSamplerDSP.h (conflicts with KaneMarco FilterType)
    // - KaneMarcoPureDSP.h (conflicts with SamSampler FilterType)
    // - DrumMachinePureDSP.h
#else
    #include <juce_audio_devices/juce_audio_devices.h>
#endif

// Audio configuration structure (matches Swift side)
struct sch_audio_config_t {
    double sample_rate;
    uint32_t buffer_size;
    uint32_t input_channels;
    uint32_t output_channels;
};

// Result codes
#define SCH_OK 0
#define SCH_ERR_INVALID_ARG -1
#define SCH_ERR_AUDIO_FAILED -2

// ============================================================================
// Generic Instrument Factory (supports all instruments)
// ============================================================================

#if defined(__IOS__) || defined(TARGET_OS_IPHONE)

namespace {
    // Simple instrument factory for iOS
    class iOSInstrumentFactory {
    public:
        static DSP::InstrumentDSP* createInstrument(const char* name) {
            // Currently supporting LocalGal only
            // TODO: Add other instruments after resolving namespace conflicts
            if (std::strcmp(name, "LocalGal") == 0) {
                return new DSP::LocalGalPureDSP();
            }

            DBG("iOSInstrumentFactory: Unknown or unsupported instrument '" << name << "', returning nullptr");
            return nullptr;
        }

        static std::vector<const char*> getAvailableInstruments() {
            // Currently supporting LocalGal only
            static const char* instruments[] = {
                "LocalGal"
            };
            return std::vector<const char*>(instruments, instruments + 1);
        }
    };

} // namespace

#endif // iOS

// ============================================================================
// Sine Wave Generator (Simple Audio Source for Testing)
// ============================================================================

struct SineWaveGenerator {
    double phase = 0.0;
    double frequency = 440.0;  // A4
    double amplitude = 0.1;    // -20dB to prevent clipping
    double sampleRate = 48000.0;
    bool shouldPlay = false;

    void setFrequency(double freq) {
        frequency = freq;
    }

    void setAmplitude(double amp) {
        amplitude = juce::jlimit(0.0, 1.0, amp);
    }

    void prepareToPlay(int samplesPerBlock, double newSampleRate) {
        juce::ignoreUnused(samplesPerBlock);
        sampleRate = newSampleRate;
    }

    void processAudio(float* outputBuffer, int numSamples) {
        if (!shouldPlay) {
            // Output silence
            juce::FloatVectorOperations::clear(outputBuffer, numSamples);
            return;
        }

        for (int sample = 0; sample < numSamples; ++sample) {
            float sampleValue = static_cast<float>(std::sin(phase) * amplitude);
            outputBuffer[sample] = sampleValue;

            phase += 2.0 * juce::MathConstants<double>::pi * frequency / sampleRate;

            // Wrap phase to prevent accumulation errors
            if (phase >= 2.0 * juce::MathConstants<double>::pi) {
                phase -= 2.0 * juce::MathConstants<double>::pi;
            }
        }
    }
};

// ============================================================================
// iOS Audio Engine (using AVAudioEngine with Manual Rendering for Real-time DSP)
// ============================================================================

#if defined(__IOS__) || defined(TARGET_OS_IPHONE)

namespace {
    // Real-time audio processor using generic InstrumentDSP interface
    // Supports per-MIDI-channel instrument routing for proper ensemble playback
    class RealTimeAudioProcessor {
    public:
        static constexpr int MAX_CHANNELS = 4;  // Support up to 4 MIDI channels (Kick, Bass, Hat, Lead)

        RealTimeAudioProcessor() {
            // Initialize all channels to LocalGal instrument
            for (int ch = 0; ch < MAX_CHANNELS; ++ch) {
                channelInstrumentNames_[ch] = "LocalGal";
                loadInstrumentForChannel(ch, "LocalGal");
            }
            DBG("RealTimeAudioProcessor: Initialized with " << MAX_CHANNELS << " channels");
        }

        ~RealTimeAudioProcessor() {
            for (int ch = 0; ch < MAX_CHANNELS; ++ch) {
                if (instruments_[ch]) {
                    delete instruments_[ch];
                    instruments_[ch] = nullptr;
                }
            }
        }

        bool loadInstrumentForChannel(int channel, const char* name) {
            if (channel < 0 || channel >= MAX_CHANNELS) {
                DBG("RealTimeAudioProcessor: Invalid channel " << channel);
                return false;
            }

            // Create new instrument using factory
            DSP::InstrumentDSP* newInstrument = iOSInstrumentFactory::createInstrument(name);
            if (!newInstrument) {
                DBG("RealTimeAudioProcessor: Failed to create instrument for channel " << channel << ": " << name);
                return false;
            }

            // Prepare the new instrument
            if (!newInstrument->prepare(sampleRate_, bufferSize_)) {
                DBG("RealTimeAudioProcessor: Failed to prepare instrument for channel " << channel << ": " << name);
                delete newInstrument;
                return false;
            }

            // Delete old instrument if exists
            if (instruments_[channel]) {
                delete instruments_[channel];
            }

            // Replace instrument for this channel
            instruments_[channel] = newInstrument;
            channelInstrumentNames_[channel] = name;

            DBG("RealTimeAudioProcessor: Channel " << channel << " loaded instrument: " << name);
            return true;
        }

        const char* getInstrumentForChannel(int channel) const {
            if (channel >= 0 && channel < MAX_CHANNELS) {
                return channelInstrumentNames_[channel];
            }
            return "None";
        }

        bool prepare(double sampleRate, int bufferSize) {
            sampleRate_ = sampleRate;
            bufferSize_ = bufferSize;

            // Re-prepare all instruments
            for (int ch = 0; ch < MAX_CHANNELS; ++ch) {
                if (instruments_[ch]) {
                    if (!instruments_[ch]->prepare(sampleRate, bufferSize)) {
                        DBG("RealTimeAudioProcessor: Failed to re-prepare channel " << ch);
                        return false;
                    }
                }
            }

            DBG("RealTimeAudioProcessor: Prepared at " << sampleRate << " Hz, buffer " << bufferSize);
            return true;
        }

        void process(float** outputs, int numChannels, int numSamples) {
            // Clear output buffers first
            for (int ch = 0; ch < numChannels; ++ch) {
                juce::FloatVectorOperations::clear(outputs[ch], numSamples);
            }

            // Temporary buffer for each channel's output
            std::vector<float*> channelBuffers;
            for (int ch = 0; ch < numChannels; ++ch) {
                channelBuffers.push_back(new float[numSamples]());
            }

            // Process each instrument channel and accumulate
            for (int midiCh = 0; midiCh < MAX_CHANNELS; ++midiCh) {
                if (!instruments_[midiCh]) continue;

                // Clear channel buffer
                for (int ch = 0; ch < numChannels; ++ch) {
                    juce::FloatVectorOperations::clear(channelBuffers[ch], numSamples);
                }

                // Process this instrument
                instruments_[midiCh]->process(channelBuffers.data(), numChannels, numSamples);

                // Mix into main output
                for (int ch = 0; ch < numChannels; ++ch) {
                    for (int i = 0; i < numSamples; ++i) {
                        outputs[ch][i] += channelBuffers[ch][i] * 0.6f;  // Mix gain to prevent clipping
                    }
                }
            }

            // Cleanup temporary buffers
            for (int ch = 0; ch < numChannels; ++ch) {
                delete[] channelBuffers[ch];
            }

            // Apply limiter to prevent clipping
            const float limit = 0.8f;
            for (int ch = 0; ch < numChannels; ++ch) {
                for (int i = 0; i < numSamples; ++i) {
                    // Soft clip using tanh
                    outputs[ch][i] = limit * std::tanh(outputs[ch][i] / limit);

                    // Hard limit safety
                    if (outputs[ch][i] > 0.95f) {
                        outputs[ch][i] = 0.95f;
                    } else if (outputs[ch][i] < -0.95f) {
                        outputs[ch][i] = -0.95f;
                    }
                }
            }
        }

        void triggerNoteOn(int channel, int note, float velocity) {
            if (channel < 0 || channel >= MAX_CHANNELS) {
                DBG("RealTimeAudioProcessor: Invalid MIDI channel " << channel);
                return;
            }

            if (!instruments_[channel]) {
                DBG("RealTimeAudioProcessor: No instrument for channel " << channel);
                return;
            }

            // Create a note-on event
            DSP::ScheduledEvent event;
            event.type = DSP::ScheduledEvent::NOTE_ON;
            event.data.note.midiNote = note;
            event.data.note.velocity = velocity;

            instruments_[channel]->handleEvent(event);
            DBG("RealTimeAudioProcessor: Channel " << channel << " Note ON " << note << " vel=" << velocity);
        }

        void triggerNoteOff(int channel, int note, float velocity) {
            if (channel < 0 || channel >= MAX_CHANNELS) {
                return;  // Silent fail for note-off
            }

            if (!instruments_[channel]) return;

            // Create a note-off event
            DSP::ScheduledEvent event;
            event.type = DSP::ScheduledEvent::NOTE_OFF;
            event.data.note.midiNote = note;
            event.data.note.velocity = velocity;

            instruments_[channel]->handleEvent(event);
            DBG("RealTimeAudioProcessor: Channel " << channel << " Note OFF " << note);
        }

        void allNotesOff() {
            // CRITICAL FIX: Call panic() for immediate silence
            // Sending note-off events just starts release envelope (takes time)
            // panic() immediately kills all voices for instant silence
            for (int ch = 0; ch < MAX_CHANNELS; ++ch) {
                if (instruments_[ch]) {
                    instruments_[ch]->panic();
                }
            }

            // Also send note-offs for cleanup (redundant but safe)
            for (int ch = 0; ch < MAX_CHANNELS; ++ch) {
                if (instruments_[ch]) {
                    for (int note = 0; note < 128; ++note) {
                        triggerNoteOff(ch, note, 0.0f);
                    }
                }
            }

            DBG("iOSAudioEngine: ALL NOTES OFF (panic) - all voices killed");
        }

        void allNotesOff(int channel) {
            if (channel < 0 || channel >= MAX_CHANNELS) return;
            if (!instruments_[channel]) return;

            for (int note = 0; note < 128; ++note) {
                triggerNoteOff(channel, note, 0.0f);
            }
        }

        void setParameter(const char* paramId, float value) {
            // Set parameter for all instruments
            for (int ch = 0; ch < MAX_CHANNELS; ++ch) {
                if (instruments_[ch]) {
                    instruments_[ch]->setParameter(paramId, value);
                }
            }
        }

        void setParameter(int channel, const char* paramId, float value) {
            if (channel < 0 || channel >= MAX_CHANNELS) return;
            if (instruments_[channel]) {
                instruments_[channel]->setParameter(paramId, value);
            }
        }

    private:
        DSP::InstrumentDSP* instruments_[MAX_CHANNELS] = {nullptr};  // Per-channel instruments
        const char* channelInstrumentNames_[MAX_CHANNELS];
        double sampleRate_ = 48000.0;
        int bufferSize_ = 512;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RealTimeAudioProcessor)
    };

    struct iOSAudioEngine {
        AVAudioEngine* audioEngine;
        AVAudioSourceNode* sourceNode;
        std::unique_ptr<RealTimeAudioProcessor> processor;
        AVAudioFormat* renderFormat;
        bool isInitialized = false;
        std::atomic<bool> isPlaying{false};
        double sampleRate = 48000.0;
        int bufferSize = 512;
        std::vector<float> renderBuffer;
        iOSAudioEngine* enginePtr;  // Self-pointer for render callback

        juce::String initialise() {
            if (isInitialized) {
                return "Already initialized";
            }

            // Configure AVAudioSession for playback
            NSError* error = nil;
            AVAudioSession* session = [AVAudioSession sharedInstance];

            // Set category to playback
            if (![session setCategory:AVAudioSessionCategoryPlayback error:&error]) {
                return juce::String("Failed to set AVAudioSession category: ") +
                       error.localizedDescription.UTF8String;
            }

            // Set preferred sample rate
            if (![session setPreferredSampleRate:sampleRate error:&error]) {
                DBG("Warning: Could not set preferred sample rate: " << error.localizedDescription.UTF8String);
            }

            // Set preferred I/O buffer duration
            NSTimeInterval bufferDuration = bufferSize / sampleRate;
            if (![session setPreferredIOBufferDuration:bufferDuration error:&error]) {
                DBG("Warning: Could not set preferred buffer duration: " << error.localizedDescription.UTF8String);
            }

            // Activate audio session
            if (![session setActive:YES error:&error]) {
                return juce::String("Failed to activate AVAudioSession: ") +
                       error.localizedDescription.UTF8String;
            }

            // Get actual sample rate and buffer size
            sampleRate = session.sampleRate;
            bufferSize = static_cast<int>(session.IOBufferDuration * sampleRate);

            // Create the real-time audio processor
            processor = std::make_unique<RealTimeAudioProcessor>();
            if (!processor->prepare(sampleRate, bufferSize)) {
                return "Failed to prepare audio processor";
            }

            // Create render format
            renderFormat = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:sampleRate channels:2];

            // Allocate render buffer (interleaved stereo)
            renderBuffer.resize(bufferSize * 2);

            // Create AVAudioEngine
            audioEngine = [[AVAudioEngine alloc] init];

            isInitialized = true;

            DBG("iOSAudioEngine: Audio initialized at " << sampleRate << " Hz, buffer " << bufferSize);
            DBG("iOSAudioEngine: Created instrument factory and real-time processor");

            return {}; // Success
        }

        void shutdown() {
            if (!isInitialized) return;

            // Stop audio first
            if (isPlaying.load()) {
                stopAudio();
            }

            // Detach and cleanup source node
            if (sourceNode) {
                [audioEngine detachNode:sourceNode];
                sourceNode = nil;
            }

            renderBuffer.clear();
            renderFormat = nil;
            processor.reset();
            audioEngine = nil;
            isInitialized = false;

            // Deactivate audio session
            NSError* error = nil;
            [[AVAudioSession sharedInstance] setActive:NO error:&error];

            DBG("iOSAudioEngine: Audio device shut down");
        }

        bool startAudio() {
            if (!isInitialized) {
                DBG("iOSAudioEngine: Cannot start - not initialized");
                return false;
            }

            if (!isPlaying.load()) {
                // Create source node only if it doesn't exist
                if (!sourceNode) {
                    // Set self-pointer for render callback
                    enginePtr = this;

                    // Allocate render buffer with enough space for max frame size
                    renderBuffer.resize(4096 * 2);  // Max 4096 frames * 2 channels

                    // Create AVAudioSourceNode with real-time render callback
                    // Capture raw pointer - this is safe because sourceNode is owned by this struct
                    __block int renderCallbackCount = 0;
                    sourceNode = [[AVAudioSourceNode alloc]
                        initWithFormat:renderFormat
                        renderBlock:^OSStatus(BOOL* isSilence, const AudioTimeStamp* timestamp, AVAudioFrameCount frameCount, AudioBufferList* outputData) {
                            renderCallbackCount++;
                            if (renderCallbackCount <= 10) {  // Log first 10 calls only
                                printf("iOSAudioEngine: Render callback called! frames=%u\n", (unsigned int)frameCount);
                            }

                            iOSAudioEngine* engine = enginePtr;
                            if (!engine || !engine->isPlaying.load(std::memory_order_acquire)) {
                                // Output silence when stopped or engine destroyed
                                *isSilence = YES;
                                float* outBuffer = (float*)outputData->mBuffers[0].mData;
                                memset(outBuffer, 0, frameCount * sizeof(float) * 2);
                                return noErr;
                            }

                            // Ensure we don't exceed buffer size
                            UInt32 framesToProcess = static_cast<UInt32>(frameCount);
                            if (framesToProcess > 4096) framesToProcess = 4096;

                            // Generate audio from instrument (non-interleaved input)
                            float* channelData[2];
                            channelData[0] = engine->renderBuffer.data();
                            channelData[1] = engine->renderBuffer.data() + 4096;

                            engine->processor->process(channelData, 2, static_cast<int>(framesToProcess));

                            // Interleave output to buffer (AudioBufferList is interleaved)
                            float* outBuffer = (float*)outputData->mBuffers[0].mData;
                            for (UInt32 frame = 0; frame < framesToProcess; ++frame) {
                                outBuffer[frame * 2 + 0] = channelData[0][frame];  // Left
                                outBuffer[frame * 2 + 1] = channelData[1][frame];  // Right
                            }

                            *isSilence = NO;
                            return noErr;
                        }];

                    // Attach and connect the source node
                    [audioEngine attachNode:sourceNode];
                    [audioEngine connect:sourceNode to:audioEngine.outputNode format:renderFormat];
                }

                // Trigger a test note on channel 0 (C4 = middle C = MIDI note 60)
                processor->triggerNoteOn(0, 60, 0.8f);

                // Start the audio engine
                NSError* error = nil;
                if (![audioEngine startAndReturnError:&error]) {
                    DBG("iOSAudioEngine: Failed to start audio engine: " << error.localizedDescription.UTF8String);
                    return false;
                }

                // Set playing flag AFTER engine starts
                isPlaying.store(true, std::memory_order_release);
                DBG("iOSAudioEngine: Audio started with " << RealTimeAudioProcessor::MAX_CHANNELS << " channel instruments");
            }

            return true;
        }

        bool stopAudio() {
            if (isPlaying.load(std::memory_order_acquire)) {
                // Stop all notes first
                processor->allNotesOff();

                // Signal render callback to stop (will output silence)
                isPlaying.store(false, std::memory_order_release);

                // Stop audio engine
                [audioEngine stop];

                DBG("iOSAudioEngine: Audio stopped");
            }

            return true;
        }

        double getSampleRate() const {
            return sampleRate;
        }

        int getBufferSize() const {
            return bufferSize;
        }

        bool isRunning() const {
            return isPlaying.load(std::memory_order_acquire);
        }

        // Non-copyable
        iOSAudioEngine() : audioEngine(nullptr), sourceNode(nullptr), renderFormat(nullptr), enginePtr(nullptr) {}
        ~iOSAudioEngine() = default;
        iOSAudioEngine(const iOSAudioEngine&) = delete;
        iOSAudioEngine& operator=(const iOSAudioEngine&) = delete;
    };

    // Global instance
    static std::unique_ptr<iOSAudioEngine> g_audioEngine;

    iOSAudioEngine& getAudioEngine() {
        if (!g_audioEngine) {
            g_audioEngine = std::make_unique<iOSAudioEngine>();
        }
        return *g_audioEngine;
    }
}

#else // !iOS (macOS/tvOS)

namespace {
    struct DesktopAudioEngine {
        juce::AudioDeviceManager deviceManager;
        juce::AudioSourcePlayer audioSourcePlayer;
        std::unique_ptr<SineWaveGenerator> toneGenerator;
        bool isInitialized = false;
        bool isPlaying = false;

        juce::String initialise() {
            if (isInitialized) {
                return "Already initialized";
            }

            // Initialize audio device manager with default settings
            auto error = deviceManager.initialise(
                0,                      // Num input channels
                2,                      // Num output channels (stereo)
                nullptr,                // No XML settings
                true                    // Select default device
            );

            if (error.isEmpty()) {
                // Successfully initialized
                auto currentDevice = deviceManager.getCurrentAudioDevice();
                if (currentDevice) {
                    double sampleRate = currentDevice->getCurrentSampleRate();
                    int bufferSize = currentDevice->getCurrentBufferSizeSamples();

                    DBG("DesktopAudioEngine: Audio device initialized at " << sampleRate << " Hz, "
                        << bufferSize << " buffer size");

                    // Create and prepare tone generator
                    toneGenerator = std::make_unique<SineWaveGenerator>();
                    toneGenerator->prepareToPlay(bufferSize, sampleRate);
                    audioSourcePlayer.setSource(toneGenerator.get());

                    isInitialized = true;
                }
            } else {
                DBG("DesktopAudioEngine: Failed to initialize audio device: " << error);
            }

            return error;
        }

        void shutdown() {
            if (!isInitialized) return;

            audioSourcePlayer.setSource(nullptr);
            toneGenerator.reset();
            deviceManager.closeAudioDevice();
            isInitialized = false;
            isPlaying = false;

            DBG("DesktopAudioEngine: Audio device shut down");
        }

        bool startAudio() {
            if (!isInitialized || !toneGenerator) {
                DBG("DesktopAudioEngine: Cannot start - not initialized");
                return false;
            }

            if (!isPlaying) {
                deviceManager.addAudioCallback(&audioSourcePlayer);
                toneGenerator->shouldPlay = true;
                isPlaying = true;
                DBG("DesktopAudioEngine: Audio started (440 Hz sine wave)");
            }

            return true;
        }

        bool stopAudio() {
            if (isPlaying) {
                if (toneGenerator) {
                    toneGenerator->shouldPlay = false;
                }
                deviceManager.removeAudioCallback(&audioSourcePlayer);
                isPlaying = false;
                DBG("DesktopAudioEngine: Audio stopped");
            }

            return true;
        }

        bool isRunning() const {
            return isPlaying;
        }

        double getSampleRate() const {
            if (auto* device = deviceManager.getCurrentAudioDevice()) {
                return device->getCurrentSampleRate();
            }
            return 0.0;
        }

        int getBufferSize() const {
            if (auto* device = deviceManager.getCurrentAudioDevice()) {
                return device->getCurrentBufferSizeSamples();
            }
            return 0;
        }

        // Non-copyable
        DesktopAudioEngine() = default;
        ~DesktopAudioEngine() = default;
        DesktopAudioEngine(const DesktopAudioEngine&) = delete;
        DesktopAudioEngine& operator=(const DesktopAudioEngine&) = delete;
    };

    // Global instance
    static std::unique_ptr<DesktopAudioEngine> g_audioEngine;

    DesktopAudioEngine& getAudioEngine() {
        if (!g_audioEngine) {
            g_audioEngine = std::make_unique<DesktopAudioEngine>();
        }
        return *g_audioEngine;
    }
}

#endif // !iOS

// ============================================================================
// JUCE Initialization
// ============================================================================

namespace {
    struct JUCEInitializer {
        JUCEInitializer() {
            juce::MessageManager::getInstance();
            DBG("JUCE MessageManager initialized");
        }

        ~JUCEInitializer() {
            juce::MessageManager::deleteInstance();
        }
    };

    static JUCEInitializer juceInit;
}

// ========== AUDIO-ONLY FFI FUNCTIONS ==========

extern "C" {

/// Initialize audio device (iOS-specific)
/// @param engine Engine handle (unused, kept for API compatibility)
/// @param config Audio configuration (sample rate, buffer size, channels)
/// @return SCH_OK on success, error code on failure
int32_t sch_engine_audio_init(void* engine, const sch_audio_config_t* config) {
    juce::ignoreUnused(engine);

    if (!config) {
        fprintf(stderr, "Audio init failed: null config\n");
        return SCH_ERR_INVALID_ARG;
    }

    fprintf(stderr, "Audio init: %.0f Hz, %u frames, %u in, %u out\n",
            config->sample_rate, config->buffer_size,
            config->input_channels, config->output_channels);

    auto& audioEngine = getAudioEngine();

    // Initialize audio device
    auto error = audioEngine.initialise();
    if (!error.isEmpty()) {
        fprintf(stderr, "Audio device initialization failed: %s\n", error.toUTF8().getAddress());
        return SCH_ERR_AUDIO_FAILED;
    }

    fprintf(stderr, "✅ Audio device initialized successfully\n");
    fprintf(stderr, "   Actual sample rate: %.0f Hz\n", audioEngine.getSampleRate());
    fprintf(stderr, "   Actual buffer size: %d samples\n", audioEngine.getBufferSize());

    return SCH_OK;
}

/// Start audio playback
/// @param engine Engine handle (unused, kept for API compatibility)
/// @return SCH_OK on success, error code on failure
int32_t sch_engine_audio_start(void* engine) {
    juce::ignoreUnused(engine);

    auto& audioEngine = getAudioEngine();

    if (!audioEngine.startAudio()) {
        fprintf(stderr, "❌ Failed to start audio\n");
        return SCH_ERR_AUDIO_FAILED;
    }

    fprintf(stderr, "✅ Audio started\n");
    return SCH_OK;
}

/// Stop audio playback
/// @param engine Engine handle (unused, kept for API compatibility)
/// @return SCH_OK on success, error code on failure
int32_t sch_engine_audio_stop(void* engine) {
    juce::ignoreUnused(engine);

    auto& audioEngine = getAudioEngine();
    audioEngine.stopAudio();

    fprintf(stderr, "✅ Audio stopped\n");
    return SCH_OK;
}

/// Get audio status as JSON string
/// @param engine Engine handle (unused, kept for API compatibility)
/// @return JSON string with audio status (static string, caller must not free)
const char* sch_engine_get_audio_status(void* engine) {
    juce::ignoreUnused(engine);

    auto& audioEngine = getAudioEngine();

    static char statusBuffer[256];
    snprintf(statusBuffer, sizeof(statusBuffer),
             "{\"sample_rate\":%.0f,\"buffer_size\":%d,\"running\":%s}",
             audioEngine.getSampleRate(),
             audioEngine.getBufferSize(),
             audioEngine.isRunning() ? "true" : "false");

    return statusBuffer;
}

/// Send MIDI note-on event to the audio engine
/// Bridges SchillingerEngineCore events to per-channel instruments
/// @param engine Engine handle (unused, kept for API compatibility)
/// @param channel MIDI channel (0-3) for routing to specific instrument
/// @param note MIDI note number (0-127)
/// @param velocity Note velocity (0.0-1.0)
/// @return SCH_OK on success, error code on failure
int32_t sch_engine_send_note_on(void* engine, int32_t channel, int32_t note, float velocity) {
    juce::ignoreUnused(engine);

    auto& audioEngine = getAudioEngine();
    if (audioEngine.processor) {
        audioEngine.processor->triggerNoteOn(channel, note, velocity);
        return SCH_OK;
    }
    return SCH_ERR_AUDIO_FAILED;
}

/// Send MIDI note-off event to the audio engine
/// @param engine Engine handle (unused, kept for API compatibility)
/// @param channel MIDI channel (0-3) for routing to specific instrument
/// @param note MIDI note number (0-127)
/// @param velocity Release velocity (0.0-1.0)
/// @return SCH_OK on success, error code on failure
int32_t sch_engine_send_note_off(void* engine, int32_t channel, int32_t note, float velocity) {
    juce::ignoreUnused(engine);

    auto& audioEngine = getAudioEngine();
    if (audioEngine.processor) {
        audioEngine.processor->triggerNoteOff(channel, note, velocity);
        return SCH_OK;
    }
    return SCH_ERR_AUDIO_FAILED;
}

/// Send all notes off (panic)
/// @param engine Engine handle (unused, kept for API compatibility)
/// @return SCH_OK on success, error code on failure
int32_t sch_engine_all_notes_off(void* engine) {
    juce::ignoreUnused(engine);

    auto& audioEngine = getAudioEngine();
    if (audioEngine.processor) {
        audioEngine.processor->allNotesOff();
        return SCH_OK;
    }
    return SCH_ERR_AUDIO_FAILED;
}

/// Set instrument parameter
/// @param engine Engine handle (unused, kept for API compatibility)
/// @param paramId Parameter ID (e.g., "master_volume", "filter_cutoff")
/// @param value Parameter value (0.0-1.0)
/// @return SCH_OK on success, error code on failure
int32_t sch_engine_set_param(void* engine, const char* paramId, float value) {
    juce::ignoreUnused(engine);

    auto& audioEngine = getAudioEngine();
    if (audioEngine.processor) {
        audioEngine.processor->setParameter(paramId, value);
        return SCH_OK;
    }
    return SCH_ERR_AUDIO_FAILED;
}

} // extern "C"
