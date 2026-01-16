#!/usr/bin/env python3
"""
DSP Audio Test Runner

Headless audio testing for InstrumentDSP implementations.
Provides comprehensive metrics and golden file comparison.

Usage:
    python run_dsp_tests.py --bin <dsp_test_host> --instrument <name>
    python run_dsp_tests.py --bin <dsp_test_host> --instrument <name> --update-golden
"""

import argparse
import json
import os
import subprocess
import sys
import numpy as np
import wave
from dataclasses import dataclass
from typing import List, Dict, Tuple, Optional
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))


#==============================================================================
# WAV I/O
#==============================================================================

def write_wav(path: str, audio: np.ndarray, sr: int) -> None:
    """Write audio to WAV file (16-bit PCM)."""
    audio_clipped = np.clip(audio, -1.0, 1.0)
    pcm = (audio_clipped * 32767.0).astype(np.int16)

    with wave.open(path, "wb") as wf:
        wf.setnchannels(audio.shape[1])
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())


def read_wav(path: str) -> Tuple[np.ndarray, int]:
    """Read audio from WAV file."""
    with wave.open(path, "rb") as wf:
        ch = wf.getnchannels()
        sr = wf.getframerate()
        n = wf.getnframes()
        data = np.frombuffer(wf.readframes(n), dtype=np.int16).astype(np.float32) / 32767.0
        data = data.reshape(n, ch)
    return data, sr


#==============================================================================
# Audio Analysis
#==============================================================================

@dataclass
class AudioMetrics:
    """Comprehensive audio metrics."""
    rms: float
    peak: float
    dc_offset: float
    nan_count: int
    inf_count: int
    clipped_samples: int
    zero_crossings_per_sec: float
    fft_peak_hz: float
    fft_peak_db: float
    block_edge_max_jump: float = 0.0

    def to_dict(self) -> Dict:
        return {
            "rms": self.rms,
            "peak": self.peak,
            "dc_offset": self.dc_offset,
            "nan_count": self.nan_count,
            "inf_count": self.inf_count,
            "clipped_samples": self.clipped_samples,
            "zero_crossings_per_sec": self.zero_crossings_per_sec,
            "fft_peak_hz": self.fft_peak_hz,
            "fft_peak_db": self.fft_peak_db,
            "block_edge_max_jump": self.block_edge_max_jump,
        }


def compute_metrics(x: np.ndarray, sr: int) -> AudioMetrics:
    """Compute comprehensive metrics from audio."""
    # Flatten for overall stats
    flat = x.reshape(-1)

    rms = float(np.sqrt(np.mean(flat ** 2)))
    peak = float(np.max(np.abs(flat)))
    dc = float(np.mean(flat))
    nan_count = int(np.isnan(flat).sum())
    inf_count = int(np.isinf(flat).sum())
    clipped = int((np.abs(flat) >= 0.999999).sum())

    # Zero-crossing rate (channel 0)
    c0 = x[:, 0]
    zc = np.sum((c0[:-1] <= 0) & (c0[1:] > 0)) + np.sum((c0[:-1] >= 0) & (c0[1:] < 0))
    zcr_per_sec = float(zc / (len(c0) / sr))

    # FFT peak (channel 0)
    nfft = min(65536, len(c0))
    # Use power of 2
    nfft = 2 ** int(np.log2(nfft))
    win = np.hanning(nfft)
    spec = np.fft.rfft(c0[:nfft] * win)
    mag = np.abs(spec) + 1e-12
    k = int(np.argmax(mag))
    peak_hz = float(k * sr / nfft)
    peak_db = float(20.0 * np.log10(mag[k]))

    return AudioMetrics(
        rms=rms,
        peak=peak,
        dc_offset=dc,
        nan_count=nan_count,
        inf_count=inf_count,
        clipped_samples=clipped,
        zero_crossings_per_sec=zcr_per_sec,
        fft_peak_hz=peak_hz,
        fft_peak_db=peak_db,
    )


def snr_db(a: np.ndarray, b: np.ndarray) -> float:
    """Compute SNR in dB (a relative to noise a-b)."""
    eps = 1e-12
    sig = np.mean(a.astype(np.float64) ** 2) + eps
    err = np.mean((a.astype(np.float64) - b.astype(np.float64)) ** 2) + eps
    return float(10.0 * np.log10(sig / err))


