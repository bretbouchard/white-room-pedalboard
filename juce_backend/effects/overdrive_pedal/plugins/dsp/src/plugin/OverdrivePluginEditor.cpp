/*
  ==============================================================================

    OverdrivePluginEditor.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    JUCE plugin editor for Overdrive Pedal

  ==============================================================================
*/

#include "OverdrivePluginEditor.h"

//==============================================================================
OverdrivePluginEditor::OverdrivePluginEditor (OverdrivePluginProcessor& p)
    : AudioProcessorEditor (&p), processorRef (p)
{
    // Set up knobs
    juce::Array<juce::Slider*> knobs = {&driveKnob, &toneKnob, &bassKnob, &midKnob, &trebleKnob, &levelKnob};

    for (auto* knob : knobs)
    {
        knob->setSliderStyle(juce::Slider::RotaryVerticalDrag);
        knob->setTextBoxStyle(juce::Slider::TextBoxBelow, false, 60, 20);
        addAndMakeVisible(knob);
    }

    // Set up labels
    juce::Array<std::pair<juce::Label*, juce::String>> labels = {
        {&driveLabel, "Drive"},
        {&toneLabel, "Tone"},
        {&bassLabel, "Bass"},
        {&midLabel, "Mid"},
        {&trebleLabel, "Treble"},
        {&levelLabel, "Level"}
    };

    for (auto& [label, text] : labels)
    {
        label->setText(text, juce::dontSendNotification);
        label->setJustificationType(juce::Justification::centred);
        label->setFont(juce::Font(12.0f));
        addAndMakeVisible(label);
    }

    // Set up preset selector
    presetLabel.setText("Preset", juce::dontSendNotification);
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
    setSize (500, 350);
}

OverdrivePluginEditor::~OverdrivePluginEditor()
{
}

//==============================================================================
void OverdrivePluginEditor::paint (juce::Graphics& g)
{
    // Background
    g.fillAll(juce::Colour(30, 30, 35));

    // Title
    g.setColour(juce::Colours::white);
    g.setFont(juce::Font(24.0f, juce::Font::bold));
    g.drawText("OVERDRIVE", getLocalBounds().removeFromTop(50), juce::Justification::centred);

    // Subtitle
    g.setFont(juce::Font(14.0f));
    g.setColour(juce::Colours::lightgrey);
    g.drawText("Classic Tube Overdrive",
        getLocalBounds().withTrimmedTop(55).removeFromTop(20),
        juce::Justification::centred);
}

void OverdrivePluginEditor::resized()
{
    auto area = getLocalBounds();
    area.removeFromTop(80); // Space for title

    // Preset selector
    auto presetArea = area.removeFromTop(40);
    presetLabel.setBounds(presetArea.removeFromLeft(80));
    presetComboBox.setBounds(presetArea);

    area.removeFromTop(20);

    // Two rows of three knobs
    int knobSize = 90;
    int spacing = 15;

    // Row 1: Drive, Tone, Bass
    auto row1 = area.removeFromTop(knobSize + 20);
    driveKnob.setBounds(row1.removeFromLeft(knobSize).reduced(10));
    driveLabel.setBounds(driveKnob.getBounds().withTrimmedTop(knobSize - 20));

    toneKnob.setBounds(row1.removeFromLeft(knobSize).reduced(10));
    toneLabel.setBounds(toneKnob.getBounds().withTrimmedTop(knobSize - 20));

    bassKnob.setBounds(row1.removeFromLeft(knobSize).reduced(10));
    bassLabel.setBounds(bassKnob.getBounds().withTrimmedTop(knobSize - 20));

    // Row 2: Mid, Treble, Level
    area.removeFromTop(spacing);
    auto row2 = area.removeFromTop(knobSize + 20);
    midKnob.setBounds(row2.removeFromLeft(knobSize).reduced(10));
    midLabel.setBounds(midKnob.getBounds().withTrimmedTop(knobSize - 20));

    trebleKnob.setBounds(row2.removeFromLeft(knobSize).reduced(10));
    trebleLabel.setBounds(trebleKnob.getBounds().withTrimmedTop(knobSize - 20));

    levelKnob.setBounds(row2.removeFromLeft(knobSize).reduced(10));
    levelLabel.setBounds(levelKnob.getBounds().withTrimmedTop(knobSize - 20));
}
