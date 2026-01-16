/*
  ==============================================================================

    ErrorHandling.h
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <functional>

namespace Schillinger
{
    /**
        Centralized error handling for the Schillinger SDK.
        
        Provides consistent error reporting and logging using JUCE's
        logging facilities and Result types.
    */
    class ErrorHandler
    {
    public:
        //==============================================================================
        /** Error categories */
        enum class Category
        {
            Validation,
            Network,
            Authentication,
            Processing,
            Internal
        };
        
        /** Error severity levels */
        enum class Severity
        {
            Info,
            Warning,
            Error,
            Critical
        };
        
        /** Error information */
        struct ErrorInfo
        {
            Category category;
            Severity severity;
            juce::String code;
            juce::String message;
            juce::String details;
            juce::StringArray suggestions;
            juce::Time timestamp;
            
            juce::String toString() const;
            juce::var toJson() const;
        };
        
        /** Global error handler function type */
        using GlobalErrorHandler = std::function<void(const juce::String&, const juce::String&)>;

        //==============================================================================
        /** Set global error handler */
        static void setGlobalHandler(GlobalErrorHandler handler);
        
        /** Log an error */
        static void logError(Category category, 
                           Severity severity,
                           const juce::String& code,
                           const juce::String& message,
                           const juce::String& details = {},
                           const juce::StringArray& suggestions = {});
        
        /** Create a Result::fail with error logging */
        static juce::Result createFailure(Category category,
                                         const juce::String& code,
                                         const juce::String& message,
                                         const juce::String& details = {},
                                         const juce::StringArray& suggestions = {});
        
        /** Convert category to string */
        static juce::String categoryToString(Category category);
        
        /** Convert severity to string */
        static juce::String severityToString(Severity severity);

    private:
        //==============================================================================
        static GlobalErrorHandler globalHandler;
        static juce::CriticalSection handlerLock;
    };

    //==============================================================================
    /** Convenience macros for common error scenarios */
    #define SCHILLINGER_VALIDATION_ERROR(message, details) \
        ErrorHandler::createFailure(ErrorHandler::Category::Validation, "VALIDATION_ERROR", message, details)
    
    #define SCHILLINGER_NETWORK_ERROR(message, details) \
        ErrorHandler::createFailure(ErrorHandler::Category::Network, "NETWORK_ERROR", message, details)
    
    #define SCHILLINGER_AUTH_ERROR(message, details) \
        ErrorHandler::createFailure(ErrorHandler::Category::Authentication, "AUTH_ERROR", message, details)
    
    #define SCHILLINGER_PROCESSING_ERROR(message, details) \
        ErrorHandler::createFailure(ErrorHandler::Category::Processing, "PROCESSING_ERROR", message, details)

} // namespace Schillinger