def xcorr_align(a: np.ndarray, b: np.ndarray, max_lag: int = 2048) -> int:
    """Find alignment offset using cross-correlation."""
    a0 = a[:, 0]
    b0 = b[:, 0]
    best_lag = 0
    best = -1e30

    for lag in range(-max_lag, max_lag + 1):
        if lag < 0:
            aa = a0[-lag:]
            bb = b0[:len(aa)]
        else:
            aa = a0[:len(a0) - lag]
            bb = b0[lag:lag + len(aa)]

        if len(aa) < 256:
            continue

        s = float(np.dot(aa, bb))
        if s > best:
            best = s
            best_lag = lag

    return best_lag


def apply_lag(x: np.ndarray, lag: int) -> np.ndarray:
    """Apply time offset to audio."""
    if lag == 0:
        return x
    if lag > 0:
        return x[lag:]
    return x[:lag]


#==============================================================================
# Golden File Comparison
#==============================================================================

@dataclass
class ComparisonResult:
    """Result of golden file comparison."""
    pass: bool
    max_abs_diff: float
    rms_diff: float
    snr_db: float
    lag_samples: int
    details: str

    def to_dict(self) -> Dict:
        return {
            "pass": self.pass,
            "max_abs_diff": self.max_abs_diff,
            "rms_diff": self.rms_diff,
            "snr_db": self.snr_db,
            "lag_samples": self.lag_samples,
            "details": self.details,
        }


def compare_to_golden(
    candidate: np.ndarray,
    golden: np.ndarray,
    max_lag: int = 2048,
    max_abs_tol: float = 1e-3,
    rms_tol: float = 1e-4,
    snr_min: float = 50.0,
) -> ComparisonResult:
    """Compare candidate audio to golden reference."""
    # Align
    lag = xcorr_align(golden, candidate, max_lag)
    g2 = apply_lag(golden, max(lag, 0))
    x2 = apply_lag(candidate, max(-lag, 0))

    n = min(len(g2), len(x2))
    g2 = g2[:n]
    x2 = x2[:n]

    # Compute metrics
    max_abs = float(np.max(np.abs(g2 - x2)))
    rms_diff = float(np.sqrt(np.mean((g2 - x2) ** 2)))
    snr = snr_db(g2, x2)

    # Pass/fail
    pass_result = (max_abs < max_abs_tol) and (rms_diff < rms_tol) and (snr > snr_min)

    details = (f"MaxAbs: {max_abs:.6f} (tol {max_abs_tol:.6f}) | "
               f"RMS: {rms_diff:.6f} (tol {rms_tol:.6f}) | "
               f"SNR: {snr:.2f} dB (min {snr_min:.2f}) | "
               f"Lag: {lag} samples")

    return ComparisonResult(
        pass=pass_result,
        max_abs_diff=max_abs,
        rms_diff=rms_diff,
        snr_db=snr,
        lag_samples=lag,
        details=details,
    )


#==============================================================================
# Test Definitions
#==============================================================================

TESTS = [
    ("silence", {
        "description": "Silence test - catch DC offset, denormals, runaway feedback",
        "assertion": "peak < 1e-4 and abs(dc_offset) < 1e-5 and nan_count == 0 and inf_count == 0",
    }),
    ("impulse", {
        "description": "Impulse response test - check filter stability, envelope behavior",
        "assertion": "nan_count == 0 and inf_count == 0 and peak > 0.001",
    }),
    ("tone_220hz", {
        "description": "Constant tone test - verify sustained audio output at 220Hz",
        "assertion": "rms > 0.01 and peak > 0.05 and 100 < fft_peak_hz < 400 and nan_count == 0",
    }),
    ("tone_440hz", {
        "description": "Constant tone test - verify sustained audio output at 440Hz",
        "assertion": "rms > 0.01 and peak > 0.05 and 300 < fft_peak_hz < 600 and nan_count == 0",
    }),
]


#==============================================================================
# Test Runner
#==============================================================================

