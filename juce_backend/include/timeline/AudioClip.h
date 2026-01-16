#pragma once

#include "JuceHeader.h"
#include <memory>

namespace SchillingerEcosystem::Timeline {

// Forward declarations for Core types (stub implementations)
namespace Core {
    struct SampleRate {
        SampleRate(double hz = 44100.0) : sampleRate_(hz) {}
        double toHz() const { return sampleRate_; }
        double sampleRate_;
    };

    struct TimePosition {
        TimePosition(double seconds = 0.0) : seconds_(seconds) {}
        double toSeconds() const { return seconds_; }
        double seconds_;
    };

    struct TimeRange {
        TimeRange(TimePosition start, TimePosition end) : start(start), end(end) {}
        TimePosition start;
        TimePosition end;
    };
}

// Stub constants
namespace AudioConstants {
    constexpr double MIN_TIME_OFFSET = 0.001;
}

/**
 * AudioClip represents a segment of audio on the timeline
 * This header matches what AudioClip_safe_example.cpp expects
 */
class AudioClip {
public:
    AudioClip();
    AudioClip(juce::String name,
              const std::shared_ptr<juce::AudioBuffer<float>>& audioData,
              Core::SampleRate sampleRate);
    ~AudioClip() = default;

    // Methods expected by the implementation
    void setPosition(const Core::TimeRange& position);
    void setSourceRange(const Core::TimeRange& sourceRange);

    // Stub implementations
    void updateDuration() {} // Placeholder
    void someMethod() {} // Placeholder for any missing methods

private:
    // Member variables expected by the implementation
    juce::String clipName = "New Clip";
    double startPosition = 0.0;
    double endPosition = 1.0;
    double sourceStartPosition = 0.0;
    double sourceEndPosition = 1.0;
    std::shared_ptr<juce::AudioBuffer<float>> audioBuffer;
    double sourceSampleRate = 44100.0;
};

} // namespace SchillingerEcosystem::Timeline