#include "audio/ChannelCPUMonitor.h"
#include <algorithm>

namespace SchillingerEcosystem::Audio {

//==============================================================================
// ChannelMetrics Implementation
//==============================================================================

juce::String ChannelCPUMonitor::ChannelMetrics::toString() const {
    return juce::String::formatted(
        "Channel %d:\n"
        "  Total ticks: %llu\n"
        "  Samples: %llu\n"
        "  Avg time: %.3f µs/sample\n"
        "  CPU: %.2f%%\n"
        "  Over budget: %s\n"
        "  Exceed count: %d",
        channelId,
        totalTicks,
        sampleCount,
        avgMicroseconds,
        cpuPercent,
        overBudget ? "YES" : "no",
        budgetExceedCount
    );
}

//==============================================================================
// Constructor/Destructor
//==============================================================================

ChannelCPUMonitor::ChannelCPUMonitor() {
    // Default budget: 5 µs per sample (~15% @ 48kHz stereo)
    defaultBudget_ = ChannelBudget(0);
}

ChannelCPUMonitor::~ChannelCPUMonitor() {
    clearListeners();
}

//==============================================================================
// Configuration
//==============================================================================

void ChannelCPUMonitor::setChannelBudget(int channelId, const ChannelBudget& budget) {
    const juce::ScopedLock lock(metricsLock_);
    budgets_[channelId] = budget;
}

void ChannelCPUMonitor::setDefaultBudget(const ChannelBudget& budget) {
    const juce::ScopedLock lock(metricsLock_);
    defaultBudget_ = budget;
}

//==============================================================================
// CPU Reporting (called from audio thread)
//==============================================================================

void ChannelCPUMonitor::beginChannelProcessing(int channelId) {
    // Fast path: no lock, just atomic operation
    channels_[channelId].startTicks = getTicks();
}

void ChannelCPUMonitor::endChannelProcessing(int channelId, int numSamples) {
    uint64_t endTicks = getTicks();

    // Get channel state
    auto& state = channels_[channelId];

    // Calculate elapsed ticks
    uint64_t elapsedTicks = endTicks - state.startTicks;

    // Update state
    state.totalTicks += elapsedTicks;
    state.totalSamples += numSamples;

    // Check budget (debug builds only)
#ifndef JUCE_RELEASE
    double microseconds = ticksToMicroseconds(elapsedTicks);
    checkBudget(channelId, state, microseconds);
#endif
}

ChannelCPUMonitor::ChannelMetrics ChannelCPUMonitor::getChannelMetrics(int channelId) const {
    const juce::ScopedLock lock(metricsLock_);

    ChannelMetrics metrics;
    metrics.channelId = channelId;

    // Find channel state
    auto it = channels_.find(channelId);
    if (it != channels_.end()) {
        const auto& state = it->second;

        metrics.totalTicks = state.totalTicks;
        metrics.sampleCount = state.totalSamples;
        metrics.avgMicroseconds = state.totalSamples > 0
            ? ticksToMicroseconds(state.totalTicks) / state.totalSamples
            : 0.0;
        metrics.cpuPercent = state.totalSamples > 0
            ? calculateCpuPercent(metrics.avgMicroseconds, state.totalSamples, 48000.0)
            : 0.0;
        metrics.budgetExceedCount = state.exceedCount;

        // Check if currently over budget
        auto budgetIt = budgets_.find(channelId);
        const auto& budget = (budgetIt != budgets_.end()) ? budgetIt->second : defaultBudget_;

        metrics.overBudget = (metrics.avgMicroseconds > budget.maxMicrosecondsPerSample);
    }

    return metrics;
}

std::vector<ChannelCPUMonitor::ChannelMetrics> ChannelCPUMonitor::getAllMetrics() const {
    const juce::ScopedLock lock(metricsLock_);

    std::vector<ChannelMetrics> allMetrics;

    for (const auto& pair : channels_) {
        int channelId = pair.first;
        allMetrics.push_back(getChannelMetrics(channelId));
    }

    return allMetrics;
}

//==============================================================================
// Listener Management
//==============================================================================

void ChannelCPUMonitor::addListener(CPUListener* listener) {
    listeners_.add(listener);
}

void ChannelCPUMonitor::removeListener(CPUListener* listener) {
    listeners_.remove(listener);
}

void ChannelCPUMonitor::clearListeners() {
    listeners_.clear();
}

//==============================================================================
// Analysis
//==============================================================================

std::vector<int> ChannelCPUMonitor::getHottestChannels(int count) const {
    const juce::ScopedLock lock(metricsLock_);

    // Get all metrics
    std::vector<std::pair<int, double>> channelCpu;

    for (const auto& pair : channels_) {
        int channelId = pair.first;
        ChannelMetrics metrics = getChannelMetrics(channelId);
        channelCpu.push_back({ channelId, metrics.cpuPercent });
    }

    // Sort by CPU usage (descending)
    std::sort(channelCpu.begin(), channelCpu.end(),
        [](const auto& a, const auto& b) { return a.second > b.second; });

    // Extract top N channel IDs
    std::vector<int> hottest;
    for (int i = 0; i < std::min(count, (int)channelCpu.size()); ++i) {
        hottest.push_back(channelCpu[i].first);
    }

    return hottest;
}

bool ChannelCPUMonitor::hasOverBudgetChannels() const {
    const juce::ScopedLock lock(metricsLock_);

    for (const auto& pair : channels_) {
        int channelId = pair.first;
        ChannelMetrics metrics = getChannelMetrics(channelId);

        if (metrics.overBudget) {
            return true;
        }
    }

    return false;
}

juce::String ChannelCPUMonitor::generateDebugReport() const {
    const juce::ScopedLock lock(metricsLock_);

    juce::String report = "=== Channel CPU Report ===\n\n";

    // Get all metrics sorted by CPU usage
    auto allMetrics = getAllMetrics();
    std::sort(allMetrics.begin(), allMetrics.end(),
        [](const ChannelMetrics& a, const ChannelMetrics& b) {
            return a.cpuPercent > b.cpuPercent;
        });

    // Add per-channel breakdown
    for (const auto& metrics : allMetrics) {
        report += metrics.toString();
        report += "\n\n";
    }

    // Summary
    int overBudgetCount = 0;
    double totalCpu = 0.0;

    for (const auto& metrics : allMetrics) {
        if (metrics.overBudget) {
            overBudgetCount++;
        }
        totalCpu += metrics.cpuPercent;
    }

    report += "=== Summary ===\n";
    report += juce::String::formatted(
        "Total channels: %d\n"
        "Over budget: %d\n"
        "Total CPU: %.2f%%\n",
        allMetrics.size(),
        overBudgetCount,
        totalCpu
    );

    return report;
}

//==============================================================================
// Reset
//==============================================================================

void ChannelCPUMonitor::resetMetrics() {
    const juce::ScopedLock lock(metricsLock_);

    channels_.clear();
}

void ChannelCPUMonitor::resetChannelMetrics(int channelId) {
    const juce::ScopedLock lock(metricsLock_);

    auto it = channels_.find(channelId);
    if (it != channels_.end()) {
        it->second = ChannelState{};
    }
}

//==============================================================================
// Idle Bypass Tracking (Debug Instrumentation)
//==============================================================================

void ChannelCPUMonitor::incrementIdleBypass(int channelId) {
    // No lock for increment (atomic operation on counter)
    channels_[channelId].idleBypassCount++;
}

uint64_t ChannelCPUMonitor::getIdleBypassCount(int channelId) const {
    const juce::ScopedLock lock(metricsLock_);

    auto it = channels_.find(channelId);
    if (it != channels_.end()) {
        return it->second.idleBypassCount;
    }
    return 0;
}

uint64_t ChannelCPUMonitor::getTotalIdleBypassCount() const {
    const juce::ScopedLock lock(metricsLock_);

    uint64_t total = 0;
    for (const auto& pair : channels_) {
        total += pair.second.idleBypassCount;
    }
    return total;
}

//==============================================================================
// Helper Methods (Private)
//==============================================================================

void ChannelCPUMonitor::checkBudget(int channelId, const ChannelState& state,
                                     double microseconds) {
    // Get budget for this channel
    auto budgetIt = budgets_.find(channelId);
    const auto& budget = (budgetIt != budgets_.end()) ? budgetIt->second : defaultBudget_;

    // Check if over budget (this block operation, not per-sample)
    if (microseconds > budget.maxMicrosecondsPerSample) {
        // Increment exceed count
        channels_[channelId].exceedCount++;

        // Notify listeners (debug builds only)
        listeners_.call([channelId, microseconds, budget](CPUListener& l) {
            l.channelOverBudget(channelId, microseconds, budget.maxMicrosecondsPerSample);
        });

        // Debug log (debug builds only)
        DBG(juce::String::formatted(
            "ChannelCPUMonitor: Channel %d over budget! "
            "Actual: %.3f µs, Budget: %.3f µs",
            channelId, microseconds, budget.maxMicrosecondsPerSample
        ));
    }
}

double ChannelCPUMonitor::ticksToMicroseconds(uint64_t ticks) const noexcept {
    // Platform-specific conversion
#if JUCE_MAC
    // mach_absolute_time needs conversion to nanoseconds
    static mach_timebase_info_data_t timebase;
    static bool initialized = false;

    if (!initialized) {
        mach_timebase_info(&timebase);
        initialized = true;
    }

    return (ticks * timebase.numer / timebase.denom) / 1000.0;  // ns → µs

#elif JUCE_WINDOWS
    // QueryPerformanceCounter frequency
    static LARGE_INTEGER frequency;
    static bool initialized = false;

    if (!initialized) {
        QueryPerformanceFrequency(&frequency);
        initialized = true;
    }

    return (static_cast<double>(ticks) / static_cast<double>(frequency.QuadPart)) * 1000000.0;

#else
    // std::chrono high_resolution_clock (nanoseconds)
    return ticks / 1000.0;  // ns → µs
#endif
}

double ChannelCPUMonitor::calculateCpuPercent(double microseconds, int numSamples,
                                               double sampleRate) const noexcept {
    // Calculate: (microseconds / (sampleCount / sampleRate * 1e6)) * 100
    double sampleTime = (numSamples / sampleRate) * 1000000.0;  // µs
    return (microseconds / sampleTime) * 100.0;
}

} // namespace SchillingerEcosystem::Audio
