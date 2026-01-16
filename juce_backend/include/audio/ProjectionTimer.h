/*
  ==============================================================================

    ProjectionTimer.h
    Created: January 15, 2026
    Author:  Bret Bouchard

    High-resolution performance timer for profiling ProjectionEngine operations.

  ==============================================================================
*/

#pragma once

#include <chrono>
#include <map>
#include <string>
#include <iostream>
#include <iomanip>
#include <algorithm>

/**
 High-resolution timer for profiling C++ code with microsecond precision.

 Usage:
 ```cpp
 ProjectionTimer timer;

 {
     auto _ = timer.scope("projectSong");
     // Code to measure
 }

 timer.report(); // Print all timings
 ```
*/
class ProjectionTimer
{
public:
    //==============================================================================
    // Scope-based timer for automatic timing
    class Scope
    {
    public:
        Scope(ProjectionTimer& parent, const std::string& label)
            : parent(parent), label(label)
        {
            start = std::chrono::high_resolution_clock::now();
        }

        ~Scope()
        {
            auto end = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
            parent.record(label, duration.count());
        }

    private:
        ProjectionTimer& parent;
        std::string label;
        std::chrono::high_resolution_clock::time_point start;
    };

    //==============================================================================
    ProjectionTimer()
    {
    }

    //==============================================================================
    /** Create a scope timer for automatic measurement */
    Scope scope(const std::string& label)
    {
        return Scope(*this, label);
    }

    //==============================================================================
    /** Manually record a timing in microseconds */
    void record(const std::string& label, int64_t microseconds)
    {
        timings[label] += microseconds;
        counts[label]++;
    }

    //==============================================================================
    /** Record a single timing sample */
    void recordSample(const std::string& label, int64_t microseconds)
    {
        samples[label].push_back(microseconds);
    }

    //==============================================================================
    /** Get total time for a label in microseconds */
    int64_t getTotal(const std::string& label) const
    {
        auto it = timings.find(label);
        return (it != timings.end()) ? it->second : 0;
    }

    //==============================================================================
    /** Get count for a label */
    size_t getCount(const std::string& label) const
    {
        auto it = counts.find(label);
        return (it != counts.end()) ? it->second : 0;
    }

    //==============================================================================
    /** Get average time for a label in microseconds */
    double getAverage(const std::string& label) const
    {
        int64_t total = getTotal(label);
        size_t count = getCount(label);
        return (count > 0) ? static_cast<double>(total) / count : 0.0;
    }

    //==============================================================================
    /** Get median time for a label in microseconds */
    double getMedian(const std::string& label) const
    {
        auto it = samples.find(label);
        if (it == samples.end() || it->second.empty())
            return 0.0;

        auto sorted = it->second;
        std::sort(sorted.begin(), sorted.end());

        size_t n = sorted.size();
        if (n % 2 == 0)
            return (sorted[n/2 - 1] + sorted[n/2]) / 2.0;
        else
            return sorted[n/2];
    }

    //==============================================================================
    /** Get percentile for a label in microseconds */
    double getPercentile(const std::string& label, double percentile) const
    {
        auto it = samples.find(label);
        if (it == samples.end() || it->second.empty())
            return 0.0;

        auto sorted = it->second;
        std::sort(sorted.begin(), sorted.end());

        size_t index = static_cast<size_t>(percentile * sorted.size());
        index = std::min(index, sorted.size() - 1);
        return sorted[index];
    }

    //==============================================================================
    /** Print timing report to stdout */
    void report() const
    {
        std::cout << "\n=== Performance Timing Report ===\n";
        std::cout << std::left << std::setw(30) << "Operation"
                  << std::right << std::setw(12) << "Calls"
                  << std::setw(15) << "Total (ms)"
                  << std::setw(15) << "Avg (μs)"
                  << std::setw(15) << "P95 (μs)"
                  << std::setw(15) << "P99 (μs)"
                  << "\n";
        std::cout << std::string(102, '-') << "\n";

        // Sort by total time
        std::vector<std::pair<std::string, int64_t>> sorted;
        for (const auto& [label, time] : timings)
            sorted.push_back({label, time});

        std::sort(sorted.begin(), sorted.end(),
            [](const auto& a, const auto& b) { return a.second > b.second; });

        for (const auto& [label, _] : sorted)
        {
            int64_t totalUs = getTotal(label);
            size_t count = getCount(label);
            double avgUs = getAverage(label);
            double p95Us = getPercentile(label, 0.95);
            double p99Us = getPercentile(label, 0.99);

            std::cout << std::left << std::setw(30) << label
                      << std::right << std::setw(12) << count
                      << std::setw(14) << std::fixed << std::setprecision(2) << (totalUs / 1000.0)
                      << std::setw(15) << std::fixed << std::setprecision(2) << avgUs
                      << std::setw(15) << std::fixed << std::setprecision(2) << p95Us
                      << std::setw(15) << std::fixed << std::setprecision(2) << p99Us
                      << "\n";
        }

        std::cout << "\n";
    }

    //==============================================================================
    /** Check against performance thresholds and report issues */
    bool checkThresholds() const
    {
        bool allPassed = true;

        std::cout << "\n=== Performance Threshold Check ===\n";

        // Define thresholds in microseconds
        std::map<std::string, int64_t> thresholds = {
            {"projectSong", 25000},      // 25ms
            {"validateSong", 100},       // 0.1ms
            {"validatePerformance", 100}, // 0.1ms
            {"applyPerformanceToSong", 1000}, // 1ms
            {"generateRenderGraph", 20000},   // 20ms
            {"buildVoices", 1000},       // 1ms
            {"buildBuses", 500},         // 0.5ms
            {"assignNotes", 15000},      // 15ms
            {"buildTimeline", 1000},     // 1ms
            {"validateRenderGraph", 500}, // 0.5ms
            {"detectCircularRouting", 500}, // 0.5ms
            {"detectOrphanedNodes", 500}   // 0.5ms
        };

        for (const auto& [label, threshold] : thresholds)
        {
            double avgUs = getAverage(label);
            double p99Us = getPercentile(label, 0.99);

            bool passed = (p99Us <= threshold);
            std::cout << (passed ? "✓ " : "✗ ") << std::left << std::setw(30) << label
                      << "P99: " << std::setw(10) << std::fixed << std::setprecision(2) << p99Us << "μs"
                      << " (threshold: " << threshold << "μs)"
                      << "\n";

            if (!passed)
                allPassed = false;
        }

        std::cout << "\n" << (allPassed ? "✓ All thresholds PASSED" : "✗ Some thresholds FAILED")
                  << "\n\n";

        return allPassed;
    }

    //==============================================================================
    /** Clear all timings */
    void clear()
    {
        timings.clear();
        counts.clear();
        samples.clear();
    }

private:
    //==============================================================================
    std::map<std::string, int64_t> timings;
    std::map<std::string, size_t> counts;
    std::map<std::string, std::vector<int64_t>> samples;
};

//==============================================================================
// Convenience macro for scope-based timing
#define PROFILE_SCOPE(profiler, label) auto _##__LINE__##__timer__ = (profiler).scope(label)
#define PROFILE_TIMING(profiler, label, microseconds) (profiler).record(label, microseconds)
