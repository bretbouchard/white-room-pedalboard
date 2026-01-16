# IEEE 754 Arithmetic Specification for Schillinger SDK

**Version**: 1.0
**Date**: 2025-01-09
**Status**: Foundation Specification

## Overview

This document specifies the arithmetic behavior requirements for the Schillinger SDK to ensure cross-platform determinism. All implementations (TypeScript, Dart, C++) must adhere to these specifications to guarantee identical numerical results across platforms.

## Core Assumptions

### Floating-Point Precision
- **Standard**: IEEE 754-2008 (binary64)
- **Format**: Double-precision floating-point (64-bit)
- **Precision**: 53 significant bits (approximately 15-17 decimal digits)
- **Exponent range**: ±1022
- **Special values**: Supports ±Infinity, NaN (Not-a-Number), ±0

### Numeric Representation
```
Sign bit:     1 bit
Exponent:    11 bits (biased by 1023)
Significand: 52 bits (implicit leading 1 for normalized numbers)
```

## Supported Operations

### Basic Arithmetic
All implementations MUST support these operations with IEEE 754 semantics:

1. **Addition** (`a + b`)
2. **Subtraction** (`a - b`)
3. **Multiplication** (`a * b`)
4. **Division** (`a / b`)
5. **Modulo/Remainder** (`a % b`)
6. **Square Root** (`Math.sqrt(a)`)

### Comparison Operations
1. **Less than** (`a < b`)
2. **Less than or equal** (`a <= b`)
3. **Greater than** (`a > b`)
4. **Greater than or equal** (`a >= b`)
5. **Equal** (`a === b`)
6. **Not equal** (`a !== b`)

### Mathematical Functions (Platform-Specific)
The following functions have well-defined IEEE 754 behavior but MAY vary slightly across platforms due to implementation differences. For maximum determinism, prefer using the PCG PRNG for random number generation.

1. `Math.floor(x)` - Round toward -∞
2. `Math.ceil(x)` - Round toward +∞
3. `Math.round(x)` - Round to nearest integer
4. `Math.abs(x)` - Absolute value
5. `Math.min(a, b)` - Minimum value
6. `Math.max(a, b)` - Maximum value
7. `Math.pow(x, y)` - Exponentiation
8. `Math.exp(x)` - e^x
9. `Math.log(x)` - Natural logarithm
10. `Math.sin(x)`, `Math.cos(x)`, `Math.tan(x)` - Trigonometric functions

## Edge Cases and Special Values

### Zero
- **Positive zero**: `+0.0`
- **Negative zero**: `-0.0`
- **Behavior**: `+0.0 === -0.0` is `true` in most languages, but sign matters for some operations

### Infinity
- **Positive infinity**: `Number.POSITIVE_INFINITY` or `1/0`
- **Negative infinity**: `Number.NEGATIVE_INFINITY` or `-1/0`
- **Arithmetic**: `Infinity + Infinity = Infinity`, `Infinity - Infinity = NaN`

### NaN (Not-a-Number)
- **Generation**: `0/0`, `Infinity - Infinity`, `Math.sqrt(-1)`
- **Properties**: `NaN !== NaN` is always `true`
- **Detection**: Use `Number.isNaN(x)` or `isNaN(x)`

### Subnormal Numbers
- **Definition**: Numbers with exponent = 0 (denormalized)
- **Range**: ±5e-324 to ±2.2e-308
- **Behavior**: Gradual underflow (precision decreases as magnitude decreases)

## Forbidden Operations

To ensure cross-platform determinism, these operations MUST NOT be used in core realization logic:

### 1. Dynamic Code Execution
- **FORBIDDEN**: `eval()`, `Function()`, `new Function()`
- **Reason**: Implementation-dependent behavior, security risk

### 2. Non-Associative Operations
- **CAUTION**: Floating-point addition and multiplication are NOT associative
  - `(a + b) + c !== a + (b + c)` in general
  - `(a * b) * c !== a * (b * c)` in general
- **Guideline**: When reproducibility is critical, operations must be performed in identical order across platforms

### 3. Imprecise Comparisons
- **AVOID**: Direct equality comparison of floating-point results from complex calculations
- **Reason**: Rounding errors may make identical values appear different
- **Alternative**: Use epsilon comparison: `Math.abs(a - b) < epsilon`

