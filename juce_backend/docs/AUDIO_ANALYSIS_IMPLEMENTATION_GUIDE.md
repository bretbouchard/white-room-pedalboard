# Audio Analysis Implementation Guide for Parallel Subagents

## Quick Start Implementation

This guide provides concrete implementation steps for each parallel subagent to begin the TDD process immediately.

## Immediate Actions for All Subagents

### 1. Environment Setup (Common)

```bash
# Create analysis working directory
mkdir -p src/analysis tests/analysis test_data/audio

# Add to CMakeLists.txt
add_subdirectory(src/analysis)
add_subdirectory(tests/analysis)

# Common test data setup
mkdir -p test_data/audio/{spectral,pitch,dynamics,spatial,problems}
```

### 2. Base Interface Definition

Create `include/audio/BaseAnalyzer.h`:

```cpp
#pragma once
#include <JuceHeader.h>

class BaseAnalyzer {
public:
    virtual ~BaseAnalyzer() = default;

    // Initialize analyzer with sample rate and buffer size
    virtual bool initialize(double sampleRate, int bufferSize) = 0;

    // Process audio buffer and generate analysis results
    virtual void processBlock(juce::AudioBuffer<float>& buffer) = 0;

    // Get latest analysis results as JSON
    virtual juce::String getResultsAsJson() const = 0;

    // Check if analyzer is ready for real-time processing
    virtual bool isReady() const = 0;

    // Reset internal state
    virtual void reset() = 0;
};
```

## Subagent 1: Core DSP Analysis (Immediate Implementation)

### Day 1: RED Phase Tests

Create `tests/audio/CoreDSPAnalyzerTests.cpp`:

```cpp
#include "include/audio/CoreDSPAnalyzer.h"
#include <JuceHeader.h>

class CoreDSPAnalyzerTests : public juce::UnitTest {
public:
    CoreDSPAnalyzerTests() : UnitTest("Core DSP Analyzer Tests") {}

    void runTest() override {
        beginTest("FFT Initialization");
        {
            CoreDSPAnalyzer analyzer;
            expect(analyzer.initialize(44100.0, 512), "Failed to initialize");
            expect(analyzer.isReady(), "Analyzer not ready after init");
        }

        beginTest("Spectral Analysis Accuracy");
        {
            // Test with known sine wave
            juce::AudioBuffer<float> buffer(1, 512);
            generateSineWave(buffer, 440.0f, 44100.0);

            CoreDSPAnalyzer analyzer;
            analyzer.initialize(44100.0, 512);
            analyzer.processBlock(buffer);

            auto results = analyzer.getResultsAsJson();
            // Verify spectral centroid is near 440Hz
            expectResultsContainFrequency(results, 440.0f, 10.0f);
        }

        beginTest("Real-time Performance");
        {
            // Performance test - should complete in < 2ms
            auto start = std::chrono::high_resolution_clock::now();

            CoreDSPAnalyzer analyzer;
            analyzer.initialize(44100.0, 512);

            juce::AudioBuffer<float> buffer(2, 512);
            fillBufferWithNoise(buffer);

            analyzer.processBlock(buffer);

            auto end = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
            expectLessThan(duration.count(), 2000, "Analysis took too long");
        }
    }

private:
    void generateSineWave(juce::AudioBuffer<float>& buffer, float frequency, double sampleRate) {
        for (int sample = 0; sample < buffer.getNumSamples(); ++sample) {
            float value = std::sin(2.0f * juce::MathConstants<float>::pi * frequency * sample / sampleRate);
            buffer.setSample(0, sample, value);
        }
    }

    void fillBufferWithNoise(juce::AudioBuffer<float>& buffer) {
        juce::Random random;
        for (int channel = 0; channel < buffer.getNumChannels(); ++channel) {
            for (int sample = 0; sample < buffer.getNumSamples(); ++sample) {
                buffer.setSample(channel, sample, random.nextFloat() * 2.0f - 1.0f);
            }
        }
    }

    void expectResultsContainFrequency(const juce::String& json, float expectedFreq, float tolerance) {
        // Parse JSON and verify frequency content
        // Implementation depends on JSON library choice
    }
};

static CoreDSPAnalyzerTests coreDSPAnalyzerTests;
```

