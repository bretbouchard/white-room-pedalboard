/**
 * AudioEngineUndo Implementation - Real-time state reconciliation
 */

#include "undo/AudioEngineUndo.h"
#include "audio/PerformanceRenderer.h"
#include <juce_audio_basics/juce_audio_basics.h>

// ============================================================================
// InstrumentChange Implementation
// ============================================================================

bool InstrumentChange::isValid() const
{
    return !role.isEmpty() && !newInstrumentId.isEmpty();
}

// ============================================================================
// ParameterChange Implementation
// ============================================================================

bool ParameterChange::isValid() const
{
    return !parameterPath.isEmpty();
}

// ============================================================================
// PerformanceChange Implementation
// ============================================================================

bool PerformanceChange::isValid() const
{
    return !newPerformanceId.isEmpty();
}

// ============================================================================
// SongDiff Implementation
// ============================================================================

bool SongDiff::hasChanges() const
{
    return !instrumentChanges.isEmpty() ||
           !parameterChanges.isEmpty() ||
           !performanceChanges.isEmpty();
}

int SongDiff::countChanges() const
{
    return instrumentChanges.size() +
           parameterChanges.size() +
           performanceChanges.size();
}

void SongDiff::clear()
{
    instrumentChanges.clear();
    parameterChanges.clear();
    performanceChanges.clear();
}

// ============================================================================
// AudioEngineUndo Implementation
// ============================================================================

AudioEngineUndo::AudioEngineUndo()
    : sampleRate(48000.0)
    , performanceRenderer(nullptr)
    , smoothingTimeSeconds(0.05) // 50ms
    , pendingChangesFifo(16) // Max 16 pending diffs
{
}

AudioEngineUndo::~AudioEngineUndo()
{
}

void AudioEngineUndo::initialize(double newSampleRate)
{
    sampleRate = newSampleRate;
}

void AudioEngineUndo::reset()
{
    cancelPendingChanges();
}

bool AudioEngineUndo::applyDiff(
    const SongDiff& diff,
    PerformanceRenderer& renderer
)
{
    if (!diff.hasChanges())
    {
        return false;
    }

    // Store reference to performance renderer
    performanceRenderer = &renderer;

    // Schedule diff for application
    scheduleChange(diff);

    return true;
}

void AudioEngineUndo::processAtBufferBoundary(
    juce::AudioBuffer<float>& buffer,
    juce::int64 currentSamplePosition
)
{
    // Check if we have pending changes
    if (!hasPendingChanges())
    {
        return;
    }

    // Check if at safe boundary (bar boundary or buffer start)
    if (!isAtSafeBoundary(currentSamplePosition))
    {
        return;
    }

    // Apply scheduled changes
    applyScheduledChanges();
}

bool AudioEngineUndo::hasPendingChanges() const
{
    return getPendingChangeCount() > 0;
}

int AudioEngineUndo::getPendingChangeCount() const
{
    return pendingChangesFifo.getNumReady();
}

void AudioEngineUndo::cancelPendingChanges()
{
    // Reset FIFO
    pendingChangesFifo.reset();
    pendingChanges.clear();
}

SongDiff AudioEngineUndo::computeDiff(
    const SongState& before,
    const SongState& after
)
{
    SongDiff diff;

    // Check for performance changes
    if (before.activePerformanceId != after.activePerformanceId ||
        before.density != after.density ||
        before.grooveProfileId != after.grooveProfileId ||
        before.consoleXProfileId != after.consoleXProfileId)
    {
        PerformanceChange perfChange;
        perfChange.oldPerformanceId = before.activePerformanceId;
        perfChange.newPerformanceId = after.activePerformanceId;
        perfChange.oldDensity = before.density;
        perfChange.newDensity = after.density;
        perfChange.oldGrooveProfileId = before.grooveProfileId;
        perfChange.newGrooveProfileId = after.grooveProfileId;
        perfChange.oldConsoleXProfileId = before.consoleXProfileId;
        perfChange.newConsoleXProfileId = after.consoleXProfileId;

        diff.performanceChanges.add(perfChange);
    }

    // Check for instrument changes (simplified)
    // Full implementation would compare instrument arrays
    if (before.instrumentIds.size() != after.instrumentIds.size())
    {
        // Instrument count changed
        InstrumentChange instChange;
        instChange.role = "default";
        instChange.oldInstrumentId = before.instrumentIds.isEmpty() ? "none" : before.instrumentIds[0];
        instChange.newInstrumentId = after.instrumentIds.isEmpty() ? "none" : after.instrumentIds[0];

        diff.instrumentChanges.add(instChange);
    }

    // Check for parameter changes (mix gains/pans)
    if (before.mixGains.size() != after.mixGains.size())
    {
        ParameterChange paramChange;
        paramChange.parameterPath = "mix.gains";
        paramChange.oldValue = before.mixGains.isEmpty() ? 0.0 : before.mixGains[0];
        paramChange.newValue = after.mixGains.isEmpty() ? 0.0 : after.mixGains[0];

        diff.parameterChanges.add(paramChange);
    }

    return diff;
}

