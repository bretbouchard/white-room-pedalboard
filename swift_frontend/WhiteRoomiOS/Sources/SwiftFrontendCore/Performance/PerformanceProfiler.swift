//
//  PerformanceProfiler.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation
import os.signpost

#if canImport(OSSignpostPoster)
import OSSignpostPoster
#endif

/// High-performance profiler for Swift code using os_signpost and manual timers
public final class PerformanceProfiler {

    // MARK: - Types

    public struct TimingStats {
        public let count: Int
        public let totalMS: Double
        public let averageMS: Double
        public let minMS: Double
        public let maxMS: Double
        public let p95MS: Double
        public let p99MS: Double

        public var averageMicroseconds: Double {
            return averageMS * 1000.0
        }

        public var p95Microseconds: Double {
            return p95MS * 1000.0
        }

        public var p99Microseconds: Double {
            return p99MS * 1000.0
        }
    }

    // MARK: - Properties

    public static let shared = PerformanceProfiler()

    private var timings: [String: [Double]] = [:]
    #if canImport(OSSignpostPoster)
    private var signpostLogger: OSSignpostLogger?
    #else
    private var signpostLogger: OpaquePointer?
    #endif
    private let queue = DispatchQueue(label: "com.whiteroom.profiler", attributes: .concurrent)

    // Performance thresholds (in milliseconds)
    private let thresholds: [String: Double] = [
        "ProjectionEngine.projectSong": 25.0,
        "Validation": 0.1,
        "GraphGeneration": 20.0,
        "ConsoleXGeneration": 5.0,
        "FileLoader.loadSong": 1000.0,
        "FileSaver.saveSong": 500.0,
        "ScreenTransition": 100.0,
        "TouchResponse": 50.0
    ]

    // MARK: - Initialization

    private init() {
        #if canImport(OSSignpostPoster)
        signpostLogger = OSSignpostLogger(subsystem: "com.whiteroom", category: "Performance")
        #endif
    }

    // MARK: - Public API

    /// Profile a block of code
    public func profile<T>(_ label: String, operation: () throws -> T) rethrows -> T {
        let start = CFAbsoluteTimeGetCurrent()
        defer {
            let duration = (CFAbsoluteTimeGetCurrent() - start) * 1000
            recordTiming(label, duration: duration)
        }
        return try operation()
    }

    /// Profile an async block of code
    public func profileAsync<T>(_ label: String, operation: () async throws -> T) async rethrows -> T {
        let start = CFAbsoluteTimeGetCurrent()
        defer {
            let duration = (CFAbsoluteTimeGetCurrent() - start) * 1000
            recordTiming(label, duration: duration)
        }
        return try await operation()
    }

    /// Record a timing manually
    public func recordTiming(_ label: String, duration: Double) {
        queue.async(flags: .barrier) { [weak self] in
            guard let self = self else { return }
            if self.timings[label] == nil {
                self.timings[label] = []
            }
            self.timings[label]?.append(duration)

            // Log to signpost
            #if canImport(OSSignpostPoster)
            os_signpost(.event, log: self.signpostLogger, name: "Timing", "\(label): \(duration)ms")
            #endif
        }
    }

    /// Get statistics for a label
    public func getStats(for label: String) -> TimingStats? {
        return queue.sync {
            guard let samples = timings[label], !samples.isEmpty else {
                return nil
            }

            let count = samples.count
            let total = samples.reduce(0, +)
            let average = total / Double(count)
            let min = samples.min() ?? 0
            let max = samples.max() ?? 0

            let sorted = samples.sorted()
            let p95Index = Int(Double(count) * 0.95)
            let p99Index = Int(Double(count) * 0.99)
            let p95 = sorted[p95Index]
            let p99 = sorted[p99Index]

            return TimingStats(
                count: count,
                totalMS: total,
                averageMS: average,
                minMS: min,
                maxMS: max,
                p95MS: p95,
                p99MS: p99
            )
        }
    }

    /// Print timing report
    public func report() {
        queue.sync {
            let sorted = timings.sorted { lhs, rhs in
                let lhsTotal = lhs.value.reduce(0, +)
                let rhsTotal = rhs.value.reduce(0, +)
                return lhsTotal > rhsTotal
            }

            print("\n=== Performance Timing Report ===")
            print(String(format: "%-30s %10s %15s %15s %15s %15s",
                "Operation", "Calls", "Total (ms)", "Avg (ms)", "P95 (ms)", "P99 (ms)"))
            print(String(repeating: "-", count: 100))

            for (label, samples) in sorted {
                let stats = computeStats(samples: samples)
                print(String(format: "%-30s %10ld %15.2f %15.2f %15.2f %15.2f",
                    label, stats.count, stats.total, stats.avg, stats.p95, stats.p99))
            }

            print()
        }
    }

    /// Check performance thresholds
    public func checkThresholds() -> Bool {
        return queue.sync {
            var allPassed = true

            print("\n=== Performance Threshold Check ===")

            for (label, samples) in timings.sorted(by: { $0.key < $1.key }) {
                guard let threshold = thresholds[label] else { continue }

                let stats = computeStats(samples: samples)
                let passed = stats.p99 <= threshold

                print(String(format: "%@ P99: %.2fms (threshold: %.2fms)",
                    passed ? "✓" : "✗", stats.p99, threshold))

                if !passed {
                    allPassed = false
                }
            }

            print("\n\(allPassed ? "✓ All thresholds PASSED" : "✗ Some thresholds FAILED")\n")

            return allPassed
        }
    }

    /// Clear all timings
    public func clear() {
        queue.async(flags: .barrier) { [weak self] in
            self?.timings.removeAll()
        }
    }

    // MARK: - Private Helpers

    private func computeStats(samples: [Double]) -> (count: Int, total: Double, avg: Double, p95: Double, p99: Double) {
        let count = samples.count
        let total = samples.reduce(0, +)
        let avg = total / Double(count)

        let sorted = samples.sorted()
        let p95Index = min(Int(Double(count) * 0.95), count - 1)
        let p99Index = min(Int(Double(count) * 0.99), count - 1)

        return (count, total, avg, sorted[p95Index], sorted[p99Index])
    }
}

// MARK: - Scope-Based Timer

public final class ProfileScope {
    private let label: String
    private let start: CFTimeInterval
    private let profiler: PerformanceProfiler

    public init(label: String, profiler: PerformanceProfiler = .shared) {
        self.label = label
        self.profiler = profiler
        self.start = CFAbsoluteTimeGetCurrent()

        #if canImport(OSSignpostPoster)
        os_signpost(.begin, log: profiler.signpostLogger, name: label)
        #endif
    }

    deinit {
        let duration = (CFAbsoluteTimeGetCurrent() - start) * 1000
        profiler.recordTiming(label, duration: duration)

        #if canImport(OSSignpostPoster)
        os_signpost(.end, log: profiler.signpostLogger, name: label)
        #endif
    }
}

// MARK: - Convenience Functions

/// Profile a block of code
public func profile<T>(_ label: String, operation: () throws -> T) rethrows -> T {
    return try PerformanceProfiler.shared.profile(label, operation: operation)
}

/// Profile an async block of code
public func profileAsync<T>(_ label: String, operation: () async throws -> T) async rethrows -> T {
    return try await PerformanceProfiler.shared.profileAsync(label, operation: operation)
}