### Day 1: GREEN Phase Implementation

Create `include/audio/CoreDSPAnalyzer.h`:

```cpp
#pragma once
#include "BaseAnalyzer.h"

class CoreDSPAnalyzer : public BaseAnalyzer {
public:
    struct SpectralResults {
        float spectralCentroid;
        float spectralFlux;
        float spectralFlatness;
        float spectralRolloff;
        std::vector<float> bandEnergies;
    };

    bool initialize(double sampleRate, int bufferSize) override;
    void processBlock(juce::AudioBuffer<float>& buffer) override;
    juce::String getResultsAsJson() const override;
    bool isReady() const override { return initialized; }
    void reset() override;

private:
    void performFFT(juce::AudioBuffer<float>& buffer);
    void calculateSpectralDescriptors();

    double sampleRate = 44100.0;
    int bufferSize = 512;
    bool initialized = false;

    std::unique_ptr<juce::dsp::FFT> fft;
    std::vector<float> fftData;
    std::vector<float> magnitudeSpectrum;
    SpectralResults lastResults;
};
```

Create minimal `src/audio/CoreDSPAnalyzer.cpp`:

```cpp
#include "include/audio/CoreDSPAnalyzer.h"

bool CoreDSPAnalyzer::initialize(double sampleRate, int bufferSize) {
    this->sampleRate = sampleRate;
    this->bufferSize = bufferSize;

    // Initialize FFT
    fft = std::make_unique<juce::dsp::FFT>(juce::roundToInt(std::log2(bufferSize)));
    fftData.resize(bufferSize * 2, 0.0f);
    magnitudeSpectrum.resize(bufferSize / 2 + 1, 0.0f);

    initialized = true;
    return true;
}

void CoreDSPAnalyzer::processBlock(juce::AudioBuffer<float>& buffer) {
    if (!initialized) return;

    // Convert to mono for analysis
    juce::AudioBuffer<float> monoBuffer(1, bufferSize);
    monoBuffer.copyFrom(0, 0, buffer, 0, 0, bufferSize);

    performFFT(monoBuffer);
    calculateSpectralDescriptors();
}

void CoreDSPAnalyzer::performFFT(juce::AudioBuffer<float>& buffer) {
    // Copy buffer to FFT data
    std::fill(fftData.begin(), fftData.end(), 0.0f);
    for (int i = 0; i < bufferSize; ++i) {
        fftData[i] = buffer.getSample(0, i);
    }

    // Apply window function
    for (int i = 0; i < bufferSize; ++i) {
        float window = 0.5f * (1.0f - std::cos(2.0f * juce::MathConstants<float>::pi * i / (bufferSize - 1)));
        fftData[i] *= window;
    }

    // Perform FFT
    fft->performRealOnlyForwardTransform(fftData.data());

    // Calculate magnitude spectrum
    for (int i = 0; i <= bufferSize / 2; ++i) {
        float real = fftData[i];
        float imag = (i == 0 || i == bufferSize / 2) ? 0.0f : fftData[bufferSize - i];
        magnitudeSpectrum[i] = std::sqrt(real * real + imag * imag);
    }
}

void CoreDSPAnalyzer::calculateSpectralDescriptors() {
    // Calculate spectral centroid
    float weightedSum = 0.0f;
    float magnitudeSum = 0.0f;

    for (int i = 1; i < magnitudeSpectrum.size(); ++i) {
        float frequency = i * sampleRate / bufferSize;
        weightedSum += frequency * magnitudeSpectrum[i];
        magnitudeSum += magnitudeSpectrum[i];
    }

    lastResults.spectralCentroid = (magnitudeSum > 0) ? weightedSum / magnitudeSum : 0.0f;
}

juce::String CoreDSPAnalyzer::getResultsAsJson() const {
    juce::DynamicObject::Ptr json = new juce::DynamicObject();

    json->setProperty("type", "core_analysis");
    json->setProperty("spectralCentroid", lastResults.spectralCentroid);
    json->setProperty("timestamp", juce::Time::getCurrentTime().toISO8601(true));

    return juce::JSON::toString(json);
}

void CoreDSPAnalyzer::reset() {
    std::fill(magnitudeSpectrum.begin(), magnitudeSpectrum.end(), 0.0f);
    lastResults = SpectralResults{};
}
```