bool AudioEngineUndo::applyInstrumentChange(const InstrumentChange& change)
{
    if (!change.isValid())
    {
        return false;
    }

    // Apply instrument change to audio engine
    // This would interact with the instrument manager
    // For now, we'll just log the change

    return true;
}

bool AudioEngineUndo::applyParameterChange(const ParameterChange& change)
{
    if (!change.isValid())
    {
        return false;
    }

    // Calculate smooth transition
    int transitionSamples = static_cast<int>(sampleRate * change.smoothTime);
    auto smoothedValues = smoothTransition(
        change.oldValue,
        change.newValue,
        transitionSamples
    );

    // Apply smoothed parameter values
    // This would interact with the audio engine's parameter system
    // For now, we'll just prepare the smoothed values

    return true;
}

bool AudioEngineUndo::applyPerformanceChange(const PerformanceChange& change)
{
    if (!change.isValid() || !performanceRenderer)
    {
        return false;
    }

    // Apply performance change through performance renderer
    // This would schedule the performance switch at next bar boundary
    // For now, we'll just note the change

    return true;
}

juce::Array<double> AudioEngineUndo::smoothTransition(
    double oldValue,
    double newValue,
    int transitionSamples)
{
    juce::Array<double> values;

    if (transitionSamples <= 0)
    {
        values.add(newValue);
        return values;
    }

    // Linear interpolation
    for (int i = 0; i < transitionSamples; ++i)
    {
        double t = static_cast<double>(i) / static_cast<double>(transitionSamples);
        double value = oldValue + (newValue - oldValue) * t;
        values.add(value);
    }

    return values;
}

void AudioEngineUndo::scheduleChange(const SongDiff& diff)
{
    // Add to FIFO (lock-free)
    int start1, size1, start2, size2;
    pendingChangesFifo.prepareToWrite(1, start1, size1, start2, size2);

    if (size1 > 0)
    {
        pendingChanges[start1] = diff;
        pendingChangesFifo.finishedWrite(1);
    }
}

void AudioEngineUndo::applyScheduledChanges()
{
    // Drain FIFO
    int start1, size1, start2, size2;
    pendingChangesFifo.prepareToRead(pendingChangesFifo.getNumReady(), start1, size1, start2, size2);

    int totalToRead = size1 + size2;

    for (int i = 0; i < totalToRead; ++i)
    {
        SongDiff diff;
        if (i < size1)
        {
            diff = pendingChanges[start1 + i];
        }
        else
        {
            diff = pendingChanges[start2 + (i - size1)];
        }

        // Apply all changes in diff
        for (const auto& instChange : diff.instrumentChanges)
        {
            applyInstrumentChange(instChange);
        }

        for (const auto& paramChange : diff.parameterChanges)
        {
            applyParameterChange(paramChange);
        }

        for (const auto& perfChange : diff.performanceChanges)
        {
            applyPerformanceChange(perfChange);
        }
    }

    pendingChangesFifo.finishedRead(totalToRead);
}

bool AudioEngineUndo::isAtSafeBoundary(juce::int64 currentSamplePosition) const
{
    // Simple check: safe if at buffer boundary (every 512 samples)
    // Full implementation would check bar boundaries
    return (currentSamplePosition % 512) == 0;
}
