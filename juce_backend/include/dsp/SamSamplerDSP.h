/*
  ==============================================================================

    SamSamplerDSP.h - Compatibility Header

    This file now points to the pure DSP implementation located at:
    instruments/Sam_sampler/include/dsp/SamSamplerDSP.h

    The new implementation:
    - Inherits from DSP::InstrumentDSP (no JUCE dependencies)
    - Factory-creatable for dynamic instantiation
    - Headless (no GUI components)
    - JSON preset save/load system

    NOTE: The OLD JUCE-based implementation has been moved to preserve
    history but is no longer the primary implementation.

  ==============================================================================
*/

#pragma once

// Include the pure DSP implementation
#include "../../instruments/Sam_sampler/include/dsp/SamSamplerDSP.h"

// Type alias for backward compatibility
namespace DSP {
using SamSamplerDSP_Pure = SamSamplerDSP;
}

// Legacy JUCE-based implementation (DEPRECATED - kept for reference)
// The old juce::AudioProcessor-based implementation can be found in the git history
// if needed for migration purposes.
