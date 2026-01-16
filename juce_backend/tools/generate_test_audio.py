#!/usr/bin/env python3
"""
Generate test audio samples for audio analysis testing
Creates various test signals for validating analysis accuracy
"""

import numpy as np
import scipy.io.wavfile as wavfile
import os
from pathlib import Path

def create_sine_wave(frequency, duration, sample_rate=44100, amplitude=0.7):
    """Generate a pure sine wave"""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    return amplitude * np.sin(2 * np.pi * frequency * t)

def create_white_noise(duration, sample_rate=44100, amplitude=0.3):
    """Generate white noise"""
    return amplitude * np.random.randn(int(sample_rate * duration))

def create_pink_noise(duration, sample_rate=44100, amplitude=0.3):
    """Generate pink noise using Voss-McCartney algorithm"""
    num_samples = int(sample_rate * duration)
    b = [0] * 7
    result = np.zeros(num_samples)

    for i in range(num_samples):
        # Generate white noise and update the "pink" filter
        white = np.random.randn()
        for j in range(7):
            if i % (2 ** j) == 0:
                b[j] = white
        result[i] = sum(b) / 7

    # Normalize and scale
    result = result / np.max(np.abs(result)) * amplitude
    return result

def create_sine_sweep(start_freq, end_freq, duration, sample_rate=44100, amplitude=0.7):
    """Generate logarithmic sine sweep"""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    # Logarithmic frequency sweep
    log_start = np.log(start_freq)
    log_end = np.log(end_freq)
    log_freq = log_start + (log_end - log_start) * t / duration
    freq = np.exp(log_freq)
    return amplitude * np.sin(2 * np.pi * freq * t)

def add_hum(signal, hum_freq=60.0, sample_rate=44100, hum_amplitude=0.1):
    """Add mains hum to a signal"""
    t = np.linspace(0, len(signal) / sample_rate, len(signal), False)
    hum = hum_amplitude * np.sin(2 * np.pi * hum_freq * t)
    return signal + hum

def add_dc_offset(signal, offset=0.1):
    """Add DC offset to a signal"""
    return signal + offset

def apply_clipping(signal, threshold=0.9):
    """Apply digital clipping to a signal"""
    return np.clip(signal, -threshold, threshold)

def generate_spectral_test_samples():
    """Generate test samples for spectral analysis"""
    print("Generating spectral analysis test samples...")

    # Directory
    output_dir = Path("test_data/audio/spectral")
    output_dir.mkdir(parents=True, exist_ok=True)

    sample_rate = 44100
    duration = 2.0

    # White noise
    white_noise = create_white_noise(duration, sample_rate)
    wavfile.write(output_dir / "white_noise.wav", sample_rate, white_noise.astype(np.float32))

    # Pink noise
    pink_noise = create_pink_noise(duration, sample_rate)
    wavfile.write(output_dir / "pink_noise.wav", sample_rate, pink_noise.astype(np.float32))

    # Sine sweep (20Hz to 20kHz)
    sine_sweep = create_sine_sweep(20, 20000, duration, sample_rate)
    wavfile.write(output_dir / "sine_sweep.wav", sample_rate, sine_sweep.astype(np.float32))

    # Complex signal (multiple sine waves)
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    noise_component = create_white_noise(duration, sample_rate, 0.1)
    complex_signal = (0.5 * np.sin(2 * np.pi * 440 * t) +      # A4
                     0.3 * np.sin(2 * np.pi * 880 * t) +      # A5
                     0.2 * np.sin(2 * np.pi * 220 * t) +      # A3
                     0.1 * noise_component)
    wavfile.write(output_dir / "complex_signal.wav", sample_rate, complex_signal.astype(np.float32))

def generate_pitch_test_samples():
    """Generate test samples for pitch detection"""
    print("Generating pitch detection test samples...")

    output_dir = Path("test_data/audio/pitch")
    output_dir.mkdir(parents=True, exist_ok=True)

    sample_rate = 44100
    duration = 1.0

    # Musical notes (C major scale)
    frequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]  # C4 to C5
    note_names = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"]

    for freq, name in zip(frequencies, note_names):
        sine_wave = create_sine_wave(freq, duration, sample_rate)
        wavfile.write(output_dir / f"{name}_{freq}Hz.wav", sample_rate, sine_wave.astype(np.float32))

    # Piano-like harmonics (fundamental + harmonics)
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    piano_like = (0.6 * np.sin(2 * np.pi * 440 * t) +      # Fundamental
                  0.3 * np.sin(2 * np.pi * 880 * t) +      # 2nd harmonic
                  0.2 * np.sin(2 * np.pi * 1320 * t) +     # 3rd harmonic
                  0.1 * np.sin(2 * np.pi * 1760 * t))      # 4th harmonic
    wavfile.write(output_dir / "piano_like_A4.wav", sample_rate, piano_like.astype(np.float32))

