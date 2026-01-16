/*
  ==============================================================================

    SchillingerPluginEditor.h
    Created: January 13, 2026
    Author:  Bret Bouchard

    UI editor for Schillinger Plugin

  ==============================================================================
*/

#pragma once

#include <juce_gui_basics/juce_gui_basics.h>
#include "SchillingerPluginProcessor.h"

//==============================================================================
// Schillinger Plugin Editor
//==============================================================================

class SchillingerPluginEditor : public juce::AudioProcessorEditor, private juce::Timer {
public:
    //==========================================================================
    // Constructor/Destructor
    //==========================================================================

    SchillingerPluginEditor(SchillingerPluginProcessor& p);
    ~SchillingerPluginEditor() override;

    //==========================================================================
    // Component Overrides
    //==========================================================================

    void paint(juce::Graphics& g) override;
    void resized() override;

private:
    //==========================================================================
    // Processor Reference
    //==========================================================================

    SchillingerPluginProcessor& processorRef;
    juce::AudioProcessorValueTreeState& valueTreeState;

    //==========================================================================
    // UI Components
    //==========================================================================

    // Header section
    std::unique_ptr<juce::Label> titleLabel;
    std::unique_ptr<juce::Label> versionLabel;

    // Status display
    std::unique_ptr<juce::GroupComponent> statusGroup;
    std::unique_ptr<juce::Label> compositionStatusLabel;
    std::unique_ptr<juce::Label> noteCountLabel;
    std::unique_ptr<juce::Label> playbackPositionLabel;

    // Generate button
    std::unique_ptr<juce::TextButton> generateButton;
    std::unique_ptr<juce::TextButton> resetButton;

    // Parameters organized by category
    std::unique_ptr<juce::GroupComponent> songDefGroup;
    std::unique_ptr<juce::GroupComponent> rhythmGroup;
    std::unique_ptr<juce::GroupComponent> melodyGroup;
    std::unique_ptr<juce::GroupComponent> harmonyGroup;
    std::unique_ptr<juce::GroupComponent> structureGroup;
    std::unique_ptr<juce::GroupComponent> orchestrationGroup;
    std::unique_ptr<juce::GroupComponent> generationGroup;

    // Parameter attachments (sliders, combo boxes)
    juce::OwnedArray<juce::AudioProcessorValueTreeState::SliderAttachment> sliderAttachments;
    juce::OwnedArray<juce::AudioProcessorValueTreeState::ComboBoxAttachment> comboBoxAttachments;
    juce::OwnedArray<juce::AudioProcessorValueTreeState::ButtonAttachment> buttonAttachments;

    // Sliders and labels for parameters
    struct ParameterControl {
        juce::Slider slider;
        juce::Label label;
        juce::Label valueLabel;
    };

    std::vector<std::unique_ptr<ParameterControl>> parameterControls;

    //==========================================================================
    // Timer for UI Updates
    //==========================================================================

    void timerCallback() override;

    //==========================================================================
    // UI Helpers
    //==========================================================================

    void createSongDefControls();
    void createRhythmControls();
    void createMelodyControls();
    void createHarmonyControls();
    void createStructureControls();
    void createOrchestrationControls();
    void createGenerationControls();

    void updateStatusDisplay();

    //==========================================================================

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SchillingerPluginEditor)
};
