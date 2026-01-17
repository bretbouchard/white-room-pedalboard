#!/usr/bin/env swift

// Test compilation of ExecutiveReporting types
// This script verifies that all renamed types compile correctly

import Foundation

// Test that all ER-prefixed types exist and can be instantiated

print("Testing ERGrade...")
let grade: ERGrade = .standard
print("✓ ERGrade compiles")

print("Testing ERTrendDirection...")
let trend: ERTrendDirection = .stable
print("✓ ERTrendDirection compiles")

print("Testing ERQualityDataPoint...")
let qualityPoint = ERQualityDataPoint(date: Date(), passRate: 95.0, coverage: 80.0)
print("✓ ERQualityDataPoint compiles")

print("Testing ERPerformanceDataPoint...")
let perfPoint = ERPerformanceDataPoint(date: Date(), buildTime: 120.0, testTime: 60.0)
print("✓ ERPerformanceDataPoint compiles")

print("Testing ERQualityTrend...")
let qualityTrend = ERQualityTrend(date: Date(), metric: .testCoverage, value: 85.0, context: nil)
print("✓ ERQualityTrend compiles")

print("Testing ERQualityMetric...")
let metric: ERQualityMetric = .passRate
print("✓ ERQualityMetric compiles")

print("Testing ERTrendContext...")
let context = ERTrendContext(commitHash: nil, prNumber: nil, author: nil, notes: nil)
print("✓ ERTrendContext compiles")

print("\n✅ All ExecutiveReporting types compile successfully!")
