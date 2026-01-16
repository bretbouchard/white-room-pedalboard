/*
  ==============================================================================

    WhiteRoomErrorHandler.cpp
    Created: 15 Jan 2026
    Author:  White Room Development Team

  ==============================================================================
*/

#include "WhiteRoomErrorHandler.h"

namespace WhiteRoom
{

//==============================================================================
// Static Member Initialization
//==============================================================================

ErrorHandler::ErrorCallback ErrorHandler::errorCallback = nullptr;
juce::CriticalSection ErrorHandler::callbackLock;

//==============================================================================
// White Room Error Factory Methods
//==============================================================================

WhiteRoomError WhiteRoomError::audioEngineNotReady()
{
    WhiteRoomError error;
    error.category = ErrorCategory::Audio;
    error.severity = ErrorSeverity::Warning;
    error.error = AudioError { AudioError::Type::EngineNotReady };
    error.code = "AUDIO_001";
    error.userMessage = "The audio engine is not ready yet. Please wait a moment and try again.";
    error.technicalDetails = "Audio engine initialization incomplete or not started";
    error.recoverySuggestion = "Wait a moment for the engine to initialize, then try again.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::audioEngineCrashed(const juce::String& reason)
{
    WhiteRoomError error;
    error.category = ErrorCategory::Audio;
    error.severity = ErrorSeverity::Critical;
    error.error = AudioError { AudioError::Type::EngineCrashed, reason };
    error.code = "AUDIO_002";
    error.userMessage = "The audio engine has crashed and needs to be restarted.";
    error.technicalDetails = "Audio engine crashed: " + reason;
    error.recoverySuggestion = "Restart the audio engine from the settings menu. If the problem persists, restart the application.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::audioDropout(int count, double duration)
{
    WhiteRoomError error;
    error.category = ErrorCategory::Audio;
    error.severity = ErrorSeverity::Error;
    error.error = AudioError { AudioError::Type::DropoutDetected, juce::String(), count, duration };
    error.code = "AUDIO_003";
    error.userMessage = "Audio dropout detected (count: " + juce::String(count) +
                       ", duration: " + juce::String(duration, 2) + "s). Audio may be interrupted.";
    error.technicalDetails = "Audio dropout: " + juce::String(count) + " occurrences, " +
                            juce::String(duration, 2) + "s total duration";
    error.recoverySuggestion = "Increase the buffer size in audio settings, close other applications, or reduce plugin CPU load.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::audioXrun(int count)
{
    WhiteRoomError error;
    error.category = ErrorCategory::Audio;
    error.severity = ErrorSeverity::Warning;
    error.error = AudioError { AudioError::Type::XrunDetected, juce::String(), count };
    error.code = "AUDIO_004";
    error.userMessage = "Audio glitch detected (" + juce::String(count) + " xrun). Try increasing buffer size.";
    error.technicalDetails = "Sample rate overflow/underflow: " + juce::String(count) + " events detected";
    error.recoverySuggestion = "Increase the buffer size in audio settings, close other applications, or reduce plugin CPU load.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::playbackFailed(const juce::String& reason)
{
    WhiteRoomError error;
    error.category = ErrorCategory::Audio;
    error.severity = ErrorSeverity::Error;
    error.error = AudioError { AudioError::Type::PlaybackFailed, reason };
    error.code = "AUDIO_005";
    error.userMessage = "Playback failed: " + reason;
    error.technicalDetails = "Playback failure: " + reason;
    error.recoverySuggestion = "Check your audio device connections and try restarting playback.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::voiceCreationFailed(const juce::String& instrument, const juce::String& reason)
{
    WhiteRoomError error;
    error.category = ErrorCategory::Audio;
    error.severity = ErrorSeverity::Error;
    AudioError audioErr { AudioError::Type::VoiceCreationFailed, reason };
    audioErr.instrumentName = instrument;
    error.error = audioErr;
    error.code = "AUDIO_006";
    error.userMessage = "Failed to create voice for '" + instrument + "': " + reason;
    error.technicalDetails = "Voice creation failed for instrument '" + instrument + "': " + reason;
    error.recoverySuggestion = "Try reducing the number of active voices or increase CPU resources.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::ffiNotInitialized()
{
    WhiteRoomError error;
    error.category = ErrorCategory::FFI;
    error.severity = ErrorSeverity::Error;
    error.error = FFIError { FFIError::Type::NotInitialized };
    error.code = "FFI_001";
    error.userMessage = "The audio engine is not initialized. Please restart the application.";
    error.technicalDetails = "FFI bridge not initialized";
    error.recoverySuggestion = "Restart the application to initialize the audio engine.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::ffiCallFailed(const juce::String& function, const juce::String& reason)
{
    WhiteRoomError error;
    error.category = ErrorCategory::FFI;
    error.severity = ErrorSeverity::Error;
    error.error = FFIError { FFIError::Type::CallFailed, function, reason };
    error.code = "FFI_002";
    error.userMessage = "Communication with the audio engine failed (function: " + function + ").";
    error.technicalDetails = "FFI call failed for function '" + function + "': " + reason;
    error.recoverySuggestion = "Try restarting the audio engine or the application.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::ffiTimeout(const juce::String& function, int timeoutMs)
{
    WhiteRoomError error;
    error.category = ErrorCategory::FFI;
    error.severity = ErrorSeverity::Warning;
    error.error = FFIError { FFIError::Type::Timeout, function, juce::String(), timeoutMs };
    error.code = "FFI_004";
    error.userMessage = "The audio engine took too long to respond (function: " + function +
                       ", timeout: " + juce::String(timeoutMs) + "ms).";
    error.technicalDetails = "FFI timeout in function '" + function + "' after " + juce::String(timeoutMs) + "ms";
    error.recoverySuggestion = "Increase the timeout in settings, or reduce CPU load.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::bridgeDisconnected()
{
    WhiteRoomError error;
    error.category = ErrorCategory::FFI;
    error.severity = ErrorSeverity::Critical;
    error.error = FFIError { FFIError::Type::BridgeDisconnected };
    error.code = "FFI_007";
    error.userMessage = "The connection to the audio engine was lost. Please restart the application.";
    error.technicalDetails = "FFI bridge disconnected";
    error.recoverySuggestion = "Restart the application to reconnect to the audio engine.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::fileNotFound(const juce::String& path)
{
    WhiteRoomError error;
    error.category = ErrorCategory::FileIO;
    error.severity = ErrorSeverity::Error;
    error.error = FileIOError { FileIOError::Type::FileNotFound, path };
    error.code = "FILE_001";
    error.userMessage = "File not found: " + path;
    error.technicalDetails = "File not found at path: " + path;
    error.recoverySuggestion = "Check that the file exists and the path is correct.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::corruptedFile(const juce::String& path, const juce::String& reason)
{
    WhiteRoomError error;
    error.category = ErrorCategory::FileIO;
    error.severity = ErrorSeverity::Error;
    error.error = FileIOError { FileIOError::Type::CorruptedFile, path, reason };
    error.code = "FILE_002";
    error.userMessage = "The file '" + path + "' is corrupted and cannot be opened.";
    error.technicalDetails = "Corrupted file at path " + path + ": " + reason;
    error.recoverySuggestion = "Try restoring from a backup if available.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::incompatibleVersion(const juce::String& path, const juce::String& version)
{
    WhiteRoomError error;
    error.category = ErrorCategory::FileIO;
    error.severity = ErrorSeverity::Error;
    error.error = FileIOError { FileIOError::Type::IncompatibleVersion, path, juce::String(), juce::String(), juce::String(), version };
    error.code = "FILE_008";
    error.userMessage = "Incompatible file version: " + version + ". This file was created with a newer version of White Room.";
    error.technicalDetails = "Incompatible file version: " + version;
    error.recoverySuggestion = "Update White Room to the latest version to open this file.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::invalidGenerator(int period, int minPeriod, int maxPeriod)
{
    WhiteRoomError error;
    error.category = ErrorCategory::Schillinger;
    error.severity = ErrorSeverity::Error;
    error.error = SchillingerError { SchillingerError::Type::InvalidGenerator, juce::String(), period };
    error.code = "SCHILL_001";
    error.userMessage = "Generator period " + juce::String(period) + " is invalid. Valid range: " +
                       juce::String(minPeriod) + " - " + juce::String(maxPeriod);
    error.technicalDetails = "Invalid generator period: " + juce::String(period) +
                            ". Valid range: " + juce::String(minPeriod) + " - " + juce::String(maxPeriod);
    error.recoverySuggestion = "Provide a valid generator period within the specified range.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::insufficientGenerators(int actual, int minimum)
{
    WhiteRoomError error;
    error.category = ErrorCategory::Schillinger;
    error.severity = ErrorSeverity::Error;
    error.error = SchillingerError { SchillingerError::Type::InsufficientGenerators, juce::String(), std::nullopt, actual, minimum };
    error.code = "SCHILL_002";
    error.userMessage = "Insufficient generators: " + juce::String(actual) + " (minimum: " + juce::String(minimum) + ")";
    error.technicalDetails = "Insufficient generators: actual=" + juce::String(actual) +
                            ", minimum=" + juce::String(minimum);
    error.recoverySuggestion = "Add more generators or reduce the complexity of your request.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::cpuOverload(double usage, double threshold)
{
    WhiteRoomError error;
    error.category = ErrorCategory::Performance;
    error.severity = ErrorSeverity::Warning;
    error.error = PerformanceError { PerformanceError::Type::CPUOverload, juce::String(), usage, threshold };
    error.code = "PERF_001";
    int usagePercent = static_cast<int>(usage * 100);
    int thresholdPercent = static_cast<int>(threshold * 100);
    error.userMessage = "High CPU usage detected: " + juce::String(usagePercent) +
                       "% (threshold: " + juce::String(thresholdPercent) + "%)";
    error.technicalDetails = "CPU overload: usage=" + juce::String(usage) +
                            ", threshold=" + juce::String(threshold);
    error.recoverySuggestion = "Reduce the number of active voices, increase buffer size, or close other applications.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

WhiteRoomError WhiteRoomError::memoryLimitExceeded(uint64_t used, uint64_t limit)
{
    WhiteRoomError error;
    error.category = ErrorCategory::Performance;
    error.severity = ErrorSeverity::Error;
    error.error = PerformanceError { PerformanceError::Type::MemoryLimitExceeded, juce::String(),
                                    std::nullopt, std::nullopt, used, limit };
    error.code = "PERF_002";
    uint64_t usedMB = used / 1024 / 1024;
    uint64_t limitMB = limit / 1024 / 1024;
    error.userMessage = "Memory limit exceeded: " + juce::String(usedMB) +
                       "MB used (limit: " + juce::String(limitMB) + "MB)";
    error.technicalDetails = "Memory limit exceeded: used=" + juce::String(used) +
                            ", limit=" + juce::String(limit);
    error.recoverySuggestion = "Close other projects or applications to free up memory.";
    error.timestamp = juce::Time::getCurrentTime();
    return error;
}

//==============================================================================
// Error Handler Implementation
//==============================================================================

void ErrorHandler::setErrorCallback(ErrorCallback callback)
{
    juce::ScopedLock lock(callbackLock);
    errorCallback = std::move(callback);
}

void ErrorHandler::logError(const WhiteRoomError& error)
{
    // Build log message
    juce::String logMessage = "[";
    logMessage += categoryToString(error.category);
    logMessage += "][";
    logMessage += severityToString(error.severity);
    logMessage += "] ";
    logMessage += error.code;
    logMessage += ": ";
    logMessage += error.userMessage;

    // Log to JUCE logger
    switch (error.severity)
    {
        case ErrorSeverity::Info:
            juce::Logger::writeToLog("INFO: " + logMessage);
            break;
        case ErrorSeverity::Warning:
            juce::Logger::writeToLog("WARNING: " + logMessage);
            break;
        case ErrorSeverity::Error:
            juce::Logger::writeToLog("ERROR: " + logMessage);
            break;
        case ErrorSeverity::Critical:
            juce::Logger::writeToLog("CRITICAL: " + logMessage);
            DBG("CRITICAL ERROR: " << logMessage);
            break;
    }

    // Call error callback if set
    {
        juce::ScopedLock lock(callbackLock);
        if (errorCallback)
        {
            errorCallback(error);
        }
    }
}

juce::Result ErrorHandler::createFailure(const WhiteRoomError& error)
{
    logError(error);
    return juce::Result::fail(error.userMessage);
}

juce::String ErrorHandler::categoryToString(ErrorCategory category)
{
    switch (category)
    {
        case ErrorCategory::Audio:       return "Audio";
        case ErrorCategory::FFI:         return "FFI";
        case ErrorCategory::FileIO:      return "FileIO";
        case ErrorCategory::Schillinger: return "Schillinger";
        case ErrorCategory::Performance: return "Performance";
        case ErrorCategory::Validation:  return "Validation";
        case ErrorCategory::Configuration: return "Configuration";
        default:                          return "Unknown";
    }
}

juce::String ErrorHandler::severityToString(ErrorSeverity severity)
{
    switch (severity)
    {
        case ErrorSeverity::Info:      return "Info";
        case ErrorSeverity::Warning:   return "Warning";
        case ErrorSeverity::Error:     return "Error";
        case ErrorSeverity::Critical:  return "Critical";
        default:                        return "Unknown";
    }
}

juce::var ErrorHandler::errorToJson(const WhiteRoomError& error)
{
    auto json = new juce::DynamicObject();

    json->setProperty("category", categoryToString(error.category));
    json->setProperty("severity", severityToString(error.severity));
    json->setProperty("code", error.code);
    json->setProperty("userMessage", error.userMessage);
    json->setProperty("technicalDetails", error.technicalDetails);
    json->setProperty("recoverySuggestion", error.recoverySuggestion);
    json->setProperty("timestamp", error.timestamp.toISO8601(true));

    // Add context array
    auto contextArray = new juce::Array<juce::var>();
    for (const auto& ctx : error.context)
        contextArray->add(ctx);
    json->setProperty("context", juce::var(contextArray));

    return juce::var(json);
}

std::optional<WhiteRoomError> ErrorHandler::jsonToError(const juce::var& json)
{
    // Basic JSON parsing - would need full implementation
    // This is a placeholder showing the structure
    WhiteRoomError error;
    error.timestamp = juce::Time::getCurrentTime();

    if (auto* obj = json.getDynamicObject())
    {
        if (obj->hasProperty("code"))
            error.code = obj->getProperty("code").toString();
        if (obj->hasProperty("userMessage"))
            error.userMessage = obj->getProperty("userMessage").toString();
        if (obj->hasProperty("technicalDetails"))
            error.technicalDetails = obj->getProperty("technicalDetails").toString();
        if (obj->hasProperty("recoverySuggestion"))
            error.recoverySuggestion = obj->getProperty("recoverySuggestion").toString();

        return error;
    }

    return std::nullopt;
}

} // namespace WhiteRoom
