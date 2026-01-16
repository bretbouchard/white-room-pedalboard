#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_core/juce_core.h>
#include <type_traits>
#include <chrono>

namespace SchillingerEcosystem {
namespace Core {

/**
 * @file SafeTypes.h
 *
 * Strong type definitions to prevent swappable parameter errors
 * Uses modern C++ type-safe programming patterns
 *
 * This header provides strongly-typed wrappers for commonly swappable parameters
 * in audio processing functions, making the API self-documenting and error-resistant.
 */

// Base template for strong typing
template<typename T, typename Tag>
class StrongType {
public:
    using UnderlyingType = T;

    constexpr explicit StrongType() : value_{} {}
    constexpr explicit StrongType(T value) : value_(value) {}

    constexpr explicit operator T() const noexcept { return value_; }
    constexpr T get() const noexcept { return value_; }

    // Comparison operators
    constexpr auto operator<=>(const StrongType& other) const noexcept = default;

    // Arithmetic operators for numeric types
    template<typename U = T>
    constexpr std::enable_if_t<std::is_arithmetic_v<U>, StrongType>
    operator+(const StrongType& other) const noexcept {
        return StrongType(value_ + other.value_);
    }

    template<typename U = T>
    constexpr std::enable_if_t<std::is_arithmetic_v<U>, StrongType>
    operator-(const StrongType& other) const noexcept {
        return StrongType(value_ - other.value_);
    }

    template<typename U = T>
    constexpr std::enable_if_t<std::is_arithmetic_v<U>, StrongType>
    operator*(U scalar) const noexcept {
        return StrongType(value_ * scalar);
    }

private:
    T value_{};
};

// === TIME-RELATED STRONG TYPES ===

/**
 * Strong type for time positions in seconds
 * Prevents confusion between start and end times
 */
class TimePosition : public StrongType<double, TimePosition> {
public:
    using StrongType<double, TimePosition>::StrongType;

    static TimePosition fromSeconds(double seconds) {
        return TimePosition(seconds);
    }

    static TimePosition fromSamples(int64_t samples, double sampleRate) {
        return TimePosition(static_cast<double>(samples) / sampleRate);
    }

    double toSeconds() const { return get(); }
    int64_t toSamples(double sampleRate) const {
        return static_cast<int64_t>(get() * sampleRate);
    }

    static constexpr TimePosition zero() { return TimePosition(0.0); }
};

/**
 * Strong type for time durations in seconds
 * Distinguished from TimePosition to prevent start/end confusion
 */
class TimeDuration : public StrongType<double, TimeDuration> {
public:
    using StrongType<double, TimeDuration>::StrongType;

    static TimeDuration fromSeconds(double seconds) {
        return TimeDuration(seconds);
    }

    static TimeDuration fromMilliseconds(double milliseconds) {
        return TimeDuration(milliseconds / 1000.0);
    }

    double toSeconds() const { return get(); }
    double toMilliseconds() const { return get() * 1000.0; }

    static constexpr TimeDuration zero() { return TimeDuration(0.0); }

    // Common audio durations
    static TimeDuration oneSampleAt(double sampleRate) {
        return TimeDuration(1.0 / sampleRate);
    }
};

/**
 * Strong type for sample rates in Hz
 */
class SampleRate : public StrongType<double, SampleRate> {
public:
    using StrongType<double, SampleRate>::StrongType;

    static SampleRate fromHz(double hz) { return SampleRate(hz); }

    double toHz() const { return get(); }

    // Common sample rates
    static constexpr SampleRate cd44_1kHz() { return SampleRate(44100.0); }
    static constexpr SampleRate studio48kHz() { return SampleRate(48000.0); }
    static constexpr SampleRate highRes96kHz() { return SampleRate(96000.0); }
    static constexpr SampleRate ultraHigh192kHz() { return SampleRate(192000.0); }
};

/**
 * Strong type for audio sample counts
 */
class SampleCount : public StrongType<int64_t, SampleCount> {
public:
    using StrongType<int64_t, SampleCount>::StrongType;

    static SampleCount fromInt64(int64_t count) { return SampleCount(count); }

    int64_t toInt64() const { return get(); }

    static constexpr SampleCount zero() { return SampleCount(0); }
};

/**
 * Strong type for audio channel indices
 */
class ChannelIndex : public StrongType<int, ChannelIndex> {
public:
    using StrongType<int, ChannelIndex>::StrongType;

    static ChannelIndex fromInt(int index) { return ChannelIndex(index); }

    int toInt() const { return get(); }

