#!/usr/bin/env python3
"""
Performance Regression Checker

Analyzes profiling results and detects performance regressions
by comparing current metrics against baseline and thresholds.
"""

import json
import csv
import sys
import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

class ThresholdStatus(Enum):
    PASSED = "✓ PASSED"
    FAILED = "✗ FAILED"
    WARNING = "⚠ WARNING"

@dataclass
class MetricResult:
    """Result of a single metric check"""
    name: str
    value: float
    threshold: float
    unit: str
    status: ThresholdStatus
    baseline: Optional[float] = None
    regression: Optional[float] = None  # Percentage change from baseline

class PerformanceAnalyzer:
    """Analyzes performance profiling results"""

    # Performance thresholds (in microseconds unless noted)
    THRESHOLDS = {
        # Audio Engine
        "ProjectionEngine.projectSong": 25000,  # 25ms
        "ProjectionEngine.validateSong": 100,   # 0.1ms
        "ProjectionEngine.validatePerformance": 100,
        "ProjectionEngine.applyPerformanceToSong": 1000,  # 1ms
        "ProjectionEngine.generateRenderGraph": 20000,  # 20ms
        "ProjectionEngine.buildVoices": 1000,
        "ProjectionEngine.buildBuses": 500,
        "ProjectionEngine.assignNotes": 15000,  # 15ms
        "ProjectionEngine.generateRhythmAttacks": 5000,  # 5ms
        "ProjectionEngine.buildTimeline": 1000,

        # FFI Bridge
        "FFI.sch_engine_create": 1000,  # 1ms
        "FFI.sch_engine_destroy": 500,
        "FFI.sch_engine_send_command": 1000,  # 1ms
        "FFI.sch_engine_set_performance_blend": 1000,  # 1ms

        # UI Operations
        "UI.AppStartup": 3000,  # 3s (in ms)
        "UI.ScreenTransition": 100,  # 100ms
        "UI.TouchResponse": 50,  # 50ms

        # File I/O
        "FileI/O.LoadSong": 1000,  # 1s (in ms)
        "FileI/O.SaveSong": 500,  # 500ms
        "FileI/O.SchemaValidation": 100,  # 100ms
        "FileI/O.Migration": 200,  # 200ms
    }

    # Warning thresholds (percentage above threshold)
    WARNING_THRESHOLD = 0.80  # 80% of threshold = warning

    # Regression threshold (percentage increase from baseline)
    REGRESSION_THRESHOLD = 0.10  # 10% increase = regression

    def __init__(self, baseline_file: Optional[str] = None):
        """Initialize analyzer with optional baseline file"""
        self.baseline: Dict[str, float] = {}
        if baseline_file and os.path.exists(baseline_file):
            self.load_baseline(baseline_file)

    def load_baseline(self, baseline_file: str):
        """Load baseline metrics from JSON file"""
        with open(baseline_file, 'r') as f:
            self.baseline = json.load(f)
        print(f"Loaded baseline from {baseline_file}")

    def save_baseline(self, baseline_file: str):
        """Save current metrics as baseline"""
        with open(baseline_file, 'w') as f:
            json.dump(self.baseline, f, indent=2)
        print(f"Saved baseline to {baseline_file}")

    def parse_instruments_csv(self, csv_file: str) -> Dict[str, List[float]]:
        """Parse Instruments CSV export and extract timing data"""
        timings: Dict[str, List[float]] = {}

        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Extract symbol name and duration
                symbol = row.get('Symbol', '')
                duration = row.get('Running Time (ms)', '')

                if symbol and duration:
                    try:
                        duration_ms = float(duration.replace(' ms', ''))
                        duration_us = duration_ms * 1000  # Convert to microseconds

                        if symbol not in timings:
                            timings[symbol] = []
                        timings[symbol].append(duration_us)
                    except ValueError:
                        continue

        return timings

    def parse_gprof_output(self, gprof_file: str) -> Dict[str, List[float]]:
        """Parse gprof output and extract timing data"""
        timings: Dict[str, List[float]] = {}

        with open(gprof_file, 'r') as f:
            in_flat_profile = False
            for line in f:
                # Look for flat profile section
                if 'Flat profile:' in line:
                    in_flat_profile = True
                    continue

                if not in_flat_profile:
                    continue

                # Exit flat profile when we hit the call graph
                if 'Call graph' in line or line.strip() == '':
                    break

                # Parse flat profile line
                # Format: [percentage] [cumulative seconds] [self seconds] [calls] [self ms/call] [total ms/call] [name]
                parts = line.split()
                if len(parts) >= 7 and parts[0].isdigit():
                    try:
                        self_seconds = float(parts[2])
                        self_us = self_seconds * 1_000_000  # Convert to microseconds
                        name = parts[6]

                        if name not in timings:
                            timings[name] = []
                        timings[name].append(self_us)
                    except (ValueError, IndexError):
                        continue

        return timings

    def check_thresholds(self, timings: Dict[str, List[float]]) -> List[MetricResult]:
        """Check timings against performance thresholds"""
        results = []

        for metric_name, samples in timings.items():
            if not samples:
                continue

            # Calculate P99 (worst case)
            p99_us = sorted(samples)[int(len(samples) * 0.99)]

            # Find matching threshold
            threshold = None
            for key, value in self.THRESHOLDS.items():
                if key.lower() in metric_name.lower() or metric_name.lower() in key.lower():
                    threshold = value
                    break

            if threshold is None:
                continue

            # Check status
            if p99_us <= threshold * self.WARNING_THRESHOLD:
                status = ThresholdStatus.PASSED
            elif p99_us <= threshold:
                status = ThresholdStatus.WARNING
            else:
                status = ThresholdStatus.FAILED

            # Check regression against baseline
            regression = None
            if metric_name in self.baseline:
                baseline = self.baseline[metric_name]
                regression = ((p99_us - baseline) / baseline) * 100

            results.append(MetricResult(
                name=metric_name,
                value=p99_us,
                threshold=threshold,
                unit="μs",
                status=status,
                baseline=self.baseline.get(metric_name),
                regression=regression
            ))

        return results

    def print_report(self, results: List[MetricResult]):
        """Print performance analysis report"""
        print("\n" + "=" * 100)
        print("PERFORMANCE REGRESSION ANALYSIS REPORT")
        print("=" * 100)

        # Group by status
        passed = [r for r in results if r.status == ThresholdStatus.PASSED]
        warnings = [r for r in results if r.status == ThresholdStatus.WARNING]
        failed = [r for r in results if r.status == ThresholdStatus.FAILED]
        regressions = [r for r in results if r.regression and r.regression > self.REGRESSION_THRESHOLD * 100]

        # Summary
        print(f"\nSummary:")
        print(f"  Total metrics: {len(results)}")
        print(f"  Passed: {len(passed)}")
        print(f"  Warnings: {len(warnings)}")
        print(f"  Failed: {len(failed)}")
        print(f"  Regressions: {len(regressions)}")

        # Failed metrics
        if failed:
            print("\n" + "!" * 100)
            print("FAILED METRICS")
            print("!" * 100)
            print(f"\n{'Metric':<40} {'Value':<15} {'Threshold':<15} {'Status':<15}")
            print("-" * 100)

            for result in failed:
                print(f"{result.name:<40} {result.value:>10.0f}μs {result.threshold:>10.0f}μs {result.status.value:<15}")

        # Regression warnings
        if regressions:
            print("\n" + "!" * 100)
            print("PERFORMANCE REGRESSIONS DETECTED")
            print("!" * 100)
            print(f"\n{'Metric':<40} {'Current':<15} {'Baseline':<15} {'Change':<15}")
            print("-" * 100)

            for result in regressions:
                print(f"{result.name:<40} {result.value:>10.0f}μs {result.baseline:>10.0f}μs {result.regression:>+10.1f}%")

        # Warnings
        if warnings:
            print("\n" + "=" * 100)
            print("WARNINGS")
            print("=" * 100)
            print(f"\n{'Metric':<40} {'Value':<15} {'Threshold':<15} {'Status':<15}")
            print("-" * 100)

            for result in warnings:
                print(f"{result.name:<40} {result.value:>10.0f}μs {result.threshold:>10.0f}μs {result.status.value:<15}")

        # All results table
        print("\n" + "=" * 100)
        print("ALL METRICS")
        print("=" * 100)
        print(f"\n{'Metric':<40} {'Value':<15} {'Threshold':<15} {'Baseline':<15} {'Status':<15}")
        print("-" * 100)

        for result in results:
            baseline_str = f"{result.baseline:.0f}μs" if result.baseline else "N/A"
            print(f"{result.name:<40} {result.value:>10.0f}μs {result.threshold:>10.0f}μs {baseline_str:>15} {result.status.value:<15}")

        # Overall status
        print("\n" + "=" * 100)
        if failed or regressions:
            print("✗ PERFORMANCE REGRESSIONS OR FAILURES DETECTED")
            print("=" * 100)
            return False
        else:
            print("✓ ALL PERFORMANCE METRICS PASSED")
            print("=" * 100)
            return True

    def analyze_directory(self, results_dir: str) -> bool:
        """Analyze all profiling results in directory"""
        all_timings: Dict[str, List[float]] = {}

        # Parse gprof output
        gprof_file = os.path.join(results_dir, "gprof_analysis.txt")
        if os.path.exists(gprof_file):
            print(f"Parsing gprof output: {gprof_file}")
            gprof_timings = self.parse_gprof_output(gprof_file)
            for name, samples in gprof_timings.items():
                if name not in all_timings:
                    all_timings[name] = []
                all_timings[name].extend(samples)

        # Parse Instruments CSV
        csv_file = os.path.join(results_dir, "cpu_profile.csv")
        if os.path.exists(csv_file):
            print(f"Parsing Instruments CSV: {csv_file}")
            instruments_timings = self.parse_instruments_csv(csv_file)
            for name, samples in instruments_timings.items():
                if name not in all_timings:
                    all_timings[name] = []
                all_timings[name].extend(samples)

        if not all_timings:
            print("No timing data found!")
            return True

        # Check thresholds
        results = self.check_thresholds(all_timings)

        # Print report
        return self.print_report(results)

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='Analyze performance profiling results')
    parser.add_argument('--results-dir', '-r',
                        default='performance_results',
                        help='Directory containing profiling results')
    parser.add_argument('--baseline', '-b',
                        help='Baseline JSON file for regression detection')
    parser.add_argument('--save-baseline', '-s',
                        help='Save current metrics as baseline to this file')
    parser.add_argument('--thresholds', '-t',
                        action='store_true',
                        help='Only check thresholds, ignore regressions')

    args = parser.parse_args()

    # Create analyzer
    analyzer = PerformanceAnalyzer(baseline_file=args.baseline)

    # Analyze results
    success = analyzer.analyze_directory(args.results_dir)

    # Save baseline if requested
    if args.save_baseline:
        analyzer.save_baseline(args.save_baseline)

    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
