/*
  ==============================================================================

    AetherDrivePluginEditor.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    JUCE plugin editor for Aether Drive

  ==============================================================================
*/

#include "AetherDrivePluginEditor.h"

//==============================================================================
AetherDrivePluginEditor::AetherDrivePluginEditor (AetherDrivePluginProcessor& p)
    : AudioProcessorEditor (&p), processorRef (p)
{
    // Set up sliders
    juce::Array<juce::Slider*> allSliders = {
        &driveSlider, &bassSlider, &midSlider, &trebleSlider,
        &bodyResonanceSlider, &resonanceDecaySlider,
        &mixSlider, &outputLevelSlider, &cabinetSimulationSlider
    };

    for (auto* slider : allSliders)
    {
        slider->setSliderStyle(juce::Slider::RotaryVerticalDrag);
        slider->setTextBoxStyle(juce::Slider::TextBoxBelow, false, 60, 20);
        addAndMakeVisible(slider);
    }

    // Set up labels
    juce::Array<std::pair<juce::Label*, juce::String>> allLabels = {
        {&driveLabel, "Drive"},
        {&bassLabel, "Bass"},
        {&midLabel, "Mid"},
        {&trebleLabel, "Treble"},
        {&bodyResonanceLabel, "Body Res"},
        {&resonanceDecayLabel, "Res Decay"},
        {&mixLabel, "Mix"},
        {&outputLevelLabel, "Output"},
        {&cabinetSimulationLabel, "Cabinet"}
    };

    for (auto& [label, text] : allLabels)
    {
        label->setText(text, juce::dontSendNotification);
        label->setJustificationType(juce::Justification::centred);
        label->setFont(juce::Font(12.0f));
        addAndMakeVisible(label);
    }

    // Set up preset combo box
    presetLabel.setText("Presets", juce::dontSendNotification);
    presetLabel.setJustificationType(juce::Justification::centredLeft);
    addAndMakeVisible(presetLabel);

    for (int i = 0; i < processorRef.getNumPrograms(); ++i)
    {
        presetComboBox.addItem(processorRef.getProgramName(i), i + 1);
    }
    presetComboBox.onChange = [this] {
        processorRef.setCurrentProgram(presetComboBox.getSelectedItemIndex());
    };
    addAndMakeVisible(presetComboBox);

    // Set editor size
    setSize (600, 450);
}

AetherDrivePluginEditor::~AetherDrivePluginEditor()
{
}

//==============================================================================
void AetherDrivePluginEditor::paint (juce::Graphics& g)
{
    // Background
    g.fillAll(getLookAndFeel().findColour(juce::ResizableWindow::backgroundColourId));

    // Title
    g.setColour(juce::Colours::white);
    g.setFont(juce::Font(24.0f, juce::Font::bold));
    g.drawText("Aether Drive", getLocalBounds().removeFromTop(40), juce::Justification::centred);

    // Subtitle
    g.setFont(juce::Font(14.0f));
    g.drawText("Guitar Effects Pedal Emulator",
        getLocalBounds().withTrimmedTop(45).removeFromTop(20),
        juce::Justification::centred);
}

void AetherDrivePluginEditor::resized()
{
    auto area = getLocalBounds();
    area.removeFromTop(70); // Space for title

    // Preset selector at top
    auto presetArea = area.removeFromTop(40);
    presetLabel.setBounds(presetArea.removeFromLeft(80));
    presetComboBox.setBounds(presetArea);

    area.removeFromTop(20);

    // Three rows of three knobs
    int knobSize = 100;
    int spacing = 20;

    // Row 1: Drive, Bass, Mid
    auto row1 = area.removeFromTop(knobSize + 20);
    driveSlider.setBounds(row1.removeFromLeft(knobSize).reduced(10));
    driveLabel.setBounds(driveSlider.getBounds().withTrimmedTop(knobSize - 20));

    bassSlider.setBounds(row1.removeFromLeft(knobSize).reduced(10));
    bassLabel.setBounds(bassSlider.getBounds().withTrimmedTop(knobSize - 20));

    midSlider.setBounds(row1.removeFromLeft(knobSize).reduced(10));
    midLabel.setBounds(midSlider.getBounds().withTrimmedTop(knobSize - 20));

    // Row 2: Treble, Body Res, Res Decay
    area.removeFromTop(spacing);
    auto row2 = area.removeFromTop(knobSize + 20);
    trebleSlider.setBounds(row2.removeFromLeft(knobSize).reduced(10));
    trebleLabel.setBounds(trebleSlider.getBounds().withTrimmedTop(knobSize - 20));

    bodyResonanceSlider.setBounds(row2.removeFromLeft(knobSize).reduced(10));
    bodyResonanceLabel.setBounds(bodyResonanceSlider.getBounds().withTrimmedTop(knobSize - 20));

    resonanceDecaySlider.setBounds(row2.removeFromLeft(knobSize).reduced(10));
    resonanceDecayLabel.setBounds(resonanceDecaySlider.getBounds().withTrimmedTop(knobSize - 20));

    // Row 3: Mix, Output, Cabinet
    area.removeFromTop(spacing);
    auto row3 = area.removeFromTop(knobSize + 20);
    mixSlider.setBounds(row3.removeFromLeft(knobSize).reduced(10));
    mixLabel.setBounds(mixSlider.getBounds().withTrimmedTop(knobSize - 20));

    outputLevelSlider.setBounds(row3.removeFromLeft(knobSize).reduced(10));
    outputLevelLabel.setBounds(outputLevelSlider.getBounds().withTrimmedTop(knobSize - 20));

    cabinetSimulationSlider.setBounds(row3.removeFromLeft(knobSize).reduced(10));
    cabinetSimulationLabel.setBounds(cabinetSimulationSlider.getBounds().withTrimmedTop(knobSize - 20));
}