    // Common channels
    static constexpr ChannelIndex left() { return ChannelIndex(0); }
    static constexpr ChannelIndex right() { return ChannelIndex(1); }
    static constexpr ChannelIndex center() { return ChannelIndex(0); }
};

/**
 * Strong type for voice bus indices
 *
 * VoiceBusIndex provides type-safe indexing for voice buses,
 * which route audio output from synthesis voices to processing chains.
 *
 * @deprecated Name changed from TrackIndex to VoiceBusIndex for clarity.
 *             TrackIndex is an alias for backward compatibility.
 */
class VoiceBusIndex : public StrongType<int, VoiceBusIndex> {
public:
    using StrongType<int, VoiceBusIndex>::StrongType;

    static VoiceBusIndex fromInt(int index) { return VoiceBusIndex(index); }

    int toInt() const { return get(); }

    static constexpr VoiceBusIndex invalid() { return VoiceBusIndex(-1); }
};

// Deprecated alias for backward compatibility
using TrackIndex [[deprecated("Use VoiceBusIndex instead")]] = VoiceBusIndex;

/**
 * Strong type for gain values (linear scale)
 */
class GainLinear : public StrongType<double, GainLinear> {
public:
    using StrongType<double, GainLinear>::StrongType;

    static GainLinear fromLinear(double linear) { return GainLinear(linear); }
    static GainLinear fromDecibels(double db) {
        return GainLinear(std::pow(10.0, db / 20.0));
    }

    double toLinear() const { return get(); }
    double toDecibels() const {
        return 20.0 * std::log10(std::max(get(), 1e-10));
    }

    static constexpr GainLinear unity() { return GainLinear(1.0); }
    static constexpr GainLinear mute() { return GainLinear(0.0); }
    static constexpr GainLinear doubleGain() { return GainLinear(2.0); }
};

/**
 * Strong type for pan positions (-1.0 to 1.0)
 */
class PanPosition : public StrongType<double, PanPosition> {
public:
    using StrongType<double, PanPosition>::StrongType;

    static PanPosition fromNormalized(double normalized) {
        return PanPosition(juce::jlimit(-1.0, 1.0, normalized));
    }

    double toNormalized() const { return get(); }

    static constexpr PanPosition center() { return PanPosition(0.0); }
    static constexpr PanPosition hardLeft() { return PanPosition(-1.0); }
    static constexpr PanPosition hardRight() { return PanPosition(1.0); }
};

/**
 * Strong type for frequency values in Hz
 */
class Frequency : public StrongType<double, Frequency> {
public:
    using StrongType<double, Frequency>::StrongType;

    static Frequency fromHz(double hz) { return Frequency(hz); }

    double toHz() const { return get(); }

    // Common frequencies
    static constexpr Frequency a440() { return Frequency(440.0); }
    static constexpr Frequency middleC() { return Frequency(261.63); }
    static constexpr Frequency subBass() { return Frequency(60.0); }
    static constexpr Frequency highTreble() { return Frequency(10000.0); }
};

// === COMPOSITE TYPES FOR RELATED PARAMETERS ===

/**
 * Range of time positions - prevents start/end confusion
 */
struct TimeRange {
    TimePosition start;
    TimePosition end;

    TimeRange() = default;
    TimeRange(TimePosition s, TimePosition e) : start(s), end(e) {
        if (end.toSeconds() < start.toSeconds()) {
            end = start; // Ensure valid range
        }
    }

    TimeDuration getDuration() const {
        return TimeDuration::fromSeconds(end.toSeconds() - start.toSeconds());
    }

    bool contains(TimePosition time) const {
        return time.toSeconds() >= start.toSeconds() &&
               time.toSeconds() < end.toSeconds();
    }

    bool overlapsWith(const TimeRange& other) const {
        return end.toSeconds() > other.start.toSeconds() &&
               start.toSeconds() < other.end.toSeconds();
    }

    static TimeRange fromStartAndDuration(TimePosition start, TimeDuration duration) {
        return TimeRange(start, TimePosition::fromSeconds(
            start.toSeconds() + duration.toSeconds()));
    }

    static TimeRange zero() { return TimeRange(TimePosition::zero(), TimePosition::zero()); }
};

/**
 * Audio processing context - groups related parameters
 */
struct AudioProcessingContext {
    TimeRange timeRange;
    SampleCount sampleCount;
    SampleRate sampleRate;

    AudioProcessingContext() = default;
    AudioProcessingContext(TimeRange range, SampleCount samples, SampleRate rate)
        : timeRange(range), sampleCount(samples), sampleRate(rate) {}

    TimeDuration getDuration() const { return timeRange.getDuration(); }
    double getSampleRateHz() const { return sampleRate.toHz(); }
    int64_t getSampleCountInt() const { return sampleCount.toInt64(); }
};

/**
 * Position within an audio clip - distinguishes from absolute time
 */
class ClipTimePosition : public StrongType<double, ClipTimePosition> {
public:
    using StrongType<double, ClipTimePosition>::StrongType;

