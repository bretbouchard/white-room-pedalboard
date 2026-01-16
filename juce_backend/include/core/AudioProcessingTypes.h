#pragma once

#include "SafeTypes.h"
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_core/juce_core.h>

namespace SchillingerEcosystem {
namespace Core {

/**
 * @file AudioProcessingTypes.h
 *
 * Extended safe types for specialized audio processing scenarios
 * Builds upon the core SafeTypes.h to provide domain-specific type safety
 */

// === MIXING AND AUDIO PROCESSING TYPES ===

/**
 * Strong type for audio channel levels
 * Distinguishes from other double values
 */
class AudioChannelLevel : public StrongType<double, AudioChannelLevel> {
public:
    using StrongType<double, AudioChannelLevel>::StrongType;

    static AudioChannelLevel fromLinear(double linear) {
        return AudioChannelLevel(juce::jlimit(0.0, 2.0, linear));
    }

    static AudioChannelLevel fromDecibels(double db) {
        double linear = std::pow(10.0, db / 20.0);
        return fromLinear(linear);
    }

    double toLinear() const { return get(); }
    double toDecibels() const {
        return 20.0 * std::log10(std::max(get(), 1e-10));
    }

    static constexpr AudioChannelLevel silence() { return AudioChannelLevel(0.0); }
    static constexpr AudioChannelLevel unity() { return AudioChannelLevel(1.0); }
    static constexpr AudioChannelLevel doubleLevel() { return AudioChannelLevel(2.0); }
};

/**
 * Strong type for zoom factors
 * Prevents confusion between horizontal and vertical zoom
 */
class ZoomFactor : public StrongType<double, ZoomFactor> {
public:
    using StrongType<double, ZoomFactor>::StrongType;

    static ZoomFactor fromRatio(double ratio) {
        return ZoomFactor(juce::jlimit(0.1, 100.0, ratio));
    }

    double toRatio() const { return get(); }

    static constexpr ZoomFactor none() { return ZoomFactor(1.0); }
    static constexpr ZoomFactor zoomIn2x() { return ZoomFactor(2.0); }
    static constexpr ZoomFactor zoomOut2x() { return ZoomFactor(0.5); }
    static constexpr ZoomFactor zoomIn10x() { return ZoomFactor(10.0); }
};

/**
 * Strong type for automation values
 * Distinguished from time positions and levels
 */
class AutomationValue : public StrongType<double, AutomationValue> {
public:
    using StrongType<double, AutomationValue>::StrongType;

    static AutomationValue fromNormalized(double normalized) {
        return AutomationValue(juce::jlimit(0.0, 1.0, normalized));
    }

    static AutomationValue fromRange(double value, double min, double max) {
        double normalized = (value - min) / (max - min);
        return fromNormalized(normalized);
    }

    double toNormalized() const { return get(); }
    double toRange(double min, double max) const {
        return min + get() * (max - min);
    }

    static constexpr AutomationValue minimum() { return AutomationValue(0.0); }
    static constexpr AutomationValue maximum() { return AutomationValue(1.0); }
    static constexpr AutomationValue center() { return AutomationValue(0.5); }
};

/**
 * Strong type for MIDI note values
 * Prevents confusion with other numeric parameters
 */
class MidiNoteValue : public StrongType<int, MidiNoteValue> {
public:
    using StrongType<int, MidiNoteValue>::StrongType;

    static MidiNoteValue fromInt(int note) {
        return MidiNoteValue(juce::jlimit(0, 127, note));
    }

    int toInt() const { return get(); }

    double toFrequency() const {
        return 440.0 * std::pow(2.0, (get() - 69) / 12.0);
    }

    juce::String toNoteName() const {
        static const char* noteNames[] = {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};
        int octave = (get() / 12) - 1;
        int noteIndex = get() % 12;
        return juce::String(noteNames[noteIndex]) + juce::String(octave);
    }

    static constexpr MidiNoteValue a440() { return MidiNoteValue(69); }
    static constexpr MidiNoteValue middleC() { return MidiNoteValue(60); }
    static constexpr MidiNoteValue lowest() { return MidiNoteValue(0); }
    static constexpr MidiNoteValue highest() { return MidiNoteValue(127); }
};

/**
 * Strong type for velocity values
 * Prevents confusion with other numeric parameters
 */
class MidiVelocity : public StrongType<int, MidiVelocity> {
public:
    using StrongType<int, MidiVelocity>::StrongType;

    static MidiVelocity fromInt(int velocity) {
        return MidiVelocity(juce::jlimit(0, 127, velocity));
    }

    static MidiVelocity fromNormalized(double normalized) {
        return MidiVelocity::fromInt(static_cast<int>(normalized * 127.0));
    }

    int toInt() const { return get(); }
    double toNormalized() const { return get() / 127.0; }