### 4. Type Coercion
- **FORBIDDEN**: Implicit type coercion in arithmetic operations
- **Reason**: Platform-specific coercion rules
- **Example**: `[] + 5` or `"5" - 3` (avoid string/number mixing)

## Rounding and Precision

### Default Rounding Mode
- **Mode**: Round to nearest, ties to even (IEEE 754 default)
- **Behavior**: Values exactly halfway between representable values round to the value with an even least-significant bit

### Explicit Rounding Functions
- `Math.floor(x)`: Greatest integer ≤ x
- `Math.ceil(x)`: Least integer ≥ x
- `Math.round(x)`: Nearest integer (ties round toward +∞ for JavaScript compatibility)
- `Math.trunc(x)`: Integer part (remove fractional digits)

### Precision Loss Mitigation
When performing cumulative operations (e.g., summing many values):
1. **Kahan summation** for critical precision requirements
2. **Sorting** values by magnitude before summing
3. **Compensated summation** algorithms for large datasets

## Determinism Requirements

### Cross-Platform Consistency
To ensure identical results across platforms:

1. **Operation Order**: Perform operations in the same sequence
2. **Constant Values**: Use identical literal values (avoid computed constants)
3. **Rounding Mode**: Use default IEEE 754 rounding
4. **Exception Handling**: Ignore or handle consistently (no signaling NaN)

### Test Cases

All implementations MUST pass these determinism tests:

```typescript
// Basic arithmetic
assert(0.1 + 0.2 === 0.30000000000000004);  // IEEE 754 exact value
assert(1.0 / 3.0 === 0.3333333333333333);    // IEEE 754 exact value

// Edge cases
assert(1.0 / 0.0 === Number.POSITIVE_INFINITY);
assert(-1.0 / 0.0 === Number.NEGATIVE_INFINITY);
assert(0.0 / 0.0 !== 0.0 / 0.0);              // NaN !== NaN
assert(Number.isNaN(0.0 / 0.0));               // isNaN check

// Comparison
assert(Number.MAX_VALUE < Number.POSITIVE_INFINITY);
assert(Number.MIN_VALUE > 0);
assert(-Number.MIN_VALUE < 0);

// Rounding
assert(Math.floor(3.7) === 3);
assert(Math.ceil(3.2) === 4);
assert(Math.round(3.5) === 4);  // JavaScript: ties toward +∞
assert(Math.round(-3.5) === -3);
```

## Platform-Specific Notes

### TypeScript/JavaScript
- **Number type**: Always IEEE 754 binary64
- **BigInt**: NOT used for core realization (only for bookkeeping)
- **TypedArrays**: Use `Float64Array` for consistent precision

### Dart
- **double type**: IEEE 754 binary64 (same as JavaScript)
- **int type**: 64-bit integer (not used for core arithmetic)
- **Compatibility**: Matches JavaScript behavior for basic operations

### C++ (JUCE FFI)
- **double type**: IEEE 754 binary64 on supported platforms
- **Verification**: Compile with `-mfpmath=sse` for x86/x64
- **Warning**: x87 FPU (80-bit precision) breaks determinism

## Validation Test Suite

This specification includes a comprehensive test suite with 1000+ test cases covering:

1. **Basic arithmetic** (100 tests)
2. **Edge cases** (Infinity, NaN, ±0) (200 tests)
3. **Rounding modes** (150 tests)
4. **Comparison operations** (150 tests)
5. **Mathematical functions** (200 tests)
6. **Precision loss scenarios** (100 tests)
7. **Subnormal numbers** (50 tests)
8. **Cumulative operations** (50 tests)

**Test execution**: `npm test -- arithmetic-spec`

## Compliance Checklist

Implementations MUST:

- [ ] Use IEEE 754 binary64 for all floating-point operations
- [ ] Produce identical results for basic arithmetic operations
- [ ] Handle special values (Infinity, NaN, ±0) consistently
- [ ] Avoid forbidden operations (eval, non-associative operations)
- [ ] Use deterministic operation ordering
- [ ] Pass all 1000+ validation test cases
- [ ] Document any platform-specific deviations
- [ ] Use explicit rounding where precision matters

## References

- IEEE 754-2008 Standard
- "What Every Computer Scientist Should Know About Floating-Point Arithmetic" - David Goldberg
- JavaScript ECMA-262 Specification (Section 20.2.2: Number Objects)
- Dart Language Specification (Section 11.9: Numbers)

---

**Change Log**:
- 2025-01-09: Initial version (T009)
