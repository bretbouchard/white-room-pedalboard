/*
  ==============================================================================

    WhiteRoomErrorHandler.h
    Created: 15 Jan 2026
    Author:  White Room Development Team

    Comprehensive error handling system for White Room audio plugin

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <functional>
#include <variant>
#include <optional>

namespace WhiteRoom
{

//==============================================================================
// Error Categories
//==============================================================================

enum class ErrorCategory
{
    Audio,           // Audio engine errors (dropout, xrun, crash)
    FFI,             // FFI bridge errors (communication, serialization)
    FileIO,          // File I/O errors (corrupted, missing)
    Schillinger,     // Schillinger system errors (generators, constraints)
    Performance,     // Performance errors (CPU, memory)
    Validation,      // Validation errors
    Configuration    // Configuration errors
};

//==============================================================================
// Error Severity
//==============================================================================

enum class ErrorSeverity
{
    Info,        // Informational - operation can continue
    Warning,     // Warning - operation completed but with issues
    Error,       // Error - operation failed but system is stable
    Critical     // Critical - operation failed and system may be unstable
};

//==============================================================================
// White Room Error Types
//==============================================================================

// Audio Errors
struct AudioError
{
    enum class Type {
        EngineNotReady,
        EngineCrashed,
        DropoutDetected,
        XrunDetected,
        PlaybackFailed,
        VoiceCreationFailed,
        BufferSizeInvalid,
        SampleRateUnsupported,
        DeviceNotFound
    };

    Type type;
    juce::String reason;
    std::optional<int> count;
    std::optional<double> duration;

    // Context data
    std::optional<int> bufferSize;
    std::optional<double> sampleRate;
    std::optional<juce::String> deviceName;
    std::optional<juce::String> instrumentName;
};

// FFI Errors
struct FFIError
{
    enum class Type {
        NotInitialized,
        CallFailed,
        VersionMismatch,
        Timeout,
        SerializationFailed,
        DeserializationFailed,
        BridgeDisconnected,
        CommunicationError
    };

    Type type;
    juce::String functionName;
    juce::String reason;
    std::optional<int> timeoutMs;
    std::optional<juce::String> expectedVersion;
    std::optional<juce::String> actualVersion;
};

// File I/O Errors
struct FileIOError
{
    enum class Type {
        FileNotFound,
        CorruptedFile,
        InvalidFormat,
        PermissionDenied,
        DiskFull,
        ReadFailed,
        WriteFailed,
        IncompatibleVersion
    };

    Type type;
    juce::String filePath;
    juce::String reason;
    std::optional<juce::String> expectedFormat;
    std::optional<juce::String> actualFormat;
    std::optional<juce::String> fileVersion;
    std::optional<juce::String> supportedVersion;
};

// Schillinger System Errors
struct SchillingerError
{
    enum class Type {
        InvalidGenerator,
        InsufficientGenerators,
        InvalidPitchCycle,
        InvalidIntervalSeed,
        HarmonyViolation,
        ConstraintSatisfactionFailed,
        SystemExecutionFailed,
        DerivationRecordFailed
    };

    Type type;
    juce::String reason;
    std::optional<int> period;
    std::optional<int> actualGenerators;
    std::optional<int> minimumGenerators;
    std::optional<juce::String> systemName;
};

// Performance Errors
struct PerformanceError
{
    enum class Type {
        CPUOverload,
        MemoryLimitExceeded,
        SlowRealization,
        ComputeLimitExceeded
    };

    Type type;
    juce::String reason;
    std::optional<double> cpuUsage;
    std::optional<double> cpuThreshold;
    std::optional<uint64_t> memoryUsed;
    std::optional<uint64_t> memoryLimit;
    std::optional<double> realizationDuration;
    std::optional<double> durationThreshold;
};

// Validation Errors
struct ValidationError
{
    enum class Type {
        InvalidSchema,
        ValidationFailed,
        InvalidVoiceCount,
        InvalidRolePool,
        InvalidBalanceRules
    };

    Type type;
    juce::String fieldName;
    juce::String reason;
    std::optional<int> voiceCount;
    std::optional<int> minVoices;
    std::optional<int> maxVoices;
};

// Configuration Errors
struct ConfigurationError
{
    enum class Type {
        InvalidConfig,
        MissingConfig,
        ConfigParseError
    };

    Type type;
    juce::String section;
    juce::String reason;
};

//==============================================================================
// White Room Error (Variant)
//==============================================================================

using WhiteRoomErrorVariant = std::variant<
    AudioError,
    FFIError,
    FileIOError,
    SchillingerError,
    PerformanceError,
    ValidationError,
    ConfigurationError
>;

struct WhiteRoomError
{
    ErrorCategory category;
    ErrorSeverity severity;
    WhiteRoomErrorVariant error;
    juce::String code;
    juce::String userMessage;
    juce::String technicalDetails;
    juce::String recoverySuggestion;
    juce::StringArray context;
    juce::Time timestamp;

    // Helper factory methods
    static WhiteRoomError audioEngineNotReady();
    static WhiteRoomError audioEngineCrashed(const juce::String& reason);
    static WhiteRoomError audioDropout(int count, double duration);
    static WhiteRoomError audioXrun(int count);
    static WhiteRoomError playbackFailed(const juce::String& reason);
    static WhiteRoomError voiceCreationFailed(const juce::String& instrument, const juce::String& reason);

    static WhiteRoomError ffiNotInitialized();
    static WhiteRoomError ffiCallFailed(const juce::String& function, const juce::String& reason);
    static WhiteRoomError ffiTimeout(const juce::String& function, int timeoutMs);
    static WhiteRoomError bridgeDisconnected();

    static WhiteRoomError fileNotFound(const juce::String& path);
    static WhiteRoomError corruptedFile(const juce::String& path, const juce::String& reason);
    static WhiteRoomError incompatibleVersion(const juce::String& path, const juce::String& version);

    static WhiteRoomError invalidGenerator(int period, int minPeriod, int maxPeriod);
    static WhiteRoomError insufficientGenerators(int actual, int minimum);

    static WhiteRoomError cpuOverload(double usage, double threshold);
    static WhiteRoomError memoryLimitExceeded(uint64_t used, uint64_t limit);
};

//==============================================================================
// Error Handler
//==============================================================================

/**
 Centralized error handling for White Room audio plugin

 Features:
 - Structured error logging
 - User-friendly error messages
 - Recovery suggestions
 - Context capture
 - Crash reporting integration
 */
