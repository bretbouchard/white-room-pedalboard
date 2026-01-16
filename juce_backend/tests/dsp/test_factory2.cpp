#include "../../include/dsp/InstrumentDSP.h"
#include <iostream>

int main() {
    std::cout << "Checking if NexSynth is registered...\n";
    bool isReg = DSP::isInstrumentRegistered("NexSynth");
    std::cout << "NexSynth registered: " << (isReg ? "YES" : "NO") << "\n";
    
    int count = DSP::getRegisteredInstrumentCount();
    std::cout << "Total instruments: " << count << "\n";
    
    if (count > 0) {
        char names[256];
        DSP::getAllRegisteredInstrumentNames(names, sizeof(names));
        std::cout << "Instruments: " << names << "\n";
        
        std::cout << "\nTrying to create NexSynth...\n";
        DSP::InstrumentDSP* synth = DSP::createInstrument("NexSynth");
        if (synth) {
            std::cout << "SUCCESS: Created " << synth->getInstrumentName() << "\n";
            delete synth;
        } else {
            std::cout << "FAILED: createInstrument returned null\n";
        }
    }
    
    return 0;
}
