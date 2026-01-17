cmake_minimum_required(VERSION 3.15)
project(Sam_sampler VERSION 1.0.0)

# JUCE setup
set(JUCE_MODULES_DIR
    ${CMAKE_CURRENT_LIST_DIR}/../../external/JUCE/modules
    CACHE INTERNAL "")

add_subdirectory(${JUCE_MODULES_DIR} JUCE)

# Plugin formats
set(JUCE_FORMATS VST;AU;CLAP;LV2;Standalone)

# Plugin source files
set(PLUGIN_SRC
    src/Sam_samplerPlugin.cpp
    src/Sam_samplerPluginEditor.cpp
)

# Create plugin target
juce_add_plugin(Sam_sampler
    PLUGIN_SRC ${PLUGIN_SRC}
    FORMAT ${JUCE_FORMATS}
)

# Link JUCE modules
target_link_libraries(Sam_sampler
    PRIVATE
        juce::juce_audio_plugin_client
        juce::juce_audio_utils
        juce::juce_dsp
)
