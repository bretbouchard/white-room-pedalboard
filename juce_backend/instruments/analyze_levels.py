import numpy as np

# Audio levels from our tests
synths = {
    'LocalGal': {'mean': 0.0, 'max': 0.0, 'master_vol': 1.0},
    'KaneMarco': {'mean': -20.4, 'max': -13.7, 'master_vol': 0.8},
    'KaneMarcoAether': {'mean': -34.1, 'max': -11.5, 'master_vol': 0.7},
    'DrumMachine': {'mean': -47.5, 'max': -14.7, 'master_vol': 0.8},
    'NexSynth': {'mean': -9.7, 'max': -6.6, 'master_vol': 0.7},
    'SamSampler': {'mean': -12.8, 'max': -5.0, 'master_vol': 0.7},
}

print("Synth Level Analysis:")
print("=" * 60)
print(f"{'Synth':<20} {'Mean':>10} {'Max':>10} {'MasterVol':>10} {'Notes':>30}")
print("-" * 60)

for name, data in synths.items():
    # Calculate linear amplitude from dB
    mean_linear = 10 ** (data['mean'] / 20) if data['mean'] > -90 else 0
    max_linear = 10 ** (data['max'] / 20) if data['max'] > -90 else 0
    
    # Normalize to master volume
    normalized_mean = mean_linear / data['master_vol']
    normalized_max = max_linear / data['master_vol']
    
    notes = ""
    if data['mean'] >= 0:
        notes = "⚠️  CLIPPING!"
    elif data['mean'] < -30:
        notes = "⚠️  Very quiet"
    
    print(f"{name:<20} {data['mean']:>10.1f} {data['max']:>10.1f} {data['master_vol']:>10.1f} {notes:<30}")

print("\nKey findings:")
print("-" * 60)
print(f"Range: {synths['LocalGal']['mean'] - synths['DrumMachine']['mean']:.1f} dB (47.5 dB variation)")
print("\nEven after normalizing to master volume, there's significant variation.")
print("This suggests differences in:")
print("  • Voice architecture (oscillator levels, mixing)")
print("  • Envelope settings (ADSR)")
print("  • Filter settings (cutoff, resonance)")
print("  • Note velocity response")
