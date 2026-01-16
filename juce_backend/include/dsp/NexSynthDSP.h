/*
  ==============================================================================

    NexSynthDSP.h - Compatibility Header

    This file now points to the pure DSP implementation located at:
    instruments/Nex_synth/include/dsp/NexSynthDSP.h

    The new implementation:
    - Inherits from DSP::InstrumentDSP (no JUCE dependencies)
    - Factory-creatable for dynamic instantiation
    - Headless (no GUI components)
    - JSON preset save/load system

  ==============================================================================
*/

#pragma once

// Include the pure DSP implementation
#include "../../instruments/Nex_synth/include/dsp/NexSynthDSP.h"

// Type alias for backward compatibility
namespace DSP {
using NexSynthDSP_Pure = NexSynthDSP;
}