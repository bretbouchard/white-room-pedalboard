/*
  ==============================================================================

    TestLocalGalSimple.cpp
    Simple test for LOCAL_GAL basic functionality

  ==============================================================================
*/

#include <memory>
#include <cstdio>
#include <cmath>

#include "LocalGalPureDSP.h"

using namespace DSP;

int main() {
    printf("Testing LocalGal Basic Functionality\n");
    printf("====================================\n\n");

    const double sampleRate = 48000.0;
    const int blockSize = 256;

    // Create instrument
    auto inst = std::make_unique<LocalGalPureDSP>();

    printf("1. Creating instrument... ");

    if (!inst->prepare(sampleRate, blockSize)) {
        printf("FAIL: prepare() returned false\n");
        return 1;
    }

    printf("OK\n");

    // Set sawtooth waveform
    printf("2. Setting waveform... ");
    inst->setParameter("osc_waveform", 1.0f);  // Sawtooth
    printf("OK\n");

    // Allocate buffers
    printf("3. Allocating buffers... ");
    std::vector<float> left(blockSize);
    std::vector<float> right(blockSize);
    printf("OK\n");

    // Note on
    printf("4. Sending note on event... ");
    ScheduledEvent noteOnEvent;
    noteOnEvent.type = ScheduledEvent::NOTE_ON;
    noteOnEvent.data.note.midiNote = 60;
    noteOnEvent.data.note.velocity = 0.8f;
    inst->handleEvent(noteOnEvent);
    printf("OK\n");

    // Process audio
    printf("5. Processing audio block... ");
    float* outputs[2];
    outputs[0] = left.data();
    outputs[1] = right.data();
    inst->process(outputs, 2, blockSize);
    printf("OK\n");

    // Check output
    printf("6. Checking output... ");
    double sum = 0.0;
    double peak = 0.0;
    for (int i = 0; i < blockSize; ++i) {
        sum += std::abs(left[i]);
        if (std::abs(left[i]) > peak) peak = std::abs(left[i]);
    }

    printf("sum=%.6f, peak=%.6f\n", sum, peak);

    if (peak < 0.001) {
        printf("FAIL: No audio output\n");
        return 1;
    }

    printf("\n✅ All basic tests PASSED\n");
    return 0;
}
