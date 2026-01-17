/*
  ==============================================================================

    OverdrivePluginEditor.h
    Created: January 15, 2026
    Author: Bret Bouchard

    JUCE plugin editor for Overdrive Pedal

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "OverdrivePluginProcessor.h"

//==============================================================================
class OverdrivePluginEditor  : public juce::AudioProcessorEditor
{
public:
    //==============================================================================
    OverdrivePluginEditor (OverdrivePluginProcessor&);
    ~OverdrivePluginEditor() override;

    //==============================================================================
    void paint (juce::Graphics&) override;
    void resized() override;

private:
    //==============================================================================
    OverdrivePluginProcessor& processorRef;

    // Knobs
    juce::Slider driveKnob;
    juce::Slider toneKnob;
    juce::Slider bassKnob;
    juce::Slider midKnob;
    juce::Slider trebleKnob;
    juce::Slider levelKnob;

    // Labels
    juce::Label driveLabel;
    juce::Label toneLabel;
    juce::Label bassLabel;
    juce::Label midLabel;
    juce::Label trebleLabel;
    juce::Label levelLabel;

    // Preset selector
    juce::ComboBox presetComboBox;
    juce::Label presetLabel;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (OverdrivePluginEditor)
};
