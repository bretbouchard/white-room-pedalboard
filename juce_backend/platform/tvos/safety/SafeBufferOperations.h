#pragma once

#include <vector>
#include <string>
#include <memory>
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>

namespace SchillingerEcosystem::Security {

/**
 * Safe buffer operations utility class
 * Provides secure alternatives to common buffer operations to prevent security vulnerabilities
 */
class SafeBufferOperations {
public:
    // Safe string operations
    static juce::String safeStringCopy(const char* source, size_t max_length = 511);
    static juce::String safeStringCopy(const std::string& source, size_t max_length = 511);

    // Safe buffer allocation
    template<typename T>
    static std::vector<T> safeBufferAllocate(size_t size, size_t max_size = 65536);

    // Safe buffer copy with bounds checking
    template<typename T>
    static bool safeBufferCopy(std::vector<T>& dest, const T* source, size_t count, size_t max_count = 65536);

    // Audio buffer validation
    static bool validateAudioBuffer(float** buffer_data, int channels, int samples);
    static bool validateAudioBuffer(const juce::AudioBuffer<float>& buffer);

    // Parameter validation utilities
    static bool validateSampleCount(int samples, int max_safe = 65536);
    static bool validateChannelCount(int channels, int min_channels = 1, int max_channels = 32);
    static bool validateSampleRate(double rate, double min_rate = 8000.0, double max_rate = 192000.0);
    static bool validateConversionRatio(double ratio, double max_safe_ratio = 8.0);

    // History buffer management
    template<typename T>
    static void manageHistorySize(std::vector<T>& history, size_t max_size, bool preserve_latest = true);

private:
    // Internal constants for safe operations
    constexpr static size_t DEFAULT_MAX_STRING_LENGTH = 511;
    constexpr static size_t DEFAULT_MAX_BUFFER_SIZE = 65536;
    constexpr static int DEFAULT_MAX_AUDIO_CHANNELS = 32;
    constexpr static double DEFAULT_MAX_CONVERSION_RATIO = 8.0;

public:
    // Helper methods
    static void logSecurityViolation(const juce::String& operation, const juce::String& details);
};

// Template implementations

template<typename T>
std::vector<T> SafeBufferOperations::safeBufferAllocate(size_t size, size_t max_size) {
    if (size > max_size) {
        logSecurityViolation("Buffer Allocation", "Requested size " + juce::String(size) +
                           " exceeds maximum " + juce::String(max_size));
        return std::vector<T>(max_size);  // Return maximum safe size instead of failing
    }

    try {
        return std::vector<T>(size);
    } catch (const std::bad_alloc&) {
        logSecurityViolation("Buffer Allocation", "Memory allocation failed for size " + juce::String(size));
        return std::vector<T>(std::min(size, max_size / 2));  // Fall back to smaller size
    }
}

template<typename T>
bool SafeBufferOperations::safeBufferCopy(std::vector<T>& dest, const T* source, size_t count, size_t max_count) {
    if (source == nullptr) {
        logSecurityViolation("Buffer Copy", "Null source pointer");
        return false;
    }

    if (count > max_count) {
        logSecurityViolation("Buffer Copy", "Count " + juce::String(count) +
                           " exceeds maximum " + juce::String(max_count));
        count = max_count;  // Truncate to safe size
    }

    if (dest.size() < count) {
        logSecurityViolation("Buffer Copy", "Destination buffer too small");
        return false;
    }

    try {
        std::memcpy(dest.data(), source, count * sizeof(T));
        return true;
    } catch (...) {
        logSecurityViolation("Buffer Copy", "Memory copy operation failed");
        return false;
    }
}

template<typename T>
void SafeBufferOperations::manageHistorySize(std::vector<T>& history, size_t max_size, bool preserve_latest) {
    if (history.size() <= max_size) {
        return;  // No action needed
    }

    size_t excess = history.size() - max_size;

    if (preserve_latest) {
        // Remove oldest entries to preserve most recent data
        history.erase(history.begin(), history.begin() + excess);
    } else {
        // Remove oldest entries (default behavior)
        history.erase(history.begin(), history.begin() + excess);
    }
}

/**
 * RAII class for safe audio buffer management
 */
class SafeAudioBuffer {
public:
    SafeAudioBuffer(int channels, int samples, float initial_value = 0.0f);
    ~SafeAudioBuffer() = default;

    // Accessors
    float* getWritePointer(int channel, int sample = 0);
    const float* getReadPointer(int channel, int sample = 0) const;

    // Safe operations
    void clear();
    void applyGain(float gain);
    void applyGainRamp(int start_sample, int num_samples, float start_gain, float end_gain);

    // Validation
    bool isValid() const;
    int getNumChannels() const { return buffer_->getNumChannels(); }
    int getNumSamples() const { return buffer_->getNumSamples(); }

    // Move operations
    SafeAudioBuffer(SafeAudioBuffer&& other) noexcept = default;
    SafeAudioBuffer& operator=(SafeAudioBuffer&& other) noexcept = default;

    // Disable copy operations
    SafeAudioBuffer(const SafeAudioBuffer&) = delete;
    SafeAudioBuffer& operator=(const SafeAudioBuffer&) = delete;

private:
    std::unique_ptr<juce::AudioBuffer<float>> buffer_;
    bool is_valid_;

    void validateAndLog();
};

} // namespace SchillingerEcosystem::Security