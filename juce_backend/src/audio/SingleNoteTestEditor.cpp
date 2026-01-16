/*
  ==============================================================================

    SingleNoteTestEditor.cpp
    Implementation of minimal test editor

  ==============================================================================
*/

#include "SingleNoteTestEditor.h"

//==============================================================================
// Constructor/Destructor
//==============================================================================

SingleNoteTestEditor::SingleNoteTestEditor(SingleNoteTestProcessor& processor)
    : juce::AudioProcessorEditor(processor)
    , processor_(processor)
{
    DBG("[SingleNoteTestEditor] Editor constructed");

    //==========================================================================
    // Setup Reset Button
    //==========================================================================

    resetButton_.setButtonText("Reset Test");
    resetButton_.onClick = [this]() {
        DBG("[SingleNoteTestEditor] Reset button clicked");
        processor_.resetTest();
        updateStatusLabel();
        repaint();
    };

    addAndMakeVisible(resetButton_);

    //==========================================================================
    // Setup Status Label
    //==========================================================================

    statusLabel_.setText("Status: Ready", juce::dontSendNotification);
    statusLabel_.setJustificationType(juce::Justification::centred);
    statusLabel_.setFont(juce::Font(16.0f));

    addAndMakeVisible(statusLabel_);

    //==========================================================================
    // Setup Info Label
    //==========================================================================

    infoLabel_.setText(
        "Single Note Test Plugin\n"
        "Outputs Middle C (MIDI 60) for 1 second\n"
        "Use MIDI monitor in DAW to verify output",
        juce::dontSendNotification
    );
    infoLabel_.setJustificationType(juce::Justification::centred);
    infoLabel_.setFont(juce::Font(14.0f));

    addAndMakeVisible(infoLabel_);

    //==========================================================================
    // Setup Timer for UI Updates
    //==========================================================================

    startTimerHz(10);  // Update UI 10 times per second

    //==========================================================================
    // Set Initial Size
    //==========================================================================

    setSize(400, 300);

    DBG("[SingleNoteTestEditor] Editor ready, size=" << getWidth() << "x" << getHeight());
}

SingleNoteTestEditor::~SingleNoteTestEditor()
{
    DBG("[SingleNoteTestEditor] Editor destructed");
    stopTimer();
}

//==============================================================================
// Graphics
//==============================================================================

void SingleNoteTestEditor::paint(juce::Graphics& g)
{
    // Fill background
    g.fillAll(juce::Colours::darkgrey);

    // Draw title
    g.setColour(juce::Colours::white);
    g.setFont(juce::Font(24.0f, juce::Font::bold));
    g.drawText("Single Note Test",
        getLocalBounds().removeFromTop(60).toFloat(),
        juce::Justification::centred, true);

    // Draw test info box
    auto infoBox = getLocalBounds()
        .withTrimmedTop(70)
        .withTrimmedBottom(80)
        .reduced(20, 0);

    g.setColour(juce::Colours::lightgrey);
    g.drawRect(infoBox, 2);

    g.setFont(juce::Font(14.0f));
    g.setColour(juce::Colours::white);
    g.drawText(
        "MIDI Note: 60 (Middle C)\n"
        "Velocity: 80%\n"
        "Duration: 1.0 seconds\n"
        "Channel: 1",
        infoBox,
        juce::Justification::centred
    );

    // Draw stats box
    auto statsBox = getLocalBounds()
        .withTrimmedTop(70)
        .withTrimmedBottom(80)
        .reduced(20, 0)
        .toFloat();

    auto leftStats = statsBox.withWidth(statsBox.getWidth() / 2.0f).reduced(10);
    auto rightStats = statsBox.withLeft(statsBox.getCentreX()).reduced(10);

    g.setColour(juce::Colours::black);
    g.fillRect(leftStats);
    g.fillRect(rightStats);

    g.setColour(juce::Colours::white);
    g.setFont(juce::Font(12.0f));
    g.drawText("Note ON Count: " + juce::String(processor_.getNoteOnCount()),
        leftStats, juce::Justification::centred);
    g.drawText("Note OFF Count: " + juce::String(processor_.getNoteOffCount()),
        rightStats, juce::Justification::centred);
}

void SingleNoteTestEditor::resized()
{
    layoutComponents();
}

//==============================================================================
// Timer Callback
//==============================================================================

void SingleNoteTestEditor::timerCallback()
{
    updateStatusLabel();
    repaint();  // Refresh UI
}

//==============================================================================
// Layout
//==============================================================================

void SingleNoteTestEditor::layoutComponents()
{
    auto area = getLocalBounds();
    auto buttonArea = area.removeFromBottom(60).reduced(20, 10);
    auto statusArea = area.removeFromTop(50).reduced(20, 10);

    resetButton_.setBounds(buttonArea);
    statusLabel_.setBounds(statusArea);
}

void SingleNoteTestEditor::updateStatusLabel()
{
    const int noteOnCount = processor_.getNoteOnCount();
    const int noteOffCount = processor_.getNoteOffCount();

    juce::String status;
    if (noteOnCount == 0 && noteOffCount == 0)
    {
        status = "Status: Ready (not started)";
    }
    else if (noteOnCount == 1 && noteOffCount == 0)
    {
        status = "Status: Playing...";
    }
    else if (noteOnCount == 1 && noteOffCount == 1)
    {
        status = "Status: ✓ Complete - Note sent successfully!";
    }
    else
    {
        status = "Status: ⚠ Multiple events (on=" + juce::String(noteOnCount) +
                " off=" + juce::String(noteOffCount) + ")";
    }

    statusLabel_.setText(status, juce::dontSendNotification);
}

//==============================================================================
// JUCE Boilerplate
//==============================================================================

