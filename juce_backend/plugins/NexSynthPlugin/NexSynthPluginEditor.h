/*
  ==============================================================================

    NexSynthPluginEditor.h
    Created: January 8, 2026
    Author:  Bret Bouchard

    Plugin editor for NexSynth FM Synthesizer
    Provides UI controls for all synth parameters

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>

class NexSynthPluginProcessor;

/**
 * Plugin editor for NexSynth FM Synthesizer
 * Provides UI controls for all synth parameters
 */
class NexSynthPluginEditor : public juce::AudioProcessorEditor,
                              private juce::Slider::Listener,
                              private juce::Timer {
public:
    NexSynthPluginEditor(NexSynthPluginProcessor&);
    ~NexSynthPluginEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    // This reference is provided as a quick way for your editor to
    // access the processor object that created it.
    NexSynthPluginProcessor& audioProcessor;

    // UI Components - Global
    std::unique_ptr<juce::Slider> masterVolumeSlider;
    std::unique_ptr<juce::Slider> pitchBendRangeSlider;

    // UI Components - FM Operators (5 operators)
    struct OperatorControls {
        std::unique_ptr<juce::Slider> ratioSlider;
        std::unique_ptr<juce::Slider> detuneSlider;
        std::unique_ptr<juce::Slider> modIndexSlider;
        std::unique_ptr<juce::Slider> outputLevelSlider;
        std::unique_ptr<juce::Slider> feedbackSlider;
        std::unique_ptr<juce::Slider> attackSlider;
        std::unique_ptr<juce::Slider> decaySlider;
        std::unique_ptr<juce::Slider> sustainSlider;
        std::unique_ptr<juce::Slider> releaseSlider;
    };

    std::array<OperatorControls, 5> operatorControls;

    // UI Components - Modulation Matrix
    std::unique_ptr<juce::Slider> mod2to1Slider;
    std::unique_ptr<juce::Slider> mod3to2Slider;
    std::unique_ptr<juce::Slider> mod4to2Slider;
    std::unique_ptr<juce::Slider> mod5to3Slider;

    // Labels
    std::vector<std::unique_ptr<juce::Label>> labels;

    // Parameter attachments
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> masterVolumeAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> pitchBendRangeAttachment;

    struct OperatorAttachments {
        std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> ratioAttachment;
        std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> detuneAttachment;
        std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> modIndexAttachment;
        std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> outputLevelAttachment;
        std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> feedbackAttachment;
        std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> attackAttachment;
        std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> decayAttachment;
        std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> sustainAttachment;
        std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> releaseAttachment;
    };

    std::array<OperatorAttachments, 5> operatorAttachments;

    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> mod2to1Attachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> mod3to2Attachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> mod4to2Attachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> mod5to3Attachment;

    // UI setup methods
    void createControls();
    void setupAttachments();
    void layoutControls();

    // Helper methods
    juce::Label* createLabel(const juce::String& text, int x, int y, int width, int height);
    void sliderValueChanged(juce::Slider* slider) override;
    void timerCallback() override;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(NexSynthPluginEditor)
};
