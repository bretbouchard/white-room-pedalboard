/*
  ==============================================================================

    SchillingerPluginEditor.cpp
    Created: January 13, 2026
    Author:  Bret Bouchard

    UI editor implementation for Schillinger Plugin

  ==============================================================================
*/

#include "SchillingerPluginEditor.h"

//==============================================================================
// Constructor
//==============================================================================

SchillingerPluginEditor::SchillingerPluginEditor(SchillingerPluginProcessor& p)
    : juce::AudioProcessorEditor(p)
    , processorRef(p)
    , valueTreeState(processorRef.getValueTreeState())
{
    // Set up UI
    setSize(800, 900);

    //==========================================================================
    // Create Header
    //==========================================================================

    titleLabel = std::make_unique<juce::Label>();
    titleLabel->setText("Schillinger System", juce::dontSendNotification);
    titleLabel->setFont(juce::Font(24.0f, juce::Font::bold));
    titleLabel->setJustificationType(juce::Justification::centred);
    addAndMakeVisible(titleLabel.get());

    versionLabel = std::make_unique<juce::Label>();
    versionLabel->setText("v1.0.0", juce::dontSendNotification);
    versionLabel->setFont(juce::Font(12.0f));
    versionLabel->setJustificationType(juce::Justification::centredRight);
    addAndMakeVisible(versionLabel.get());

    //==========================================================================
    // Create Status Display
    //==========================================================================

    statusGroup = std::make_unique<juce::GroupComponent>();
    statusGroup->setText("Composition Status");
    statusGroup->setTextLabelPosition(juce::Justification::centredLeft);
    addAndMakeVisible(statusGroup.get());

    compositionStatusLabel = std::make_unique<juce::Label>();
    compositionStatusLabel->setText("Status: Ready", juce::dontSendNotification);
    compositionStatusLabel->setFont(juce::Font(14.0f));
    addAndMakeVisible(compositionStatusLabel.get());

    noteCountLabel = std::make_unique<juce::Label>();
    noteCountLabel->setText("Notes: 0", juce::dontSendNotification);
    noteCountLabel->setFont(juce::Font(14.0f));
    addAndMakeVisible(noteCountLabel.get());

    playbackPositionLabel = std::make_unique<juce::Label>();
    playbackPositionLabel->setText("Position: 0.0s", juce::dontSendNotification);
    playbackPositionLabel->setFont(juce::Font(14.0f));
    addAndMakeVisible(playbackPositionLabel.get());

    //==========================================================================
    // Create Generate/Reset Buttons
    //==========================================================================

    generateButton = std::make_unique<juce::TextButton>("Generate");
    generateButton->onClick = [this]() {
        // Trigger generation by setting the trigger parameter
        valueTreeState.getParameter("trigger")->setValueNotifyingHost(1.0f);
    };
    addAndMakeVisible(generateButton.get());

    buttonAttachments.add(new juce::AudioProcessorValueTreeState::ButtonAttachment(
        valueTreeState, "trigger", *generateButton));

    resetButton = std::make_unique<juce::TextButton>("Reset");
    resetButton->onClick = [this]() {
        processorRef.resetComposition();
        updateStatusDisplay();
    };
    addAndMakeVisible(resetButton.get());

    //==========================================================================
    // Create Parameter Groups
    //==========================================================================

    createSongDefControls();
    createRhythmControls();
    createMelodyControls();
    createHarmonyControls();
    createStructureControls();
    createOrchestrationControls();
    createGenerationControls();

    //==========================================================================
    // Start UI Update Timer
    //==========================================================================

    startTimerHz(30);  // 30 Hz UI update rate
}

//==============================================================================
// Destructor
//==============================================================================

SchillingerPluginEditor::~SchillingerPluginEditor()
{
    stopTimer();
}

//==============================================================================
// Paint
//==============================================================================

void SchillingerPluginEditor::paint(juce::Graphics& g)
{
    g.fillAll(juce::Colours::darkgrey);

    g.setColour(juce::Colours::white);
    g.setFont(14.0f);
}

//==============================================================================
// Resized
//==============================================================================