## Subagent 2: Pitch Detection (Parallel Implementation)

### Day 1: RED Phase Tests

Create `tests/audio/PitchHarmonyTests.cpp`:

```cpp
#include <JuceHeader.h>

class PitchHarmonyTests : public juce::UnitTest {
public:
    PitchHarmonyTests() : UnitTest("Pitch & Harmony Tests") {}

    void runTest() override {
        beginTest("YIN Algorithm Accuracy");
        {
            // Test with A440 sine wave
            auto buffer = createSineWaveBuffer(440.0f, 44100.0, 2048);

            PitchDetector detector;
            detector.initialize(44100.0, 2048);
            detector.processBlock(*buffer);

            auto pitch = detector.getDetectedPitch();
            expectWithinAbsoluteError(pitch.frequency, 440.0f, 2.0f, "Pitch detection inaccurate");
            expect(pitch.confidence > 0.8f, "Low confidence for clean sine wave");
        }

        beginTest("Octave Error Prevention");
        {
            // Test at different octaves
            std::vector<float> testFreqs = {110.0f, 220.0f, 440.0f, 880.0f, 1760.0f};

            for (float freq : testFreqs) {
                auto buffer = createSineWaveBuffer(freq, 44100.0, 2048);

                PitchDetector detector;
                detector.initialize(44100.0, 2048);
                detector.processBlock(*buffer);

                auto pitch = detector.getDetectedPitch();
                float octaveRatio = pitch.frequency / freq;
                expect(octaveRatio >= 0.5f && octaveRatio <= 2.0f,
                       "Octave error detected for frequency: " + juce::String(freq));
            }
        }
    }

private:
    std::unique_ptr<juce::AudioBuffer<float>> createSineWaveBuffer(float frequency, double sampleRate, int numSamples) {
        auto buffer = std::make_unique<juce::AudioBuffer<float>>(1, numSamples);

        for (int i = 0; i < numSamples; ++i) {
            float value = std::sin(2.0f * juce::MathConstants<float>::pi * frequency * i / sampleRate);
            buffer->setSample(0, i, value * 0.7f);
        }

        return buffer;
    }
};

static PitchHarmonyTests pitchHarmonyTests;
```

## Subagent 3: WebSocket Integration (Parallel Implementation)

### Day 1: RED Phase Tests

Create `tests/websocket/AnalysisWebSocketTests.cpp`:

```cpp
#include <JuceHeader.h>

class AnalysisWebSocketTests : public juce::UnitTest {
public:
    AnalysisWebSocketTests() : UnitTest("Analysis WebSocket Tests") {}

    void runTest() override {
        beginTest("Analysis Data Serialization");
        {
            CoreDSPAnalyzer analyzer;
            analyzer.initialize(44100.0, 512);

            // Create test buffer
            juce::AudioBuffer<float> buffer(1, 512);
            fillWithTestSignal(buffer);

            analyzer.processBlock(buffer);
            auto jsonData = analyzer.getResultsAsJson();

            // Verify JSON structure
            expect(jsonData.isNotEmpty(), "Empty JSON result");
            expect(jsonData.contains("\"type\":\"core_analysis\""), "Missing analysis type");
            expect(jsonData.contains("timestamp"), "Missing timestamp");
        }

        beginTest("Real-time Update Performance");
        {
            auto handler = std::make_unique<AnalysisWebSocketHandler>();

            // Simulate rapid updates
            auto start = std::chrono::high_resolution_clock::now();

            for (int i = 0; i < 100; ++i) {
                juce::String testJson = R"({"type":"test","data":)" + juce::String(i) + "}";
                handler->broadcastMessage(testJson);
            }

            auto end = std::chrono::high_resolution_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

            expectLessThan(duration.count(), 100, "WebSocket broadcasting too slow");
        }
    }

private:
    void fillWithTestSignal(juce::AudioBuffer<float>& buffer) {
        juce::Random random;
        for (int sample = 0; sample < buffer.getNumSamples(); ++sample) {
            buffer.setSample(0, sample, random.nextFloat() * 2.0f - 1.0f);
        }
    }
};

static AnalysisWebSocketTests analysisWebSocketTests;
```

