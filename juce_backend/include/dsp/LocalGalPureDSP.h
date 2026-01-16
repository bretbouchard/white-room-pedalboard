/*
  ==============================================================================

    LocalGalPureDSP.h - Compatibility Header

    This file points to the pure DSP implementation located at:
    instruments/localgal/include/dsp/LocalGalPureDSP.h

    The new implementation:
    - Inherits from DSP::InstrumentDSP (no JUCE dependencies)
    - Factory-creatable for dynamic instantiation
    - Headless (no GUI components)
    - JSON preset save/load system
    - Feel Vector control system

    NOTE: The OLD JUCE-based implementation has been moved to preserve
    history but is no longer the primary implementation.

  ==============================================================================
*/

#pragma once

// Include the pure DSP implementation
#include "../../instruments/localgal/include/dsp/LocalGalPureDSP.h"

// Type alias for backward compatibility
namespace DSP {
using LocalGal = LocalGalPureDSP;
}

// Legacy JUCE-based implementation (DEPRECATED - kept for reference)
// The old juce::AudioProcessor-based implementation can be found in the git history
// if needed for migration purposes.