void SchillingerPluginEditor::resized()
{
    auto area = getLocalBounds().reduced(10);

    //==========================================================================
    // Header (top 50px)
    //==========================================================================

    auto headerArea = area.removeFromTop(50);
    titleLabel->setBounds(headerArea.removeFromLeft(headerArea.getWidth() - 100));
    versionLabel->setBounds(headerArea);

    //==========================================================================
    // Status Display (next 60px)
    //==========================================================================

    auto statusArea = area.removeFromTop(60);
    statusGroup->setBounds(statusArea);

    auto statusInner = statusArea.reduced(10, 20);
    compositionStatusLabel->setBounds(statusInner.removeFromLeft(statusInner.getWidth() / 3));
    noteCountLabel->setBounds(statusInner.removeFromLeft(statusInner.getWidth() / 2));
    playbackPositionLabel->setBounds(statusInner);

    //==========================================================================
    // Buttons (next 40px)
    //==========================================================================

    auto buttonArea = area.removeFromTop(40);
    auto buttonWidth = 100;
    generateButton->setBounds(buttonArea.removeFromLeft(buttonWidth).reduced(5));
    resetButton->setBounds(buttonArea.removeFromLeft(buttonWidth).reduced(5));

    //==========================================================================
    // Parameter Groups (remaining space)
    //==========================================================================

    // For simplicity, we'll use a basic layout
    // In a full implementation, you'd use a Viewport or TabbedComponent
    int groupHeight = 120;
    int currentY = area.getY();

    if (songDefGroup) {
        songDefGroup->setBounds(area.removeFromTop(groupHeight));
    }
    if (rhythmGroup) {
        rhythmGroup->setBounds(area.removeFromTop(groupHeight));
    }
    if (melodyGroup) {
        melodyGroup->setBounds(area.removeFromTop(groupHeight));
    }
    if (harmonyGroup) {
        harmonyGroup->setBounds(area.removeFromTop(groupHeight));
    }
    if (structureGroup) {
        structureGroup->setBounds(area.removeFromTop(groupHeight));
    }
    if (orchestrationGroup) {
        orchestrationGroup->setBounds(area.removeFromTop(groupHeight));
    }
    if (generationGroup) {
        generationGroup->setBounds(area.removeFromTop(groupHeight));
    }
}

//==============================================================================
// Timer Callback
//==============================================================================

void SchillingerPluginEditor::timerCallback()
{
    updateStatusDisplay();
}

//==============================================================================
// Update Status Display
//==============================================================================

void SchillingerPluginEditor::updateStatusDisplay()
{
    // Update note count
    auto& notes = processorRef.getCompositionNotes();
    noteCountLabel->setText(juce::String("Notes: ") + juce::String(notes.size()),
                           juce::dontSendNotification);

    // Update status
    if (notes.empty()) {
        compositionStatusLabel->setText("Status: No composition", juce::dontSendNotification);
    } else {
        compositionStatusLabel->setText("Status: Ready to play", juce::dontSendNotification);
    }

    // Update playback position (placeholder for now)
    // playbackPositionLabel->setText("Position: 0.0s", juce::dontSendNotification);
}

//==============================================================================
// Create Parameter Controls
//==============================================================================

void SchillingerPluginEditor::createSongDefControls()
{
    // TODO: Create song definition controls
    // This is a placeholder - full implementation would add sliders/combo boxes
    // for tempo, time signature, scale, root note
}

void SchillingerPluginEditor::createRhythmControls()
{
    // TODO: Create rhythm controls
    // Resultant type, periodicity A/B/C, density, complexity, etc.
}

void SchillingerPluginEditor::createMelodyControls()
{
    // TODO: Create melody controls
    // Contour, interval range, step/leaping, etc.
}

void SchillingerPluginEditor::createHarmonyControls()
{
    // TODO: Create harmony controls
    // Harmony type, harmonic rhythm, chord density, etc.
}

void SchillingerPluginEditor::createStructureControls()
{
    // TODO: Create structure controls
    // Sections, section length, transition type, etc.
}

void SchillingerPluginEditor::createOrchestrationControls()
{
    // TODO: Create orchestration controls
    // Register, texture, articulation, dynamics, timbre
}

void SchillingerPluginEditor::createGenerationControls()
{
    // TODO: Create generation controls
    // Seed, length (bars)
}