    static constexpr MidiVelocity silent() { return MidiVelocity(0); }
    static constexpr MidiVelocity normal() { return MidiVelocity(100); }
    static constexpr MidiVelocity loudest() { return MidiVelocity(127); }
};

// === COMPOSITE TYPES FOR AUDIO PROCESSING ===

/**
 * Stereo audio level pair
 * Prevents left/right channel confusion
 */
struct StereoLevel {
    AudioChannelLevel left;
    AudioChannelLevel right;

    StereoLevel() = default;
    StereoLevel(AudioChannelLevel l, AudioChannelLevel r) : left(l), right(r) {}

    static StereoLevel fromMono(AudioChannelLevel mono) {
        return StereoLevel(mono, mono);
    }

    static StereoLevel fromPanned(AudioChannelLevel mono, PanPosition pan) {
        double panNorm = pan.toNormalized();
        double leftGain = panNorm < 0.0 ? 1.0 : 1.0 - panNorm;
        double rightGain = panNorm > 0.0 ? 1.0 : 1.0 + panNorm;

        return StereoLevel(
            AudioChannelLevel::fromLinear(mono.toLinear() * leftGain),
            AudioChannelLevel::fromLinear(mono.toLinear() * rightGain)
        );
    }

    AudioChannelLevel getMono() const {
        return AudioChannelLevel::fromLinear((left.toLinear() + right.toLinear()) * 0.5);
    }
};

/**
 * Zoom parameters for UI components
 * Groups horizontal and vertical zoom to prevent swapping
 */
struct ZoomParameters {
    ZoomFactor horizontal;
    ZoomFactor vertical;

    ZoomParameters() = default;
    ZoomParameters(ZoomFactor h, ZoomFactor v) : horizontal(h), vertical(v) {}

    static ZoomParameters uniform(ZoomFactor zoom) {
        return ZoomParameters(zoom, zoom);
    }

    static ZoomParameters fitWidth() {
        return ZoomParameters(ZoomFactor::none(), ZoomFactor::none());
    }
};

/**
 * Automation point coordinates
 * Prevents time/value confusion in automation systems
 */
struct AutomationPoint {
    TimePosition time;
    AutomationValue value;

    AutomationPoint() = default;
    AutomationPoint(TimePosition t, AutomationValue v) : time(t), value(v) {}

    static AutomationPoint fromSecondsAndNormalized(double timeSeconds, double normalizedValue) {
        return AutomationPoint(
            TimePosition::fromSeconds(timeSeconds),
            AutomationValue::fromNormalized(normalizedValue)
        );
    }
};

/**
 * MIDI note event data
 * Groups related MIDI parameters to prevent confusion
 */
struct MidiNoteEvent {
    MidiNoteValue note;
    MidiVelocity velocity;
    TimePosition startTime;
    TimeDuration duration;

    MidiNoteEvent() = default;
    MidiNoteEvent(MidiNoteValue n, MidiVelocity v, TimePosition start, TimeDuration dur)
        : note(n), velocity(v), startTime(start), duration(dur) {}

    TimePosition getEndTime() const {
        return TimePosition::fromSeconds(startTime.toSeconds() + duration.toSeconds());
    }

    bool containsTime(TimePosition time) const {
        return time.toSeconds() >= startTime.toSeconds() &&
               time.toSeconds() < getEndTime().toSeconds();
    }
};

/**
 * Value range for automation and parameters
 * Prevents min/max value confusion
 */
struct ValueRange {
    AutomationValue minimum;
    AutomationValue maximum;

    ValueRange() = default;
    ValueRange(AutomationValue min, AutomationValue max) : minimum(min), maximum(max) {
        if (maximum.toNormalized() < minimum.toNormalized()) {
            maximum = minimum; // Ensure valid range
        }
    }

    static ValueRange fromNormalized(double min, double max) {
        return ValueRange(
            AutomationValue::fromNormalized(min),
            AutomationValue::fromNormalized(max)
        );
    }

    AutomationValue getCenter() const {
        double centerNorm = (minimum.toNormalized() + maximum.toNormalized()) * 0.5;
        return AutomationValue::fromNormalized(centerNorm);
    }

    bool contains(AutomationValue value) const {
        return value.toNormalized() >= minimum.toNormalized() &&
               value.toNormalized() <= maximum.toNormalized();
    }

    AutomationDuration getSpan() const {
        return AutomationDuration::fromNormalized(maximum.toNormalized() - minimum.toNormalized());
    }
};

/**
 * Performance metrics
 * Groups related timing measurements
 */
struct PerformanceMetrics {
    double averageTime = 0.0;
    double maximumTime = 0.0;
    int underruns = 0;
    int overruns = 0;

    void update(double newTime) {
        if (newTime > maximumTime) {
            maximumTime = newTime;
        }
        averageTime = (averageTime + newTime) * 0.5; // Simple moving average
    }

    void reset() {
        averageTime = 0.0;
        maximumTime = 0.0;
        underruns = 0;
        overruns = 0;
    }
};

// === NAMED PARAMETER BUILDERS ===

/**
 * Builder for audio processing parameters
 * Provides fluent interface for complex parameter setting
 */
class AudioProcessingParameters {
public:
    AudioProcessingParameters& setTimeRange(const TimeRange& range) {
        timeRange_ = range;
        return *this;
    }

