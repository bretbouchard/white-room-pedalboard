/**
 * PerformanceRenderer Implementation
 *
 * See header file for detailed documentation.
 */

#include "audio/PerformanceRenderer.h"

// ============================================================================
// PerformanceState Implementation
// ============================================================================

PerformanceState::PerformanceState()
    : activePerformanceId(nullptr),
      currentDensity(0.5),
      currentGrooveProfileId(nullptr),
      currentConsoleXProfileId(nullptr),
      currentBar(0)
{
    // Initialize atomic pointers with null strings
    activePerformanceId.store(nullptr);
    currentGrooveProfileId.store(nullptr);
    currentConsoleXProfileId.store(nullptr);
}

PerformanceState::~PerformanceState()
{
    // Clean up atomic strings
    delete activePerformanceId.load();
    delete currentGrooveProfileId.load();
    delete currentConsoleXProfileId.load();
}

// ============================================================================
// PerformanceRenderer Implementation
// ============================================================================

PerformanceRenderer::PerformanceRenderer()
    : sampleRate(44100.0),
      currentState(std::make_unique<PerformanceState>()),
      pendingSwitch(nullptr)
{
}

PerformanceRenderer::~PerformanceRenderer()
{
    // Clean up pending switch
    auto* pending = pendingSwitch.load();
    if (pending != nullptr)
    {
        delete pending;
        pendingSwitch.store(nullptr);
    }
}

void PerformanceRenderer::initialize(double newSampleRate)
{
    sampleRate = newSampleRate;
    reset();
}

void PerformanceRenderer::reset()
{
    // Reset state
    currentState->currentDensity.store(0.5);
    currentState->currentBar.store(0);

    // Clear pending switch
    auto* pending = pendingSwitch.load();
    if (pending != nullptr)
    {
        delete pending;
        pendingSwitch.store(nullptr);
    }
}

void PerformanceRenderer::processBlock(juce::AudioBuffer<float>& buffer,
                                      juce::int64 currentSamplePosition,
                                      double tempo,
                                      int timeSignatureNumerator,
                                      int timeSignatureDenominator)
{
    // 1. Update current bar
    const int currentBar = calculateCurrentBar(currentSamplePosition,
                                               tempo,
                                               timeSignatureNumerator,
                                               timeSignatureDenominator);
    currentState->currentBar.store(currentBar);

    // 2. Check if we have a pending switch
    auto* pending = pendingSwitch.load();
    if (pending == nullptr || !pending->isValid)
    {
        return; // No pending switch
    }

    // 3. Check if we're at the target bar
    if (pending->targetBar == currentBar)
    {
        // Execute the switch
        executeScheduledSwitch(currentBar);
    }
}

bool PerformanceRenderer::scheduleSwitchAtNextBar(const juce::String& performanceId,
                                                 juce::int64 currentSamplePosition,
                                                 double tempo,
                                                 int timeSignatureNumerator,
                                                 int timeSignatureDenominator)
{
    // 1. Calculate next bar boundary
    const juce::int64 nextBarPosition = calculateNextBarBoundary(currentSamplePosition,
                                                                tempo,
                                                                timeSignatureNumerator,
                                                                timeSignatureDenominator);

    // 2. Calculate target bar number
    const int currentBar = calculateCurrentBar(currentSamplePosition,
                                              tempo,
                                              timeSignatureNumerator,
                                              timeSignatureDenominator);
    const int targetBar = currentBar + 1;

    // 3. Create scheduled switch
    auto* newSwitch = new ScheduledSwitch();
    newSwitch->performanceId = performanceId;
    newSwitch->targetBar = targetBar;
    newSwitch->scheduledAt = juce::Time::currentTimeMillis();
    newSwitch->isValid = true;

    // 4. Atomically update pending switch
    auto* oldSwitch = pendingSwitch.exchange(newSwitch);

    // 5. Clean up old switch
    if (oldSwitch != nullptr)
    {
        delete oldSwitch;
    }

    return true;
}

void PerformanceRenderer::cancelPendingSwitch()
{
    // Clear pending switch atomically
    auto* oldSwitch = pendingSwitch.exchange(nullptr);

    if (oldSwitch != nullptr)
    {
        delete oldSwitch;
    }
}

