#include "../../include/dsp/InstrumentDSP.h"
#include <iostream>

int main() {
    std::cout << "Checking if NexSynth is registered...\n";
    bool isReg = DSP::isInstrumentRegistered("NexSynth");
    std::cout << "NexSynth registered: " << (isReg ? "YES" : "NO") << "\n";
    
    int count = DSP::getRegisteredInstrumentCount();
    std::cout << "Total instruments: " << count << "\n";
    
    char names[256];
    DSP::getAllRegisteredInstrumentNames(names, sizeof(names));
    std::cout << "Instruments: " << names << "\n";
    
    return 0;
}