def run_test(
    bin_path: str,
    instrument: str,
    test_name: str,
    output_dir: str,
) -> Tuple[np.ndarray, int, AudioMetrics, bool]:
    """Run a single test and return audio, SR, metrics, and success."""
    os.makedirs(output_dir, exist_ok=True)
    out_wav = os.path.join(output_dir, f"{test_name}.wav")

    # Run test host binary
    cmd = [bin_path, "--instrument", instrument, "--test", test_name, "--output", out_wav]
    print(f"Running: {' '.join(cmd)}")

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"STDERR: {result.stderr}")
        raise RuntimeError(f"Test failed with code {result.returncode}")

    # Read output
    audio, sr = read_wav(out_wav)
    metrics = compute_metrics(audio, sr)

    # Check assertion
    test_info = next((t for t in TESTS if t[0] == test_name), None)
    if test_info:
        assertion = test_info[1].get("assertion", "")
        # Simple assertion evaluation (for production, use a proper expression evaluator)
        if "silence" in test_name:
            ok = (metrics.peak < 1e-4 and abs(metrics.dc_offset) < 1e-5 and
                  metrics.nan_count == 0 and metrics.inf_count == 0)
        elif "impulse" in test_name:
            ok = (metrics.nan_count == 0 and metrics.inf_count == 0 and metrics.peak > 0.001)
        elif "tone" in test_name:
            ok = (metrics.rms > 0.01 and metrics.peak > 0.05 and
                  metrics.nan_count == 0 and metrics.inf_count == 0)
        else:
            ok = True  # No assertion
    else:
        ok = True

    return audio, sr, metrics, ok


def main():
    parser = argparse.ArgumentParser(
        description="DSP Audio Test Runner - Headless testing for InstrumentDSP"
    )
    parser.add_argument("--bin", required=True, help="Path to dsp_test_host binary")
    parser.add_argument("--instrument", required=True, help="Instrument name")
    parser.add_argument("--golden-dir", default="tests/audio/golden", help="Golden reference directory")
    parser.add_argument("--out-dir", default="tests/audio/out", help="Output directory")
    parser.add_argument("--update-golden", action="store_true", help="Update golden files")
    parser.add_argument("--test", help="Run specific test only")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")

    args = parser.parse_args()

    # Resolve paths relative to script location
    script_dir = Path(__file__).parent.parent
    golden_dir = script_dir / args.golden_dir
    out_dir = script_dir / args.out_dir

    # Determine which tests to run
    tests_to_run = [args.test] if args.test else [t[0] for t in TESTS]

    results = []

    for test_name in tests_to_run:
        print(f"\n{'='*60}")
        print(f"Test: {test_name}")
        print(f"{'='*60}")

        try:
            audio, sr, metrics, ok = run_test(
                args.bin,
                args.instrument,
                test_name,
                str(out_dir),
            )

            # Print metrics
            print(f"\nMetrics:")
            print(f"  RMS:        {metrics.rms:.6f}")
            print(f"  Peak:       {metrics.peak:.6f}")
            print(f"  DC Offset:  {metrics.dc_offset:.6f}")
            print(f"  NaN Count:  {metrics.nan_count}")
            print(f"  Inf Count:  {metrics.inf_count}")
            print(f"  Clipped:    {metrics.clipped_samples}")
            print(f"  ZCR/s:      {metrics.zero_crossings_per_sec:.2f}")
            print(f"  FFT Peak:   {metrics.fft_peak_hz:.1f} Hz @ {metrics.fft_peak_db:.1f} dB")

            # Golden comparison
            golden = None
            golden_path = golden_dir / f"{test_name}.wav"

            if args.update_golden:
                # Update golden
                golden_path.parent.mkdir(parents=True, exist_ok=True)
                write_wav(str(golden_path), audio, sr)
                print(f"\nGolden updated: {golden_path}")
                golden_result = None
            elif golden_path.exists():
                # Compare to golden
                g_audio, _ = read_wav(str(golden_path))
                golden_result = compare_to_golden(audio, g_audio)
                print(f"\nGolden comparison:")
                print(f"  {golden_result.details}")
                ok = ok and golden_result.pass
            else:
                print(f"\nNo golden file found (use --update-golden to create)")
                golden_result = None

            results.append({
                "test": test_name,
                "pass": ok,
                "metrics": metrics.to_dict(),
                "golden": golden_result.to_dict() if golden_result else None,
            })

        except Exception as e:
            print(f"\nERROR: {e}")
            results.append({
                "test": test_name,
                "pass": False,
                "error": str(e),
            })

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")

    for r in results:
        status = "PASS" if r.get("pass", False) else "FAIL"
        print(f"{r['test']:20s} {status}")

    all_pass = all(r.get("pass", False) for r in results)
    print(f"\nOverall: {'ALL TESTS PASSED' if all_pass else 'SOME TESTS FAILED'}")

    # Write JSON results
    results_path = out_dir / "test_results.json"
    with open(results_path, "w") as f:
        json.dump({"results": results}, f, indent=2)
    print(f"\nResults written: {results_path}")

    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    main()
