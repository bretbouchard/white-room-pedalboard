#pragma once

// JUCE global header must be included first
// Audio-only modules (no GUI dependencies for iOS)
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_devices/juce_audio_devices.h>
// juce_audio_processors excluded - has hard dependency on juce_gui_basics
#include <juce_data_structures/juce_data_structures.h>
#include <juce_events/juce_events.h>
#include <juce_dsp/juce_dsp.h>
// GUI modules excluded - use platform-agnostic types instead

// Project-wide includes
#include "audio/DropoutPrevention.h"
#include "audio/CPUMonitor.h"
// Note: PluginManager.h requires OpenSSL (not available on iOS)
// Only include on platforms where OpenSSL is available
#if !defined(__IOS__) && !defined(TARGET_OS_IPHONE)
    #include "audio/PluginManager.h"
#endif
// Commented out missing headers
// #include "audio/AudioBufferPool.h"
// #include "audio/PluginInstance.h"
// #include "audio/TrackAudioProcessor.h"
// #include "core/ArrangementManager.h"
// #include "core/Song.h"
// #include "temporal/Timeline.h"