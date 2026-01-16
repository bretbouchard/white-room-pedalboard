/*
  ==============================================================================

    ParameterBuilder.h
    Created: January 7, 2026
    Author: Bret Bouchard

    Utility for building JUCE AudioProcessorValueTreeState parameters
    with consistent defaults and minimal boilerplate.

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>

namespace PluginTemplates {

//==============================================================================
// Parameter Categories
//==============================================================================

enum class ParameterCategory {
    generic,
    synthesis,
    effects,
    envelope,
    modulation,
    sequencer,
    drill,        // IDM/drill specific
    performance
};

//==============================================================================
// Helper: Map ParameterCategory to JUCE Category
//==============================================================================

inline juce::AudioProcessorParameter::Category getParameterCategory(ParameterCategory category)
{
    // JUCE 8 only has: genericParameter, inputGain, outputGain, inputMeter, outputMeter
    // We map all our categories to genericParameter
    juce::ignoreUnused(category);
    return juce::AudioProcessorParameter::Category::genericParameter;
}

//==============================================================================
// Parameter Builder - Returns std::unique_ptr for JUCE 8 ParameterLayout
//==============================================================================

class ParameterBuilder {
public:
    //==========================================================================
    // Float Parameter Builder
    //==========================================================================

    static std::unique_ptr<juce::AudioParameterFloat> createFloatParameter(
        const juce::String& parameterID,
        const juce::String& parameterName,
        float minValue,
        float maxValue,
        float defaultValue,
        ParameterCategory category = ParameterCategory::generic,
        const juce::String& label = "")
    {
        // Use parameter ID hash as version hint to ensure uniqueness
        int versionHint = static_cast<int>(parameterID.hashCode());

        // Build attributes using JUCE 8 API
        juce::AudioParameterFloatAttributes attributes;

        if (label.isNotEmpty())
            attributes = attributes.withLabel(label);

        attributes = attributes.withCategory(getParameterCategory(category));

        return std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID(parameterID, versionHint),
            parameterName,
            juce::NormalisableRange<float>(minValue, maxValue),
            defaultValue,
            attributes
        );
    }

    //==========================================================================
    // Boolean Parameter Builder
    //==========================================================================

    static std::unique_ptr<juce::AudioParameterBool> createBoolParameter(
        const juce::String& parameterID,
        const juce::String& parameterName,
        bool defaultValue,
        ParameterCategory category = ParameterCategory::generic)
    {
        int versionHint = static_cast<int>(parameterID.hashCode());

        juce::AudioParameterBoolAttributes attributes;
        attributes = attributes.withCategory(getParameterCategory(category));

        return std::make_unique<juce::AudioParameterBool>(
            juce::ParameterID(parameterID, versionHint),
            parameterName,
            defaultValue,
            attributes
        );
    }

    //==========================================================================
    // Choice Parameter Builder
    //==========================================================================

    static std::unique_ptr<juce::AudioParameterChoice> createChoiceParameter(
        const juce::String& parameterID,
        const juce::String& parameterName,
        const juce::StringArray& choices,
        int defaultIndex,
        ParameterCategory category = ParameterCategory::generic)
    {
        int versionHint = static_cast<int>(parameterID.hashCode());

        juce::AudioParameterChoiceAttributes attributes;
        attributes = attributes.withCategory(getParameterCategory(category));

        return std::make_unique<juce::AudioParameterChoice>(
            juce::ParameterID(parameterID, versionHint),
            parameterName,
            choices,
            defaultIndex,
            attributes
        );
    }

    //==========================================================================
    // Integer Parameter Builder
    //==========================================================================

    static std::unique_ptr<juce::AudioParameterInt> createIntParameter(
        const juce::String& parameterID,
        const juce::String& parameterName,
        int minValue,
        int maxValue,
        int defaultValue,
        ParameterCategory category = ParameterCategory::generic)
    {
        int versionHint = static_cast<int>(parameterID.hashCode());

        juce::AudioParameterIntAttributes attributes;
        attributes = attributes.withCategory(getParameterCategory(category));

        return std::make_unique<juce::AudioParameterInt>(
            juce::ParameterID(parameterID, versionHint),
            parameterName,
            minValue,
            maxValue,
            defaultValue,
            attributes
        );
    }

    //==========================================================================
    // Specialized Parameter Creators
    //==========================================================================

    // Percentage parameter (0-100%)
    static std::unique_ptr<juce::AudioParameterFloat> createPercentageParameter(
        const juce::String& parameterID,
        const juce::String& parameterName,
        float defaultPercentage,
        ParameterCategory category = ParameterCategory::generic)
    {
        return createFloatParameter(
            parameterID,
            parameterName,
            0.0f, 100.0f, defaultPercentage,
            category,
            "%"
        );
    }

    // Gain parameter in dB
    static std::unique_ptr<juce::AudioParameterFloat> createGainParameter(
        const juce::String& parameterID,
        const juce::String& parameterName,
        float defaultdB = 0.0f,
        float mindB = -60.0f,
        float maxdB = 12.0f)
    {
        return createFloatParameter(
            parameterID,
            parameterName,
            mindB, maxdB, defaultdB,
            ParameterCategory::generic,
            "dB"
        );
    }

    // Time parameter in milliseconds
    static std::unique_ptr<juce::AudioParameterFloat> createTimeParameter(
        const juce::String& parameterID,
        const juce::String& parameterName,
        float defaultTimeMs,
        float minTime = 0.1f,
        float maxTime = 5000.0f)
    {
        return createFloatParameter(
            parameterID,
            parameterName,
            minTime, maxTime, defaultTimeMs,
            ParameterCategory::generic,
            "ms"
        );
    }

    // Frequency parameter in Hz
    static std::unique_ptr<juce::AudioParameterFloat> createFrequencyParameter(
        const juce::String& parameterID,
        const juce::String& parameterName,
        float defaultHz,
        float minHz = 20.0f,
        float maxHz = 20000.0f)
    {
        return createFloatParameter(
            parameterID,
            parameterName,
            minHz, maxHz, defaultHz,
            ParameterCategory::generic,
            "Hz"
        );
    }

    // Drilla/IDM specialized parameter
    static std::unique_ptr<juce::AudioParameterFloat> createDrillParameter(
        const juce::String& parameterID,
        const juce::String& parameterName,
        float defaultValue,
        float minValue = 0.0f,
        float maxValue = 1.0f)
    {
        return createFloatParameter(
            parameterID,
            parameterName,
            minValue, maxValue, defaultValue,
            ParameterCategory::drill,
            ""
        );
    }

private:
};

//==============================================================================
// Parameter Layout Builder - Simplified for JUCE 8
//==============================================================================

// JUCE 8 ParameterLayout accepts std::unique_ptr<Parameters>... directly
// So we don't need a separate ParameterLayoutBuilder class
// Just use: juce::AudioProcessorValueTreeState::ParameterLayout(std::move(params)...)

} // namespace PluginTemplates