class ErrorHandler
{
public:
    //==============================================================================
    // Error callback function type
    using ErrorCallback = std::function<void(const WhiteRoomError&)>;

    //==============================================================================
    /** Set global error handler callback */
    static void setErrorCallback(ErrorCallback callback);

    /** Log an error */
    static void logError(const WhiteRoomError& error);

    /** Create and log a Result::fail */
    static juce::Result createFailure(const WhiteRoomError& error);

    /** Convert error category to string */
    static juce::String categoryToString(ErrorCategory category);

    /** Convert error severity to string */
    static juce::String severityToString(ErrorSeverity severity);

    /** Convert error to JSON for FFI serialization */
    static juce::var errorToJson(const WhiteRoomError& error);

    /** Convert JSON to error */
    static std::optional<WhiteRoomError> jsonToError(const juce::var& json);

private:
    //==============================================================================
    static ErrorCallback errorCallback;
    static juce::CriticalSection callbackLock;

    //==============================================================================
    // Helper methods for error message generation
    static juce::String generateUserMessage(const WhiteRoomError& error);
    static juce::String generateTechnicalDetails(const WhiteRoomError& error);
    static juce::String generateRecoverySuggestion(const WhiteRoomError& error);
    static juce::StringArray generateContext(const WhiteRoomError& error);

    //==============================================================================
    // Error visitors
    struct ErrorVisitor
    {
        ErrorCategory category;
        ErrorSeverity severity;

        auto operator()(const AudioError& e) -> juce::String;
        auto operator()(const FFIError& e) -> juce::String;
        auto operator()(const FileIOError& e) -> juce::String;
        auto operator()(const SchillingerError& e) -> juce::String;
        auto operator()(const PerformanceError& e) -> juce::String;
        auto operator()(const ValidationError& e) -> juce::String;
        auto operator()(const ConfigurationError& e) -> juce::String;
    };
};

//==============================================================================
// Result Type with Error Information
//==============================================================================

/**
 Result type that includes detailed error information

 Unlike juce::Result which only has a message, this includes:
 - Error code
 - User message
 - Technical details
 - Recovery suggestions
 - Context
 */
template<typename T>
class ResultWithError
{
public:
    //==============================================================================
    /** Create a successful result */
    static ResultWithError success(T value)
    {
        return ResultWithError(std::move(value));
    }

    /** Create a failure result */
    static ResultWithError failure(WhiteRoomError error)
    {
        return ResultWithError(std::move(error));
    }

    //==============================================================================
    /** Check if result is successful */
    bool wasOk() const { return success.has_value(); }

    /** Get the value (only valid if wasOk() returns true) */
    const T& getValue() const { return success.value(); }

    /** Get the error (only valid if wasOk() returns false) */
    const WhiteRoomError& getError() const { return error.value(); }

    //==============================================================================
    /** Convert to juce::Result (loses error details) */
    juce::Result toJUCEResult() const
    {
        if (wasOk())
            return juce::Result::ok();
        return ErrorHandler::createFailure(getError());
    }

private:
    //==============================================================================
    std::optional<T> success;
    std::optional<WhiteRoomError> error;

    ResultWithError(T value) : success(std::move(value)) {}
    ResultWithError(WhiteRoomError err) : error(std::move(err)) {}
};

//==============================================================================
// Convenience Macros
//==============================================================================

#define WHITEROOM_AUDIO_ERROR(code, message, details) \
    WhiteRoomError { \
        ErrorCategory::Audio, \
        ErrorSeverity::Error, \
        AudioError {}, \
        code, \
        message, \
        details, \
        {}, \
        {}, \
        juce::Time::getCurrentTime() \
    }

#define WHITEROOM_FFI_ERROR(code, message, details) \
    WhiteRoomError { \
        ErrorCategory::FFI, \
        ErrorSeverity::Error, \
        FFIError {}, \
        code, \
        message, \
        details, \
        {}, \
        {}, \
        juce::Time::getCurrentTime() \
    }

#define WHITEROOM_FILE_ERROR(code, message, details) \
    WhiteRoomError { \
        ErrorCategory::FileIO, \
        ErrorSeverity::Error, \
        FileIOError {}, \
        code, \
        message, \
        details, \
        {}, \
        {}, \
        juce::Time::getCurrentTime() \
    }

} // namespace WhiteRoom
