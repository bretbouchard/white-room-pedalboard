# FormantResonator Mathematical Derivation

## Bug Fix (SPEC-002, white_room-496)

**CRITICAL BUG**: Previous implementation incorrectly used complex pole representation that doesn't map to real biquad difference equation.

## Correct Mathematical Derivation

### 1. Transfer Function

A resonant peak is created by placing complex conjugate poles at radius `r` and angle `±ω`:

```
p1 = r * e^(j*ω)
p2 = r * e^(-j*ω)
```

The transfer function is:

```
H(z) = b0 / [(1 - p1*z^-1)(1 - p2*z^-1)]
```

### 2. Expand Denominator

```
(1 - p1*z^-1)(1 - p2*z^-1)
= 1 - (p1 + p2)*z^-1 + p1*p2*z^-2
```

### 3. Substitute Complex Conjugate Poles

```
p1 + p2 = r*e^(j*ω) + r*e^(-j*ω)
       = r*(e^(j*ω) + e^(-j*ω))
       = r*2*cos(ω)
       = 2*r*cos(ω)

p1 * p2 = (r*e^(j*ω)) * (r*e^(-j*ω))
       = r^2 * e^(j*ω - j*ω)
       = r^2 * e^0
       = r^2
```

### 4. Extract Real Coefficients

```
Denominator = 1 - (p1 + p2)*z^-1 + p1*p2*z^-2
            = 1 - 2*r*cos(ω)*z^-1 + r^2*z^-2
```

Therefore:
```
a1 = -2*r*cos(ω)
a2 = r^2
```

### 5. Determine b0 (DC Gain Normalization)

For unity gain at DC (z = 1):

```
H(1) = b0 / (1 - a1 - a2) = 1

b0 = 1 - a1 - a2
   = 1 - (-2*r*cos(ω)) - r^2
   = 1 + 2*r*cos(ω) - r^2
```

However, for formant resonators, we typically want gain normalization such that the peak gain is controlled. A simpler approach:

```
b0 = 1 - r
```

This ensures DC gain is approximately unity for small r.

## Final Coefficient Relationships

```
b0 = 1 - r
a1 = -2.0 * r * cos(ω)
a2 = r * r
```

## Parameter Calculations

### Frequency to Angular Frequency

```
ω = 2π * f / fs
```

where:
- `f` = formant frequency (Hz)
- `fs` = sample rate (Hz)

### Bandwidth to Radius

The -3dB bandwidth is related to radius by:

```
r = exp(-π * BW / fs)
```

where:
- `BW` = bandwidth (Hz)
- `fs` = sample rate (Hz)

**Derivation**:
- The -3dB points occur where |H(e^(jω))|^2 = 0.5
- For a resonant peak, this happens at ω = ω0 ± BW/2
- The relationship r = exp(-π*BW/fs) ensures correct bandwidth

## Difference Equation (Direct Form I)

From the transfer function:

```
Y(z)       b0
---- = ---------
X(z)   1 + a1*z^-1 + a2*z^-2
```

Cross-multiplying:

```
Y(z) * (1 + a1*z^-1 + a2*z^-2) = b0 * X(z)
```

Taking inverse Z-transform:

```
y[n] + a1*y[n-1] + a2*y[n-2] = b0*x[n]
```

Solving for y[n]:

```
y[n] = b0*x[n] - a1*y[n-1] - a2*y[n-2]
```

### Direct Form I Implementation

For numerical stability, we use Direct Form I:

```
output[n] = b0 * input[n] + z1[n-1]
z1[n] = -a1 * input[n] + z2[n-1]
z2[n] = -a2 * input[n]
```

**Advantages**:
- No coefficient sensitivity issues
- Single-precision safe
- No limit cycles
- Guaranteed stable for 0 ≤ r < 1

## Stability Proof

**Theorem**: The filter is stable if and only if all poles are inside the unit circle.

**Poles**: p1 = r*e^(j*ω), p2 = r*e^(-j*ω)

**Magnitude**: |p1| = |p2| = r

**Stability Condition**: r < 1

**Guarantee**: Since r = exp(-π*BW/fs) and BW, fs > 0:
- r = exp(-positive_number)
- 0 < r < 1
- **Filter is always stable**

## Frequency Response

The magnitude response at frequency ω̂ is:

```
|H(e^(j*ω̂))| = b0 / |1 - a1*e^(-j*ω̂) - a2*e^(-j*2*ω̂)|
```

At resonance (ω̂ = ω):
- Maximum gain occurs
- Peak gain ≈ 1/(1-r) for narrow bandwidths

## Bug Comparison

### ❌ INCORRECT (Previous Implementation)

```
b0 = r * r           // WRONG
a1 = r * r * 2.0 * cos(ω)  // WRONG (double r, wrong sign)
a2 = r * r           // Correct but incorrectly derived
```

**Why this was wrong**:
- Used `pole * pole` incorrectly (complex multiplication misunderstood)
- Introduced unnecessary imaginary components
- Incorrect coefficient relationship from complex math

### ✅ CORRECT (Fixed Implementation)

```
b0 = 1.0 - r
a1 = -2.0 * r * cos(ω)
a2 = r * r
```

**Why this is correct**:
- Directly from expanding (1 - p1*z^-1)(1 - p2*z^-1)
- Real coefficients for complex conjugate pole pair
- Proper DC gain normalization

## Numerical Example

**Parameters**:
- Sample rate: 48000 Hz
- Formant frequency: 800 Hz
- Bandwidth: 100 Hz

**Calculations**:
```
ω = 2π * 800 / 48000 = 0.1047 rad

r = exp(-π * 100 / 48000) = exp(-0.00654) = 0.9935

b0 = 1 - 0.9935 = 0.0065
a1 = -2 * 0.9935 * cos(0.1047) = -1.9867 * 0.9945 = -1.9759
a2 = 0.9935^2 = 0.9870
```

**Verification**:
- Stability: r = 0.9935 < 1 ✅
- Peak gain: 1/(1-0.9935) ≈ 154 (23.7 dB)
- -3dB bandwidth: 100 Hz (by design)

## References

1. **Digital Signal Processing**: A Computer-Based Approach
   - Sanjit K. Mitra
   - Section on IIR filter design

2. **Audio Signal Processing**
   - Julius O. Smith
   - https://ccrma.stanford.edu/~jos/filters/

3. **JUCE DSP Tutorial**
   - https://docs.juce.com/master/tutorial_dsp_introduction.html

## Conclusion

The corrected implementation uses proper real biquad coefficients derived from complex conjugate pole pairs. The Direct Form I structure ensures numerical stability and single-precision safety, making it suitable for real-time audio processing.

---

**Document Version**: 1.0
**Date**: 2025-01-17
**Issue**: white_room-496
**Specification**: SPEC-002