juce::String PerformanceRenderer::getActivePerformanceId() const
{
    auto* id = currentState->activePerformanceId.load();
    return id != nullptr ? *id : juce::String();
}

ScheduledSwitch PerformanceRenderer::getPendingSwitch() const
{
    auto* pending = pendingSwitch.load();
    if (pending != nullptr && pending->isValid)
    {
        return *pending;
    }
    return ScheduledSwitch(); // Invalid switch
}

bool PerformanceRenderer::hasPendingSwitch() const
{
    auto* pending = pendingSwitch.load();
    return pending != nullptr && pending->isValid;
}

void PerformanceRenderer::applyPerformanceConfig(const PerformanceConfig& config)
{
    // Apply performance configuration atomically

    // Update density
    currentState->currentDensity.store(config.density);

    // Update groove profile ID
    auto* oldGroove = currentState->currentGrooveProfileId.exchange(
        new juce::String(config.grooveProfileId)
    );
    delete oldGroove;

    // Update ConsoleX profile ID
    auto* oldConsoleX = currentState->currentConsoleXProfileId.exchange(
        new juce::String(config.consoleXProfileId)
    );
    delete oldConsoleX;

    // Update active performance ID
    auto* oldId = currentState->activePerformanceId.exchange(
        new juce::String(config.id)
    );
    delete oldId;

    // In a real implementation, this would also:
    // - Update instrumentation in audio graph
    // - Apply new mix targets (gain/pan)
    // - Apply new groove template
    // - Update ConsoleX routing
    // - All updates must be atomic (no intermediate states)
}

juce::int64 PerformanceRenderer::calculateNextBarBoundary(juce::int64 currentSamplePosition,
                                                         double tempo,
                                                         int timeSignatureNumerator,
                                                         int timeSignatureDenominator) const
{
    const double samplesPerBar = this->samplesPerBar(tempo, timeSignatureNumerator);
    const int currentBar = static_cast<int>(currentSamplePosition / samplesPerBar);
    return static_cast<juce::int64>((currentBar + 1) * samplesPerBar);
}

int PerformanceRenderer::calculateCurrentBar(juce::int64 currentSamplePosition,
                                           double tempo,
                                           int timeSignatureNumerator,
                                           int timeSignatureDenominator) const
{
    const double samplesPerBar = this->samplesPerBar(tempo, timeSignatureNumerator);
    return static_cast<int>(currentSamplePosition / samplesPerBar);
}

bool PerformanceRenderer::isAtBarBoundary(juce::int64 currentSamplePosition,
                                         double tempo,
                                         int timeSignatureNumerator,
                                         int timeSignatureDenominator) const
{
    const double samplesPerBar = this->samplesPerBar(tempo, timeSignatureNumerator);
    const double currentBarD = currentSamplePosition / samplesPerBar;
    const int currentBar = static_cast<int>(currentBarD);
    const juce::int64 barStart = static_cast<juce::int64>(currentBar * samplesPerBar);

    // Check if within 1 sample of bar boundary
    return std::abs(static_cast<double>(currentSamplePosition) - static_cast<double>(barStart)) < 1.0;
}

bool PerformanceRenderer::executeScheduledSwitch(int targetBar)
{
    // Get pending switch
    auto* pending = pendingSwitch.load();
    if (pending == nullptr || !pending->isValid)
    {
        return false; // No valid pending switch
    }

    // Verify target bar matches
    if (pending->targetBar != targetBar)
    {
        return false; // Not at target bar yet
    }

    // Get performance configuration
    if (!performanceConfigs.contains(pending->performanceId))
    {
        // Performance config not found - this shouldn't happen in production
        jassertfalse;
        return false;
    }

    const PerformanceConfig& config = performanceConfigs.getReference(pending->performanceId);

    // Apply configuration atomically
    applyPerformanceConfig(config);

    // Clear pending switch
    auto* oldSwitch = pendingSwitch.exchange(nullptr);
    delete oldSwitch;

    return true;
}

double PerformanceRenderer::samplesPerBeat(double tempo) const
{
    // 60 seconds * sampleRate / tempo
    return (60.0 * sampleRate) / tempo;
}

double PerformanceRenderer::samplesPerBar(double tempo, int timeSignatureNumerator) const
{
    return samplesPerBeat(tempo) * timeSignatureNumerator;
}
