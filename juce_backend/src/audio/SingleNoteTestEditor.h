/*
  ==============================================================================

    SingleNoteTestEditor.h
    Minimal GUI for single note test processor

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include "SingleNoteTestProcessor.h"

//==============================================================================
// Single Note Test Editor
//==============================================================================

class SingleNoteTestEditor : public juce::AudioProcessorEditor,
                              public juce::Timer
{
public:
    explicit SingleNoteTestEditor(SingleNoteTestProcessor& processor);
    ~SingleNoteTestEditor() override;

    //==========================================================================
    // Graphics
    //==========================================================================

    void paint(juce::Graphics& g) override;
    void resized() override;

    //==========================================================================
    // Timer
    //==========================================================================

    void timerCallback() override;

private:
    //==========================================================================
    // Components
    //==========================================================================

    SingleNoteTestProcessor& processor_;
    juce::TextButton resetButton_;
    juce::Label statusLabel_;
    juce::Label infoLabel_;

    //==========================================================================
    // Layout
    //==========================================================================

    void layoutComponents();
    void updateStatusLabel();

    //==========================================================================
    // JUCE Declarations
    //==========================================================================

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SingleNoteTestEditor)
};
