/*
  ==============================================================================

    SamSamplerPluginEditor.h
    Created: January 8, 2026
    Author:  Bret Bouchard

    Plugin editor for Sam Sampler instrument
    Provides UI controls for all instrument parameters

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>

class SamSamplerPluginProcessor;

/**
 * Plugin editor for Sam Sampler instrument
 * Provides UI controls for all instrument parameters
 */
class SamSamplerPluginEditor : public juce::AudioProcessorEditor,
                                private juce::Slider::Listener,
                                private juce::ToggleButton::Listener,
                                private juce::Timer {
public:
    SamSamplerPluginEditor(SamSamplerPluginProcessor&);
    ~SamSamplerPluginEditor() override;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    // This reference is provided as a quick way for your editor to
    // access the processor object that created it.
    SamSamplerPluginProcessor& audioProcessor;

    // UI Components - Global
    std::unique_ptr<juce::Slider> masterVolumeSlider;
    std::unique_ptr<juce::Slider> pitchBendRangeSlider;

    // UI Components - Sample Playback
    std::unique_ptr<juce::Slider> basePitchSlider;
    std::unique_ptr<juce::Slider> sampleStartSlider;
    std::unique_ptr<juce::Slider> sampleEndSlider;
    std::unique_ptr<juce::ToggleButton> loopEnabledButton;
    std::unique_ptr<juce::Slider> loopStartSlider;
    std::unique_ptr<juce::Slider> loopEndSlider;
    std::unique_ptr<juce::Slider> crossfadeSlider;

    // UI Components - Envelope
    std::unique_ptr<juce::Slider> envAttackSlider;
    std::unique_ptr<juce::Slider> envDecaySlider;
    std::unique_ptr<juce::Slider> envSustainSlider;
    std::unique_ptr<juce::Slider> envReleaseSlider;

    // UI Components - Filter
    std::unique_ptr<juce::Slider> filterCutoffSlider;
    std::unique_ptr<juce::Slider> filterResonanceSlider;
    std::unique_ptr<juce::ToggleButton> filterEnabledButton;

    // UI Components - Effects
    std::unique_ptr<juce::Slider> reverbMixSlider;
    std::unique_ptr<juce::Slider> delayMixSlider;
    std::unique_ptr<juce::Slider> driveSlider;

    // Labels
    std::vector<std::unique_ptr<juce::Label>> labels;

    // Parameter attachments
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> masterVolumeAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> pitchBendRangeAttachment;

    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> basePitchAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> sampleStartAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> sampleEndAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> loopEnabledAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> loopStartAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> loopEndAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> crossfadeAttachment;

    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> envAttackAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> envDecayAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> envSustainAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> envReleaseAttachment;

    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> filterCutoffAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> filterResonanceAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment> filterEnabledAttachment;

    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> reverbMixAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> delayMixAttachment;
    std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment> driveAttachment;

    // UI setup methods
    void createControls();
    void setupAttachments();
    void layoutControls();

    // Helper methods
    juce::Label* createLabel(const juce::String& text, int x, int y, int width, int height);
    void sliderValueChanged(juce::Slider* slider) override;
    void buttonClicked(juce::Button* button) override;
    void timerCallback() override;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SamSamplerPluginEditor)
};
