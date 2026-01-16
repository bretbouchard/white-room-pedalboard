# Stereo Processing Quick Reference

## Stereo Processor API

### Include
```cpp
#include "include/dsp/StereoProcessor.h"
using namespace DSP;
```

### Basic Usage

```cpp
// Create stereo processor
StereoProcessor processor;
processor.prepare(sampleRate);

// Configure
processor.width = 0.7f;              // Stereo width (0-1)
processor.detune = 0.02f;            // Detune in semitones
processor.filterOffset = 0.1f;       // Filter offset (0-1)
processor.oddEvenSeparation = true;  // Enable MI-style separation

// Process stereo sample
float left = 0.5f;
float right = 0.5f;
processor.process(left, right);
```

## Individual Components

### StereoWidth
```cpp
// Apply width to stereo sample
float left, right;
StereoWidth::processWidth(left, right, 0.7f);

// Preserve mono compatibility
StereoWidth::processWidthPreserveMono(left, right, 0.5f);
```

### OddEvenSeparation
```cpp
// Check if mode belongs in channel
bool inLeft = OddEvenSeparation::isLeftChannel(modeIndex, enabled);
bool inRight = OddEvenSeparation::isRightChannel(modeIndex, enabled);

// Apply separation to mode output
float left = 0.0f, right = 0.0f;
OddEvenSeparation::applySeparation(modeIndex, enabled, modeOutput,
                                   left, right, width);
```

### StereoDetune
```cpp
// Get detuned frequency for channel
double leftFreq = StereoDetune::applyDetune(baseFreq, detuneSemitones, 0);
double rightFreq = StereoDetune::applyDetune(baseFreq, detuneSemitones, 1);
```

### StereoFilterOffset
```cpp
// Calculate filter cutoff for channel
double leftCutoff = StereoFilterOffset::calculateCutoff(
    baseCutoff, offsetAmount, channel, sampleRate);

// Or use normalized value
float leftNorm = StereoFilterOffset::calculateNormalizedCutoff(
    baseNorm, offsetAmount, channel);
```

## Instrument-Specific Patterns

### Multi-Oscillator Synth (LocalGal)
```cpp
// Render left channel
float leftSample = voice.renderSampleStereo(0, detune, filterOffset);

// Render right channel
float rightSample = voice.renderSampleStereo(1, detune, filterOffset);

// Apply width
StereoWidth::processWidth(leftSample, rightSample, width);
```

### FM Synth with Operators (Nex)
```cpp
// Process operators with odd/even separation
for (size_t op = 0; op < numOperators; ++op) {
    float opOutput = processOperator(op);

    if (oddEvenEnabled) {
        OddEvenSeparation::applySeparation(op, true, opOutput,
                                           left, right, width);
    } else {
        left += opOutput;
        right += opOutput;
    }
}
```

### Modal/P Physical Modeling (Giant)
```cpp
// Process resonant modes with stereo separation
for (size_t mode = 0; mode < numModes; ++mode) {
    float modeOutput = modes[mode].process();

    if (oddEvenSeparation) {
        // Even modes → Left, Odd → Right
        OddEvenSeparation::applySeparation(mode, true, modeOutput,
                                           left, right, width);
    } else {
        left += modeOutput;
        right += modeOutput;
    }
}
```

### Drum Machine with Panning
```cpp
// Constant power panning
float panAngle = (pan + 1.0f) * 0.5f * M_PI * 0.5f;
float leftGain = std::cos(panAngle) * volume;
float rightGain = std::sin(panAngle) * volume;

// Output to channels
outputs[0][i] += drumSample * leftGain;
outputs[1][i] += drumSample * rightGain;
```

### Sampler with Position Offset
```cpp
// Calculate position offset
double leftPos = playPosition - positionOffset * 0.5;
double rightPos = playPosition + positionOffset * 0.5;

// Interpolate samples
float leftSample = interpolate(leftPos);
float rightSample = interpolate(rightPos);
```

## Parameter Ranges

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `stereoWidth` | 0.0 - 1.0 | 0.5 | Stereo image width |
| `stereoDetune` | 0.0 - 0.1 | 0.02 | Detune in semitones |
| `stereoFilterOffset` | 0.0 - 1.0 | 0.1 | Filter offset (normalized) |
| `stereoPositionOffset` | 0.0 - 1.0 | 0.0 | Sample position offset |
| `stereoOperatorDetune` | 0.0 - 0.1 | 0.02 | FM operator detune |
| `stereoModeOffset` | 0.0 - 0.1 | 0.02 | Mode frequency offset |
| `roomWidth` | 0.0 - 1.0 | 0.3 | Room reverb width |
| `effectsWidth` | 0.0 - 1.0 | 0.7 | Effects returns width |

## Preset Configurations

### Narrow/Mono
```cpp
width = 0.0f;
detune = 0.0f;
oddEvenSeparation = false;
```

### Default/Balanced
```cpp
width = 0.5f;
detune = 0.02f;
oddEvenSeparation = true;
```

### Wide/Spacious
```cpp
width = 0.8f;
detune = 0.05f;
oddEvenSeparation = true;
```

### Extreme/Experimental
```cpp
width = 1.0f;
detune = 0.1f;
oddEvenSeparation = true;
filterOffset = 0.3f;
```

## Testing

### Run Stereo Tests
```bash
cd instruments/tests
clang++ -std=c++17 -I../.. -I../../include \
    StereoProcessingTests.cpp -o stereo_tests
./stereo_tests
```

### Verify Mono Compatibility
```cpp
float left = 0.7f, right = 0.3f;
float originalSum = left + right;

StereoWidth::processWidth(left, right, 0.7f);

float newSum = left + right;
assert(approximatelyEqual(newSum, originalSum));
```

## Performance Tips

1. **Cache Width Calculations**: Pre-calculate stereo gains outside audio loop
2. **Use SIMD**: Stereo processing is vectorizable
3. **Minimize Branching**: Use conditional moves for odd/even checks
4. **Batch Processing**: Process multiple samples at once when possible

## Common Patterns

### Enable Stereo in Constructor
```cpp
MyInstrument::MyInstrument() {
    // Default stereo parameters
    params_.stereoWidth = 0.5f;
    params_.stereoDetune = 0.02f;
    params_.oddEvenSeparation = true;
}
```

### Parameter Smoothing
```cpp
void updateStereoParameters() {
    // Smooth width changes
    smoothedWidth_ += (params_.stereoWidth - smoothedWidth_) * 0.1f;

    // Smooth detune
    smoothedDetune_ += (params_.stereoDetune - smoothedDetune_) * 0.01f;
}
```

### Mono Compatibility Check
```cpp
void processStereo(float& left, float& right) {
    float mono = (left + right) * 0.5f;

    // Apply stereo processing
    StereoWidth::processWidth(left, right, width);

    // Preserve mono sum
    float currentMono = (left + right) * 0.5f;
    left += (mono - currentMono);
    right += (mono - currentMono);
}
```

## Troubleshooting

### Issue: Mono Sum Not Preserved
**Solution**: Use `processWidthPreserveMono()` or manually preserve sum

### Issue: Phase Cancellation
**Solution**: Reduce width or detune amount, check for inverted polarity

### Issue: Too Wide/Unnatural
**Solution**: Reduce width to 0.5-0.7, reduce detune to 0.01-0.03

### Issue: CPU Too High
**Solution**: Disable odd/even separation, reduce filter complexity

## Further Reading

- Mutable Instruments Rings documentation
- Mutable Instruments Elements documentation
- Mid-side processing techniques
- Stereo widening algorithms
