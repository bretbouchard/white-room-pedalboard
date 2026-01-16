#pragma once
#include "flutter/flutter_juce_ffi.h"

#ifdef __cplusplus
extern "C" {
#endif

// Additional initialization functions required by Flutter
bool JuceFFI_Initialize();
void JuceFFI_StartAudioProcessing();
void JuceFFI_StopAudioProcessing();
void JuceFFI_Shutdown();

#ifdef __cplusplus
}
#endif