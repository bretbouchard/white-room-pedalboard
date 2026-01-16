# Calculate gain adjustments to normalize all synths to -6 dB

synths = [
    ('LocalGal', 0.0),
    ('KaneMarco', -20.4),
    ('KaneMarcoAether', -34.1),
    ('DrumMachine', -47.5),
    ('NexSynth', -9.7),
    ('SamSampler', -12.8),
]

target_db = -6.0

print("Gain Adjustments to Reach -6 dB:")
print("=" * 70)
print(f"{'Synth':<20} {'Current':>10} {'Target':>10} {'dB Diff':>10} {'Linear Gain':>15} {'Action':>20}")
print("-" * 70)

for name, current_db in synths:
    db_diff = target_db - current_db
    linear_gain = 10 ** (db_diff / 20)
    
    if abs(db_diff) < 0.1:
        action = "No change"
    elif db_diff < 0:
        action = f"Reduce masterVol to {linear_gain:.2f}"
    else:
        if linear_gain > 10:
            action = f"⚠️  Large boost! ({linear_gain:.1f}x)"
        else:
            action = f"Increase to {linear_gain:.2f}x"
    
    print(f"{name:<20} {current_db:>10.1f} {target_db:>10.1f} {db_diff:>10.1f} {linear_gain:>15.2f} {action:<20}")

print("\n⚠️  Warning: Large gains (>10x) may indicate:")
print("   - Very low oscillator levels")
print("   - Poor voice mixing/summing")
print("   - Filter attenuation issues")
print("   - Need synth architecture review, not just volume boost")
