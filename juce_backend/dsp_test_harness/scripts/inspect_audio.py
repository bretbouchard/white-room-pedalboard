#!/usr/bin/env python3
"""
Audio Visual Inspector

Generate waveform and FFT plots for audio files.
Useful for debugging DSP issues and visualizing test results.

Usage:
    python inspect_audio.py <file.wav>
    python inspect_audio.py <file.wav> --out-dir <path>
"""

import argparse
import os
import sys
from pathlib import Path

import numpy as np
import wave
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt


def read_wav(path: str):
    """Read audio from WAV file."""
    with wave.open(path, "rb") as wf:
        ch = wf.getnchannels()
        sr = wf.getframerate()
        n = wf.getnframes()
        data = np.frombuffer(wf.readframes(n), dtype=np.int16).astype(np.float32) / 32767.0
        data = data.reshape(n, ch)
    return data, sr


def plot_waveform(audio, sr, out_path, seconds=2.0):
    """Generate waveform plot."""
    n = min(len(audio), int(seconds * sr))
    c0 = audio[:n, 0]
    t = np.arange(len(c0)) / sr

    plt.figure(figsize=(12, 4))
    plt.plot(t, c0)
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude")
    plt.title("Waveform")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close()
    print(f"Waveform: {out_path}")


def plot_fft(audio, sr, out_path, fft_window=4096):
    """Generate FFT magnitude plot."""
    c0 = audio[:, 0]
    nfft = min(fft_window, len(c0))
    # Use power of 2
    nfft = 2 ** int(np.log2(nfft))
    win = np.hanning(nfft)
    spec = np.fft.rfft(c0[:nfft] * win)
    mag = 20.0 * np.log10(np.abs(spec) + 1e-12)
    freqs = np.fft.rfftfreq(nfft, 1.0 / sr)

    plt.figure(figsize=(12, 4))
    plt.plot(freqs, mag)
    plt.xlabel("Frequency (Hz)")
    plt.ylabel("Magnitude (dB)")
    plt.title("FFT Magnitude")
    plt.xlim(0, min(20000, sr / 2))
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close()
    print(f"FFT: {out_path}")


def plot_spectrogram(audio, sr, out_path):
    """Generate spectrogram plot."""
    c0 = audio[:, 0]

    plt.figure(figsize=(12, 6))
    plt.specgram(c0, NFFT=1024, Fs=sr, noverlap=512, cmap='viridis')
    plt.xlabel("Time (s)")
    plt.ylabel("Frequency (Hz)")
    plt.title("Spectrogram")
    plt.colorbar(label="Power (dB)")
    plt.ylim(0, min(20000, sr / 2))
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close()
    print(f"Spectrogram: {out_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate waveform and FFT plots for WAV files"
    )
    parser.add_argument("wav", help="WAV file path")
    parser.add_argument("--out-dir", default="tests/audio/plots", help="Output directory")
    parser.add_argument("--seconds", type=float, default=2.0, help="Seconds to display")
    parser.add_argument("--fft-window", type=int, default=4096, help="FFT window size")
    parser.add_argument("--spectrogram", action="store_true", help="Also generate spectrogram")

    args = parser.parse_args()

    if not os.path.exists(args.wav):
        print(f"Error: File not found: {args.wav}")
        sys.exit(1)

    # Read audio
    audio, sr = read_wav(args.wav)
    print(f"Audio: {len(audio)} frames @ {sr} Hz")

    # Create output directory
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Generate plots
    base = os.path.splitext(os.path.basename(args.wav))[0]

    plot_waveform(audio, sr, str(out_dir / f"{base}_waveform.png"), args.seconds)
    plot_fft(audio, sr, str(out_dir / f"{base}_fft.png"), args.fft_window)

    if args.spectrogram:
        plot_spectrogram(audio, sr, str(out_dir / f"{base}_spectrogram.png"))


if __name__ == "__main__":
    main()
