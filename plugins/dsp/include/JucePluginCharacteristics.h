/*
    ==============================================================================
    JUCE Plugin Characteristics
    ==============================================================================
*/

#pragma once

//==============================================================================
// These macros are used by JUCE to identify the plugin
#define JucePlugin_Version                   1.0.0
#define JucePlugin_VersionCode              0x10000
#define JucePlugin_VersionString            "1.0.0"

//==============================================================================
// Plugin identification
#define JucePlugin_Name                     "White Room Pedalboard"
#define JucePlugin_Desc                     "Virtual pedalboard with 10 guitar effects"
#define JucePlugin_Manufacturer             "White Room Audio"
#define JucePlugin_ManufacturerWebsite      "https://whiteroom.audio"
#define JucePlugin_ManufacturerEmail        "info@whiteroom.audio"
#define JucePlugin_ManufacturerCode         "WHTR"
#define JucePlugin_PluginCode               "WHPB"

//==============================================================================
// Plugin type
#define JucePlugin_IsSynth                  0
#define JucePlugin_WantsMidiInput           1
#define JucePlugin_ProducesMidiOutput       0
#define JucePlugin_IsMidiEffect             0

//==============================================================================
// Audio Processor characteristics
#define JucePlugin_PreferredChannelConfigurations {1, 1}, {2, 2}

//==============================================================================
// VST3 specific
#define JucePlugin_VST3Category             "Fx|Modulation"
#define JucePlugin_VST3SDKVersion           0x030700

//==============================================================================
// AU specific
#define JucePlugin_AUMainType               'aufx'

//==============================================================================
// Disable VST3 parameter automation check for now
#define JUCE_STANDALONE_ALLOW_VST3 1
