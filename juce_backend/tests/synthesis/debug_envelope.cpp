#include <iostream>
#include <vector>
#include "src/synthesis/NexSynthEngine_Simple.h"

using namespace JuceBackend::NexSynth;

int main() {
    auto engine = std::make_unique<NexSynthEngine>();
    engine->prepareToPlay(44100.0, 512);
    
    Operator op;
    op.envelope.delay = 0.0f;
    op.envelope.attack = 0.5f;
    op.envelope.hold = 0.0f;
    op.envelope.decay = 0.1f;
    op.envelope.sustain = 0.7f;
    op.envelope.release = 0.2f;
    op.envelope.attackCurve = 0.0f;
    op.envelope.decayCurve = 0.0f;
    op.envelope.releaseCurve = 0.0f;
    op.envelope.loopMode = OperatorState::Envelope::OneShot;
    
    std::cout << "Testing envelope generation:\n";
    
    // Test attack phase
    for (int i = 0; i < 10; ++i) {
        double time = static_cast<double>(i) / 44100.0;
        float envelope = engine->generateEnvelope(op.envelope, time, 44100.0, true, 0.0);
        std::cout << "Time " << time << ": " << envelope << "\n";
    }
    
    // Test sustain phase
    double sustainTime = 0.5 + 0.1 + 0.1; // Attack + Decay + some time
    float sustainEnvelope = engine->generateEnvelope(op.envelope, sustainTime, 44100.0, true, 0.0);
    std::cout << "Sustain time " << sustainTime << ": " << sustainEnvelope << "\n";
    
    // Test release phase
    double releaseTime = 0.5 + 0.1 + 1.0; // Attack + Decay + 1 sec sustain
    float releaseEnvelope = engine->generateEnvelope(op.envelope, releaseTime + 0.1, 44100.0, false, 0.0);
    std::cout << "Release time " << (releaseTime + 0.1) << ": " << releaseEnvelope << "\n";
    
    return 0;
}
