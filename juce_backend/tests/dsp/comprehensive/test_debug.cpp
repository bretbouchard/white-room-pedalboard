#include "../instruments/kane_marco/include/dsp/KaneMarcoPureDSP.h"
#include <iostream>

using namespace DSP;

int main() {
    std::cout << "Creating synth..." << std::endl;
    KaneMarcoPureDSP synth;
    
    std::cout << "Preparing synth..." << std::endl;
    bool prepared = synth.prepare(48000.0, 512);
    std::cout << "Prepared: " << (prepared ? "yes" : "no") << std::endl;
    
    std::cout << "Setting parameter..." << std::endl;
    synth.setParameter("osc1Shape", 0.5f);
    std::cout << "Parameter set" << std::endl;
    
    std::cout << "Sending note on..." << std::endl;
    ScheduledEvent noteOn;
    noteOn.type = ScheduledEvent::NOTE_ON;
    noteOn.time = 0.0;
    noteOn.sampleOffset = 0;
    noteOn.data.note.midiNote = 60;
    noteOn.data.note.velocity = 0.8f;
    synth.handleEvent(noteOn);
    std::cout << "Note on sent" << std::endl;
    
    std::cout << "Processing audio..." << std::endl;
    std::vector<float> left(512);
    std::vector<float> right(512);
    float* outputs[] = { left.data(), right.data() };
    synth.process(outputs, 2, 512);
    std::cout << "Audio processed" << std::endl;
    
    return 0;
}
