/*
  ==============================================================================

    AetherDrivePluginEditor.h
    Created: January 15, 2026
    Author: Bret Bouchard

    JUCE plugin editor for Aether Drive

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "AetherDrivePluginProcessor.h"

//==============================================================================
/**
*/
class AetherDrivePluginEditor  : public juce::AudioProcessorEditor
{
public:
    //==============================================================================
    AetherDrivePluginEditor (AetherDrivePluginProcessor&);
    ~AetherDrivePluginEditor() override;

    //==============================================================================
    void paint (juce::Graphics&) override;
    void resized() override;

private:
    //==============================================================================
    // This reference is provided as a quick way for your editor to
    // access the processor object that created it.
    AetherDrivePluginProcessor& processorRef;

    // Sliders
    juce::Slider driveSlider;
    juce::Slider bassSlider;
    juce::Slider midSlider;
    juce::Slider trebleSlider;
    juce::Slider bodyResonanceSlider;
    juce::Slider resonanceDecaySlider;
    juce::Slider mixSlider;
    juce::Slider outputLevelSlider;
    juce::Slider cabinetSimulationSlider;

    // Labels
    juce::Label driveLabel;
    juce::Label bassLabel;
    juce::Label midLabel;
    juce::Label trebleLabel;
    juce::Label bodyResonanceLabel;
    juce::Label resonanceDecayLabel;
    juce::Label mixLabel;
    juce::Label outputLevelLabel;
    juce::Label cabinetSimulationLabel;

    // ComboBox for presets
    juce::ComboBox presetComboBox;
    juce::Label presetLabel;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (AetherDrivePluginEditor)
};