    static ClipTimePosition fromSeconds(double seconds) {
        return ClipTimePosition(juce::jmax(0.0, seconds));
    }

    double toSeconds() const { return get(); }

    static constexpr ClipTimePosition zero() { return ClipTimePosition(0.0); }
};

/**
 * Sample position for interpolation - distinguishes from channel index
 */
class SamplePosition : public StrongType<double, SamplePosition> {
public:
    using StrongType<double, SamplePosition>::StrongType;

    static SamplePosition fromDouble(double position) {
        return SamplePosition(juce::jmax(0.0, position));
    }

    double toDouble() const { return get(); }

    int toIntegerSampleIndex() const { return static_cast<int>(get()); }
    double getFractionalPart() const {
        return get() - std::floor(get());
    }

    static constexpr SamplePosition zero() { return SamplePosition(0.0); }
};

/**
 * Audio level values - distinguishes from other double parameters
 */
class AudioLevel : public StrongType<double, AudioLevel> {
public:
    using StrongType<double, AudioLevel>::StrongType;

    static AudioLevel fromLinear(double linear) {
        return AudioLevel(juce::jlimit(0.0, 1.0, linear));
    }

    static AudioLevel fromDecibels(double db) {
        double linear = std::pow(10.0, db / 20.0);
        return fromLinear(linear);
    }

    double toLinear() const { return get(); }
    double toDecibels() const {
        return 20.0 * std::log10(std::max(get(), 1e-10));
    }

    static constexpr AudioLevel silence() { return AudioLevel(0.0); }
    static constexpr AudioLevel fullScale() { return AudioLevel(1.0); }
};

/**
 * Named parameter builder pattern for complex functions
 */
class AudioClipParameters {
public:
    AudioClipParameters& setPosition(TimeRange range) {
        position_ = range;
        return *this;
    }

    AudioClipParameters& setSourceRange(TimeRange source) {
        sourceRange_ = source;
        return *this;
    }

    AudioClipParameters& setGain(GainLinear gain) {
        gain_ = gain;
        return *this;
    }

    AudioClipParameters& setPan(PanPosition pan) {
        pan_ = pan;
        return *this;
    }

    AudioClipParameters& setVoiceBus(VoiceBusIndex voiceBus) {
        voiceBusIndex_ = voiceBus;
        return *this;
    }

    // Deprecated alias for backward compatibility
    [[deprecated("Use setVoiceBus() instead")]]
    AudioClipParameters& setTrack(TrackIndex track) {
        return setVoiceBus(static_cast<VoiceBusIndex>(track));
    }

    // Accessors
    TimeRange getPosition() const { return position_; }
    TimeRange getSourceRange() const { return sourceRange_; }
    GainLinear getGain() const { return gain_; }
    PanPosition getPan() const { return pan_; }
    VoiceBusIndex getVoiceBusIndex() const { return voiceBusIndex_; }

    // Deprecated alias for backward compatibility
    [[deprecated("Use getVoiceBusIndex() instead")]]
    TrackIndex getTrackIndex() const {
        return TrackIndex(getVoiceBusIndex());
    }

private:
    TimeRange position_{TimePosition::zero(), TimePosition::zero()};
    TimeRange sourceRange_{TimePosition::zero(), TimePosition::zero()};
    GainLinear gain_{GainLinear::unity()};
    PanPosition pan_{PanPosition::center()};
    VoiceBusIndex voiceBusIndex_{VoiceBusIndex::invalid()};
};

// === UTILITY FUNCTIONS ===

/**
 * Validate time ranges and parameters
 */
class ParameterValidator {
public:
    static bool isValidTimeRange(const TimeRange& range) {
        return range.end.toSeconds() > range.start.toSeconds() &&
               range.start.toSeconds() >= 0.0;
    }

    static bool isValidSampleRate(const SampleRate& rate) {
        double hz = rate.toHz();
        return hz >= 8000.0 && hz <= 192000.0; // Common audio range
    }

    static bool isValidChannelIndex(const ChannelIndex& channel, int maxChannels) {
        int idx = channel.toInt();
        return idx >= 0 && idx < maxChannels;
    }

    static bool isValidGain(const GainLinear& gain) {
        return gain.toLinear() >= 0.0 && gain.toLinear() <= 10.0; // Reasonable range
    }

    static bool isValidPanPosition(const PanPosition& pan) {
        double normalized = pan.toNormalized();
        return normalized >= -1.0 && normalized <= 1.0;
    }
};

} // namespace Core
} // namespace SchillingerEcosystem