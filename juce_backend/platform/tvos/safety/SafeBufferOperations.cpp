#include "SafeBufferOperations.h"
#include <cstring>
#include <algorithm>
#include <stdexcept>

namespace SchillingerEcosystem::Security {

juce::String SafeBufferOperations::safeStringCopy(const char* source, size_t max_length) {
    if (source == nullptr) {
        logSecurityViolation("String Copy", "Null source pointer");
        return juce::String();
    }

    try {
        size_t source_length = strnlen(source, max_length + 1);  // Check actual length with safety margin

        if (source_length > max_length) {
            logSecurityViolation("String Copy", "Source string length " + juce::String(source_length) +
                               " exceeds maximum " + juce::String(max_length));
            return juce::String(source, static_cast<int>(max_length));  // Safe truncation
        }

        return juce::String(source, static_cast<int>(source_length));
    } catch (...) {
        logSecurityViolation("String Copy", "Exception during string copy operation");
        return juce::String();
    }
}

juce::String SafeBufferOperations::safeStringCopy(const std::string& source, size_t max_length) {
    if (source.length() > max_length) {
        logSecurityViolation("String Copy", "Source string length " + juce::String(source.length()) +
                           " exceeds maximum " + juce::String(max_length));
        return juce::String(source.substr(0, max_length));  // Safe truncation
    }

    return juce::String(source);
}

bool SafeBufferOperations::validateAudioBuffer(float** buffer_data, int channels, int samples) {
    // Validate basic parameters
    if (buffer_data == nullptr) {
        logSecurityViolation("Audio Buffer Validation", "Null buffer data pointer");
        return false;
    }

    if (!validateChannelCount(channels) || !validateSampleCount(samples)) {
        return false;
    }

    // Validate each channel pointer
    for (int ch = 0; ch < channels; ++ch) {
        if (buffer_data[ch] == nullptr) {
            logSecurityViolation("Audio Buffer Validation", "Null channel pointer for channel " + juce::String(ch));
            return false;
        }
    }

    return true;
}

bool SafeBufferOperations::validateAudioBuffer(const juce::AudioBuffer<float>& buffer) {
    return validateChannelCount(buffer.getNumChannels()) &&
           validateSampleCount(buffer.getNumSamples());
}

bool SafeBufferOperations::validateSampleCount(int samples, int max_safe) {
    if (samples <= 0) {
        logSecurityViolation("Sample Count Validation", "Non-positive sample count: " + juce::String(samples));
        return false;
    }

    if (samples > max_safe) {
        logSecurityViolation("Sample Count Validation", "Sample count " + juce::String(samples) +
                           " exceeds maximum safe " + juce::String(max_safe));
        return false;
    }

    return true;
}

bool SafeBufferOperations::validateChannelCount(int channels, int min_channels, int max_channels) {
    if (channels < min_channels) {
        logSecurityViolation("Channel Count Validation", "Channel count " + juce::String(channels) +
                           " below minimum " + juce::String(min_channels));
        return false;
    }

    if (channels > max_channels) {
        logSecurityViolation("Channel Count Validation", "Channel count " + juce::String(channels) +
                           " exceeds maximum " + juce::String(max_channels));
        return false;
    }

    return true;
}

bool SafeBufferOperations::validateSampleRate(double rate, double min_rate, double max_rate) {
    if (rate <= 0.0) {
        logSecurityViolation("Sample Rate Validation", "Non-positive sample rate: " + juce::String(rate));
        return false;
    }

    if (rate < min_rate || rate > max_rate) {
        logSecurityViolation("Sample Rate Validation", "Sample rate " + juce::String(rate) +
                           " outside safe range [" + juce::String(min_rate) + ", " + juce::String(max_rate) + "]");
        return false;
    }

    return true;
}

bool SafeBufferOperations::validateConversionRatio(double ratio, double max_safe_ratio) {
    if (ratio <= 0.0) {
        logSecurityViolation("Conversion Ratio Validation", "Non-positive conversion ratio: " + juce::String(ratio));
        return false;
    }

    if (ratio > max_safe_ratio) {
        logSecurityViolation("Conversion Ratio Validation", "Conversion ratio " + juce::String(ratio) +
                           " exceeds maximum safe " + juce::String(max_safe_ratio));
        return false;
    }

    return true;
}

void SchillingerEcosystem::Security::SafeBufferOperations::logSecurityViolation(const juce::String& operation, const juce::String& details) {
    juce::Logger::writeToLog("🚨 SECURITY VIOLATION [" + operation + "]: " + details);
}

// SafeAudioBuffer implementation

SafeAudioBuffer::SafeAudioBuffer(int channels, int samples, float initial_value)
    : buffer_(nullptr), is_valid_(false) {

    if (!SafeBufferOperations::validateChannelCount(channels) ||
        !SafeBufferOperations::validateSampleCount(samples)) {
        validateAndLog();
        return;
    }

    try {
        buffer_ = std::make_unique<juce::AudioBuffer<float>>(channels, samples);
        buffer_->clear();
        if (initial_value != 0.0f) {
            buffer_->applyGain(initial_value);
        }
        is_valid_ = true;
    } catch (const std::exception& e) {
        SchillingerEcosystem::Security::SafeBufferOperations::logSecurityViolation("Audio Buffer Creation",
            juce::String("Exception: ") + e.what());
        buffer_.reset();
        is_valid_ = false;
    }

    validateAndLog();
}

float* SafeAudioBuffer::getWritePointer(int channel, int sample) {
    if (!isValid() || !buffer_) {
        return nullptr;
    }

    if (!SafeBufferOperations::validateChannelCount(channel, 0, getNumChannels() - 1) ||
        !SafeBufferOperations::validateSampleCount(sample, getNumSamples())) {
        return nullptr;
    }

    return buffer_->getWritePointer(channel, sample);
}

const float* SafeAudioBuffer::getReadPointer(int channel, int sample) const {
    if (!isValid() || !buffer_) {
        return nullptr;
    }

    if (!SafeBufferOperations::validateChannelCount(channel, 0, getNumChannels() - 1) ||
        !SafeBufferOperations::validateSampleCount(sample, getNumSamples())) {
        return nullptr;
    }

    return buffer_->getReadPointer(channel, sample);
}

void SafeAudioBuffer::clear() {
    if (isValid() && buffer_) {
        buffer_->clear();
    } else {
        SchillingerEcosystem::Security::SafeBufferOperations::logSecurityViolation("Audio Buffer Clear", "Invalid buffer state");
    }
}

void SafeAudioBuffer::applyGain(float gain) {
    if (isValid() && buffer_) {
        buffer_->applyGain(std::clamp(gain, -100.0f, 100.0f));  // Clamp to reasonable range
    } else {
        SchillingerEcosystem::Security::SafeBufferOperations::logSecurityViolation("Audio Buffer Gain", "Invalid buffer state");
    }
}

void SafeAudioBuffer::applyGainRamp(int start_sample, int num_samples, float start_gain, float end_gain) {
    if (!isValid() || !buffer_) {
        SchillingerEcosystem::Security::SafeBufferOperations::logSecurityViolation("Audio Buffer Gain Ramp", "Invalid buffer state");
        return;
    }

    if (!SafeBufferOperations::validateSampleCount(start_sample, getNumSamples()) ||
        !SafeBufferOperations::validateSampleCount(num_samples, getNumSamples() - start_sample)) {
        return;
    }

    // Clamp gains to reasonable range
    start_gain = std::clamp(start_gain, -100.0f, 100.0f);
    end_gain = std::clamp(end_gain, -100.0f, 100.0f);

    buffer_->applyGainRamp(start_sample, num_samples, start_gain, end_gain);
}

bool SafeAudioBuffer::isValid() const {
    return is_valid_ && buffer_ != nullptr;
}

void SafeAudioBuffer::validateAndLog() {
    if (!is_valid_) {
        SchillingerEcosystem::Security::SafeBufferOperations::logSecurityViolation("Audio Buffer", "Buffer creation failed or buffer is invalid");
    }
}

} // namespace SchillingerEcosystem::Security