def generate_dynamics_test_samples():
    """Generate test samples for dynamics analysis"""
    print("Generating dynamics analysis test samples...")

    output_dir = Path("test_data/audio/dynamics")
    output_dir.mkdir(parents=True, exist_ok=True)

    sample_rate = 44100
    duration = 3.0

    # Quiet passage
    quiet_signal = create_white_noise(duration, sample_rate, 0.1)
    wavfile.write(output_dir / "quiet_passage.wav", sample_rate, quiet_signal.astype(np.float32))

    # Loud passage
    loud_signal = create_white_noise(duration, sample_rate, 0.9)
    wavfile.write(output_dir / "loud_passage.wav", sample_rate, loud_signal.astype(np.float32))

    # Dynamic rhythm (alternating loud/quiet)
    samples_per_beat = int(sample_rate * 0.5)  # 120 BPM
    total_samples = int(sample_rate * duration)
    dynamic_rhythm = np.zeros(total_samples)

    for i in range(0, total_samples, samples_per_beat):
        beat_end = min(i + samples_per_beat, total_samples)
        if (i // samples_per_beat) % 2 == 0:
            # Loud beat
            dynamic_rhythm[i:beat_end] = create_white_noise(beat_end - i, sample_rate, 0.8)
        else:
            # Quiet beat
            dynamic_rhythm[i:beat_end] = create_white_noise(beat_end - i, sample_rate, 0.2)

    wavfile.write(output_dir / "dynamic_rhythm.wav", sample_rate, dynamic_rhythm.astype(np.float32))

def generate_spatial_test_samples():
    """Generate test samples for spatial analysis"""
    print("Generating spatial analysis test samples...")

    output_dir = Path("test_data/audio/spatial")
    output_dir.mkdir(parents=True, exist_ok=True)

    sample_rate = 44100
    duration = 2.0
    samples = int(sample_rate * duration)

    # Mono center (same in both channels)
    mono_center = create_sine_wave(440, duration, sample_rate)
    mono_stereo = np.column_stack((mono_center, mono_center))
    wavfile.write(output_dir / "mono_center.wav", sample_rate, mono_stereo.astype(np.float32))

    # Hard pan left
    pan_left = create_sine_wave(440, duration, sample_rate)
    pan_left_stereo = np.column_stack((pan_left, np.zeros_like(pan_left)))
    wavfile.write(output_dir / "hard_pan_left.wav", sample_rate, pan_left_stereo.astype(np.float32))

    # Hard pan right
    pan_right = create_sine_wave(440, duration, sample_rate)
    pan_right_stereo = np.column_stack((np.zeros_like(pan_right), pan_right))
    wavfile.write(output_dir / "hard_pan_right.wav", sample_rate, pan_right_stereo.astype(np.float32))

    # Complex stereo (different signals in each channel)
    left_signal = create_sine_wave(440, duration, sample_rate)
    right_signal = create_sine_wave(554.37, duration, sample_rate)  # C#5
    complex_stereo = np.column_stack((left_signal, right_signal))
    wavfile.write(output_dir / "complex_stereo.wav", sample_rate, complex_stereo.astype(np.float32))

def generate_problem_test_samples():
    """Generate test samples with audio problems"""
    print("Generating problem detection test samples...")

    output_dir = Path("test_data/audio/problems")
    output_dir.mkdir(parents=True, exist_ok=True)

    sample_rate = 44100
    duration = 2.0

    # Mains hum (50Hz and 60Hz)
    clean_signal = create_sine_wave(440, duration, sample_rate)
    hum_50hz = add_hum(clean_signal, 50.0, sample_rate, 0.2)
    wavfile.write(output_dir / "mains_hum_50hz.wav", sample_rate, hum_50hz.astype(np.float32))

    hum_60hz = add_hum(clean_signal, 60.0, sample_rate, 0.2)
    wavfile.write(output_dir / "mains_hum_60hz.wav", sample_rate, hum_60hz.astype(np.float32))

    # Digital clipping
    loud_signal = create_sine_wave(440, duration, sample_rate, 2.0)  # Exceeds normal range
    clipped_signal = apply_clipping(loud_signal, 0.9)
    wavfile.write(output_dir / "digital_clipping.wav", sample_rate, clipped_signal.astype(np.float32))

    # DC offset
    dc_offset_signal = add_dc_offset(clean_signal, 0.15)
    wavfile.write(output_dir / "dc_offset.wav", sample_rate, dc_offset_signal.astype(np.float32))

    # Clicks and pops
    clicky_signal = clean_signal.copy()
    num_clicks = 20
    click_positions = np.random.randint(0, len(clicky_signal), num_clicks)
    click_amplitude = 0.8

    for pos in click_positions:
        clicky_signal[pos] += click_amplitude if np.random.random() > 0.5 else -click_amplitude

    wavfile.write(output_dir / "clicks_and_pops.wav", sample_rate, clicky_signal.astype(np.float32))

def main():
    """Generate all test audio samples"""
    print("🎵 Generating audio analysis test samples...")
    print("=" * 50)

    try:
        generate_spectral_test_samples()
        generate_pitch_test_samples()
        generate_dynamics_test_samples()
        generate_spatial_test_samples()
        generate_problem_test_samples()

        print("\n" + "=" * 50)
        print("✅ All test audio samples generated successfully!")
        print("Test files are ready in test_data/audio/")

    except Exception as e:
        print(f"\n❌ Error generating test samples: {e}")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())