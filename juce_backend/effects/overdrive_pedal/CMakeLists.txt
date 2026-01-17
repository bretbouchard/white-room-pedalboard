cmake_minimum_required(VERSION 3.15)
project(overdrive_pedal VERSION 1.0.0)

# JUCE setup
set(JUCE_MODULES_DIR
    ${CMAKE_CURRENT_LIST_DIR}/../../external/JUCE/modules
    CACHE INTERNAL "")

add_subdirectory(${JUCE_MODULES_DIR} JUCE)

# Plugin formats
set(JUCE_FORMATS VST;AU;CLAP;LV2;Standalone)

# Plugin source files
set(PLUGIN_SRC
    src/overdrive_pedalPlugin.cpp
    src/overdrive_pedalPluginEditor.cpp
)

# Create plugin target
juce_add_plugin(overdrive_pedal
    PLUGIN_SRC ${PLUGIN_SRC}
    FORMAT ${JUCE_FORMATS}
)

# Link JUCE modules
target_link_libraries(overdrive_pedal
    PRIVATE
        juce::juce_audio_plugin_client
        juce::juce_audio_utils
        juce::juce_dsp
)