## Parallel Development Commands

### Build System Integration

Add to `src/analysis/CMakeLists.txt`:

```cmake
# Core Analysis
add_library(core_analysis STATIC
    CoreDSPAnalyzer.cpp
    PitchDetector.cpp
    DynamicsAnalyzer.cpp
    SpatialAnalyzer.cpp
    QualityDetector.cpp
)

target_include_directories(core_analysis PUBLIC
    ${CMAKE_SOURCE_DIR}/include
    ${JUCE_INCLUDE_DIRS}
)

target_link_libraries(core_analysis
    juce::juce_audio_utils
    juce::juce_dsp
)

# WebSocket Integration
add_library(analysis_websocket STATIC
    ../websocket/AnalysisWebSocketHandler.cpp
)

target_link_libraries(analysis_websocket
    core_analysis
    juce::juce_websocket
)
```

### Test Runner Script

Create `run_parallel_analysis_tests.sh`:

```bash
#!/bin/bash

echo "Running Parallel Audio Analysis Tests"
echo "===================================="

# Build tests
echo "Building analysis tests..."
mkdir -p build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Debug -DBUILD_TESTS=ON
make -j$(nproc) core_analysis_tests

# Run parallel test suites
echo -e "\n=== Core DSP Analysis Tests ==="
./tests/core_analysis_tests

echo -e "\n=== Pitch & Harmony Tests ==="
./tests/pitch_harmony_tests

echo -e "\n=== Dynamics & Loudness Tests ==="
./tests/dynamics_loudness_tests

echo -e "\n=== Spatial Analysis Tests ==="
./tests/spatial_analysis_tests

echo -e "\n=== Quality Detection Tests ==="
./tests/quality_detection_tests

echo -e "\n=== WebSocket Integration Tests ==="
./tests/analysis_websocket_tests

echo -e "\n=== Performance Benchmarks ==="
./tests/analysis_performance_tests

echo -e "\nAll tests completed!"
```

## Daily Workflow for All Subagents

### Morning Standup Template

```bash
# Each subagent reports:
# 1. What tests were written (RED phase)
# 2. What implementation was completed (GREEN phase)
# 3. What refactoring was done (REFACTOR phase)
# 4. Current status and blockers
# 5. Integration requirements
```

### End-of-Day Integration

```bash
# Merge all subagent changes
git checkout -b daily-integration-$(date +%Y%m%d)
git add src/analysis/ tests/analysis/
git commit -m "daily integration: audio analysis progress $(date +%Y-%m-%d)"

# Run integration tests
./run_parallel_analysis_tests.sh
```

## Success Metrics for Each Subagent

### Core DSP Analysis
- ✅ FFT processes 512 samples in < 1ms
- ✅ Spectral centroid accuracy ±10Hz for sine waves
- ✅ All unit tests pass

### Pitch Detection
- ✅ Pitch accuracy ±2Hz for clean signals
- ✅ Confidence > 0.8 for musical signals
- ✅ No octave errors for test frequencies

### WebSocket Integration
- ✅ Message latency < 5ms
- ✅ 100+ messages/second throughput
- ✅ All JSON formats validated

This parallel approach enables all subagents to work simultaneously while maintaining the TDD discipline of RED-GREEN-REFACTOR cycles for each feature.