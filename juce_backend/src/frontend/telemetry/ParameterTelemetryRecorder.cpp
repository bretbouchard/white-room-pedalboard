/*
  ==============================================================================

    ParameterTelemetryRecorder.cpp
    Created: January 13, 2026
    Author: Claude Code (white_room-179)

    Implementation of parameter change recording for UI telemetry

  ==============================================================================
*/

#include "ParameterTelemetryRecorder.h"

//==============================================================================
// EMPTY Callback Blocker
//==============================================================================

/**
 * The EMPTY callback blocker prevents parameter change callbacks from firing
 * when the new value is effectively the same as the previous value.
 *
 * This is important for:
 * 1. Reducing unnecessary telemetry traffic
 * 2. Preventing false-positive "adjustment" events when nothing changed
 * 3. Avoiding callback loops in UI components that round-trip values
 *
 * The epsilon threshold handles floating-point comparison issues.
 */
static constexpr float EMPTY_CALLBACK_EPSILON = 0.00001f;

//==============================================================================
// ParameterTelemetryRecorder Implementation
//==============================================================================

void ParameterTelemetryRecorder::parameterChanged(const juce::String& parameterID, float newValue)
{
    // Get previous value (if we have tracking for this parameter)
    float previousValue = getPreviousValue(parameterID);

    // EMPTY CALLBACK BLOCKER:
    // Skip if the value hasn't meaningfully changed (within epsilon)
    // This prevents callback spam and false telemetry events
    float delta = std::abs(newValue - previousValue);
    if (delta < EMPTY_CALLBACK_EPSILON)
    {
        // Value hasn't changed - skip this callback
        DBG("ParameterTelemetryRecorder: Empty callback blocked for " + parameterID +
            " (delta: " + juce::String(delta, 8) + " < epsilon: " + juce::String(EMPTY_CALLBACK_EPSILON, 8) + ")");
        return;
    }

    // Calculate duration of adjustment
    int durationMs = calculateDurationMs(parameterID);

    // Check if this is an undo operation
    // TODO: Integrate with undo manager when available
    bool isUndo = false;

    // Generate event ID (UUID)
    juce::String eventID = juce::Uuid().toString();

    // Create event
    ParameterChangeEvent event(
        eventID,
        parameterID,
        previousValue,
        newValue,
        isUndo,
        durationMs
    );

    // Queue event (non-blocking, drops if full)
    bool queued = queue.push(event);

    if (!queued)
    {
        // Queue full - drop event and log
        // In production, this should be rate-limited
        DBG("ParameterTelemetryRecorder: Queue full, dropped event for " + parameterID);
    }
    else
    {
        // Update previous value tracking
        updatePreviousValue(parameterID, newValue);
    }
}