    AudioProcessingParameters& setSampleRate(SampleRate rate) {
        sampleRate_ = rate;
        return *this;
    }

    AudioProcessingParameters& setSampleCount(SampleCount count) {
        sampleCount_ = count;
        return *this;
    }

    AudioProcessingParameters& setGain(GainLinear gain) {
        gain_ = gain;
        return *this;
    }

    AudioProcessingParameters& setPan(PanPosition pan) {
        pan_ = pan;
        return *this;
    }

    AudioProcessingParameters& setMuted(bool muted) {
        muted_ = muted;
        return *this;
    }

    AudioProcessingContext buildContext() const {
        return AudioProcessingContext{timeRange_, sampleCount_, sampleRate_};
    }

    // Accessors
    TimeRange getTimeRange() const { return timeRange_; }
    SampleRate getSampleRate() const { return sampleRate_; }
    SampleCount getSampleCount() const { return sampleCount_; }
    GainLinear getGain() const { return gain_; }
    PanPosition getPan() const { return pan_; }
    bool isMuted() const { return muted_; }

private:
    TimeRange timeRange_{TimePosition::zero(), TimePosition::zero()};
    SampleRate sampleRate_{SampleRate::cd44_1kHz()};
    SampleCount sampleCount_{SampleCount::fromInt64(0)};
    GainLinear gain_{GainLinear::unity()};
    PanPosition pan_{PanPosition::center()};
    bool muted_ = false;
};

/**
 * Builder for automation lane parameters
 */
class AutomationLaneParameters {
public:
    AutomationLaneParameters& setTimeRange(const TimeRange& range) {
        timeRange_ = range;
        return *this;
    }

    AutomationLaneParameters& setValueRange(const ValueRange& range) {
        valueRange_ = range;
        return *this;
    }

    AutomationLaneParameters& setZoom(const ZoomParameters& zoom) {
        zoom_ = zoom;
        return *this;
    }

    AutomationLaneParameters& setLoopRange(const TimeRange& range) {
        loopRange_ = range;
        return *this;
    }

    AutomationLaneParameters& addPoint(const AutomationPoint& point) {
        points_.push_back(point);
        return *this;
    }

    // Accessors
    TimeRange getTimeRange() const { return timeRange_; }
    ValueRange getValueRange() const { return valueRange_; }
    ZoomParameters getZoom() const { return zoom_; }
    TimeRange getLoopRange() const { return loopRange_; }
    const std::vector<AutomationPoint>& getPoints() const { return points_; }

private:
    TimeRange timeRange_{TimePosition::zero(), TimePosition::zero()};
    ValueRange valueRange_{AutomationValue::minimum(), AutomationValue::maximum()};
    ZoomParameters zoom_{ZoomFactor::none(), ZoomFactor::none()};
    TimeRange loopRange_{TimePosition::zero(), TimePosition::zero()};
    std::vector<AutomationPoint> points_;
};

// === VALIDATION UTILITIES ===

/**
 * Extended parameter validation for audio processing types
 */
class AudioParameterValidator {
public:
    static bool isValidAudioChannelLevel(const AudioChannelLevel& level) {
        return level.toLinear() >= 0.0 && level.toLinear() <= 2.0;
    }

    static bool isValidZoomFactor(const ZoomFactor& zoom) {
        return zoom.toRatio() >= 0.1 && zoom.toRatio() <= 100.0;
    }

    static bool isValidAutomationValue(const AutomationValue& value) {
        double normalized = value.toNormalized();
        return normalized >= 0.0 && normalized <= 1.0;
    }

    static bool isValidMidiNote(const MidiNoteValue& note) {
        int noteInt = note.toInt();
        return noteInt >= 0 && noteInt <= 127;
    }

    static bool isValidMidiVelocity(const MidiVelocity& velocity) {
        int velInt = velocity.toInt();
        return velInt >= 0 && velInt <= 127;
    }

    static bool isValidValueRange(const ValueRange& range) {
        return range.minimum.toNormalized() <= range.maximum.toNormalized();
    }

    static bool isValidStereoLevel(const StereoLevel& level) {
        return isValidAudioChannelLevel(level.left) &&
               isValidAudioChannelLevel(level.right);
    }

    static bool isValidAutomationPoint(const AutomationPoint& point) {
        return point.time.toSeconds() >= 0.0 &&
               isValidAutomationValue(point.value);
    }

    static bool isValidMidiNoteEvent(const MidiNoteEvent& event) {
        return isValidMidiNote(event.note) &&
               isValidMidiVelocity(event.velocity) &&
               event.startTime.toSeconds() >= 0.0 &&
               event.duration.toSeconds() >= 0.0;
    }
};

} // namespace Core
} // namespace SchillingerEcosystem