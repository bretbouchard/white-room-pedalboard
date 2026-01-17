/*
  ==============================================================================

    DSPLogging.h

    Shared logging utilities for all instrument DSP implementations.
    Provides timestamped parameter change logging for debug builds.

    Usage:
      #include "dsp/DSPLogging.h"

      void Instrument::setParameter(const char* paramId, float value) {
          float oldValue = getParameter(paramId);
          // ... parameter handling ...
          LOG_PARAMETER_CHANGE("InstrumentName", paramId, oldValue, value);
      }

  ==============================================================================
*/

#pragma once

#include <chrono>
#include <cstdio>

#ifdef DEBUG

// Enable parameter change logging
#define INSTRUMENT_DSP_LOG_PARAM_CHANGES 1

/// Log a parameter change with timestamp and delta.
///
/// Only logs if the change is significant (delta > 0.001).
/// Automatically filters out noise and redundant updates.
///
/// - Parameters:
///   - instrumentName: Name of the instrument (e.g., "LocalGal", "KaneMarco")
///   - paramId: Parameter identifier (e.g., "filter_cutoff", "master_volume")
///   - oldValue: Parameter value before change
///   - newValue: Parameter value after change
#define LOG_PARAMETER_CHANGE(instrumentName, paramId, oldValue, newValue) \
    do { \
        auto now = std::chrono::system_clock::now(); \
        auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>( \
            now.time_since_epoch()).count(); \
        float delta = std::abs((newValue) - (oldValue)); \
        if (delta > 0.001f) { \
            printf("[%lld] [%sDSP] %s: %.3f -> %.3f (Δ%.3f)\n", \
                   timestamp, instrumentName, paramId, oldValue, newValue, delta); \
        } \
    } while(0)

#else

// Release build: logging is compiled out (zero overhead)
#define LOG_PARAMETER_CHANGE(instrumentName, paramId, oldValue, newValue) ((void)0)

#endif // DEBUG
