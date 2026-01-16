/*
  ==============================================================================

    ErrorHandling.cpp
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#include "ErrorHandling.h"
#include <juce_core/juce_core.h>

namespace Schillinger
{
    //==============================================================================
    // Static member definitions
    ErrorHandler::GlobalErrorHandler ErrorHandler::globalHandler;
    juce::CriticalSection ErrorHandler::handlerLock;

    //==============================================================================
    juce::String ErrorHandler::ErrorInfo::toString() const
    {
        juce::String result;
        result << "[" << ErrorHandler::categoryToString(category) << "] ";
        result << "[" << ErrorHandler::severityToString(severity) << "] ";
        result << code << ": " << message;
        
        if (details.isNotEmpty())
            result << " - " << details;
        
        if (!suggestions.isEmpty())
        {
            result << " Suggestions: ";
            result << suggestions.joinIntoString("; ");
        }
        
        return result;
    }

    juce::var ErrorHandler::ErrorInfo::toJson() const
    {
        auto json = new juce::DynamicObject();
        
        json->setProperty("category", ErrorHandler::categoryToString(category));
        json->setProperty("severity", ErrorHandler::severityToString(severity));
        json->setProperty("code", code);
        json->setProperty("message", message);
        json->setProperty("details", details);
        json->setProperty("timestamp", timestamp.toISO8601(true));
        
        auto suggestionsArray = new juce::Array<juce::var>();
        for (const auto& suggestion : suggestions)
            suggestionsArray->add(suggestion);
        json->setProperty("suggestions", juce::var(suggestionsArray));
        
        return juce::var(json);
    }

    //==============================================================================
    void ErrorHandler::setGlobalHandler(GlobalErrorHandler handler)
    {
        juce::ScopedLock lock(handlerLock);
        globalHandler = std::move(handler);
    }

    void ErrorHandler::logError(Category category, 
                               Severity severity,
                               const juce::String& code,
                               const juce::String& message,
                               const juce::String& details,
                               const juce::StringArray& suggestions)
    {
        ErrorInfo info;
        info.category = category;
        info.severity = severity;
        info.code = code;
        info.message = message;
        info.details = details;
        info.suggestions = suggestions;
        info.timestamp = juce::Time::getCurrentTime();
        
        // Log to JUCE logger
        juce::String logMessage = info.toString();
        
        switch (severity)
        {
            case Severity::Info:
                juce::Logger::writeToLog("INFO: " + logMessage);
                break;
            case Severity::Warning:
                juce::Logger::writeToLog("WARNING: " + logMessage);
                break;
            case Severity::Error:
                juce::Logger::writeToLog("ERROR: " + logMessage);
                break;
            case Severity::Critical:
                juce::Logger::writeToLog("CRITICAL: " + logMessage);
                break;
        }
        
        // Call global handler if set
        {
            juce::ScopedLock lock(handlerLock);
            if (globalHandler)
            {
                globalHandler(code, message);
            }
        }
        
        // For critical errors, also output to debug console
        if (severity == Severity::Critical)
        {
            DBG("CRITICAL ERROR: " << logMessage);
        }
    }

    juce::Result ErrorHandler::createFailure(Category category,
                                            const juce::String& code,
                                            const juce::String& message,
                                            const juce::String& details,
                                            const juce::StringArray& suggestions)
    {
        // Log the error
        logError(category, Severity::Error, code, message, details, suggestions);
        
        // Create failure result with enhanced message
        juce::String failureMessage = message;
        if (details.isNotEmpty())
            failureMessage += " (" + details + ")";
        
        return juce::Result::fail(failureMessage);
    }

    juce::String ErrorHandler::categoryToString(Category category)
    {
        switch (category)
        {
            case Category::Validation:      return "Validation";
            case Category::Network:         return "Network";
            case Category::Authentication:  return "Authentication";
            case Category::Processing:      return "Processing";
            case Category::Internal:        return "Internal";
            default:                        return "Unknown";
        }
    }

    juce::String ErrorHandler::severityToString(Severity severity)
    {
        switch (severity)
        {
            case Severity::Info:        return "Info";
            case Severity::Warning:     return "Warning";
            case Severity::Error:       return "Error";
            case Severity::Critical:    return "Critical";
            default:                    return "Unknown";
        }
    }

} // namespace Schillinger