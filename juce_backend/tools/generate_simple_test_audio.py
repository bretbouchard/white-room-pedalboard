#!/usr/bin/env python3
"""
Simple test audio generator without scipy dependency
Creates basic test signals for audio analysis testing
"""

import numpy as np
import os
import struct
from pathlib import Path

def write_wav(filename, sample_rate, data):
    """Write a simple WAV file (16-bit PCM)"""
    # Ensure data is float32 and normalize to 16-bit range
    data = np.array(data, dtype=np.float32)
    data = np.clip(data, -1.0, 1.0)
    data_int16 = (data * 32767).astype(np.int16)

    # Create WAV header
    with open(filename, 'wb') as f:
        # RIFF header
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + len(data_int16) * 2))
        f.write(b'WAVE')

        # fmt chunk
        f.write(b'fmt ')
        f.write(struct.pack('<I', 16))  # chunk size
        f.write(struct.pack('<H', 1))   # PCM format
        f.write(struct.pack('<H', 1))   # mono
        f.write(struct.pack('<I', sample_rate))
        f.write(struct.pack('<I', sample_rate * 2))  # byte rate
        f.write(struct.pack('<H', 2))   # block align
        f.write(struct.pack('<H', 16))  # bits per sample

        # data chunk
        f.write(b'data')
        f.write(struct.pack('<I', len(data_int16) * 2))
        f.write(data_int16.tobytes())

def create_sine_wave(frequency, duration, sample_rate=44100, amplitude=0.7):
    """Generate a pure sine wave"""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    return amplitude * np.sin(2 * np.pi * frequency * t)

def create_white_noise(duration, sample_rate=44100, amplitude=0.3):
    """Generate white noise"""
    return amplitude * np.random.randn(int(sample_rate * duration))

def main():
    """Generate basic test audio samples"""
    print("🎵 Generating simple test audio samples...")
    print("=" * 50)

    try:
        # Create test data directories
        base_dir = Path("test_data/audio")
        base_dir.mkdir(parents=True, exist_ok=True)

        # Generate basic test files
        sample_rate = 44100
        duration = 1.0

        # Create subdirectories
        for subdir in ["spectral", "pitch", "dynamics", "spatial", "problems"]:
            (base_dir / subdir).mkdir(exist_ok=True)

        # 1. Spectral tests
        print("Generating spectral analysis samples...")

        # White noise
        white_noise = create_white_noise(duration, sample_rate, 0.3)
        write_wav(base_dir / "spectral" / "white_noise.wav", sample_rate, white_noise)

        # 440Hz sine wave
        sine_440 = create_sine_wave(440, duration, sample_rate)
        write_wav(base_dir / "spectral" / "sine_440hz.wav", sample_rate, sine_440)

        # Complex signal (multiple frequencies)
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        complex_signal = (0.5 * np.sin(2 * np.pi * 440 * t) +    # A4
                         0.3 * np.sin(2 * np.pi * 880 * t) +    # A5
                         0.2 * np.sin(2 * np.pi * 220 * t))     # A3
        write_wav(base_dir / "spectral" / "complex_signal.wav", sample_rate, complex_signal)

        # 2. Pitch tests
        print("Generating pitch detection samples...")

        # Musical notes (A major scale)
        frequencies = [220.0, 246.94, 261.63, 293.66, 329.63, 369.99, 415.30, 440.00]  # A3 to A4
        note_names = ["A3", "B3", "C4", "D4", "E4", "F#4", "G#4", "A4"]

        for freq, name in zip(frequencies, note_names):
            sine_wave = create_sine_wave(freq, duration, sample_rate)
            write_wav(base_dir / "pitch" / f"{name}_{freq}Hz.wav", sample_rate, sine_wave)

        # 3. Dynamics tests
        print("Generating dynamics analysis samples...")

        # Quiet signal
        quiet_signal = create_sine_wave(440, duration, sample_rate, 0.1)
        write_wav(base_dir / "dynamics" / "quiet_signal.wav", sample_rate, quiet_signal)

        # Loud signal
        loud_signal = create_sine_wave(440, duration, sample_rate, 0.9)
        write_wav(base_dir / "dynamics" / "loud_signal.wav", sample_rate, loud_signal)

        # Dynamic range test (fade in/out)
        samples = int(sample_rate * duration)
        fade_envelope = np.concatenate([
            np.linspace(0, 1, samples // 4),    # Fade in
            np.ones(samples // 2),             # Sustain
            np.linspace(1, 0, samples // 4)     # Fade out
        ])
        dynamic_signal = create_sine_wave(440, duration, sample_rate) * fade_envelope
        write_wav(base_dir / "dynamics" / "dynamic_range.wav", sample_rate, dynamic_signal)

        # 4. Spatial tests (mono files, as spatial processing is algorithmic)
        print("Generating spatial analysis samples...")

        # Center-panned signal (will be processed by spatial analyzer)
        center_signal = create_sine_wave(440, duration, sample_rate)
        write_wav(base_dir / "spatial" / "center_panned.wav", sample_rate, center_signal)

        # 5. Problem samples
        print("Generating problem detection samples...")

        # Add some noise to simulate issues
        noisy_signal = create_sine_wave(440, duration, sample_rate) + \
                      0.1 * create_white_noise(duration, sample_rate, 0.1)
        write_wav(base_dir / "problems" / "noisy_signal.wav", sample_rate, noisy_signal)

        # Simulated clipping (hard-limited signal)
        loud_sine = create_sine_wave(440, duration, sample_rate, 2.0)  # Over 0dB
        clipped_signal = np.clip(loud_sine, -1.0, 1.0)
        write_wav(base_dir / "problems" / "clipped_signal.wav", sample_rate, clipped_signal)

        print("\n" + "=" * 50)
        print("✅ Simple test audio samples generated successfully!")
        print("Test files are ready in test_data/audio/")
        print("\nGenerated files:")
        print("  - Spectral: 3 files")
        print("  - Pitch: 8 files")
        print("  - Dynamics: 3 files")
        print("  - Spatial: 1 file")
        print("  - Problems: 2 files")
        print("  Total: 17 test audio files")

    except Exception as e:
        print(f"\n❌ Error generating test samples: {e}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())