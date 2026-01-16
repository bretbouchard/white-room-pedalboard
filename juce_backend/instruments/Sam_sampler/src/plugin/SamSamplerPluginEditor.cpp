/*
  ==============================================================================

    SamSamplerPluginEditor.cpp
    Created: January 8, 2026
    Author:  Bret Bouchard

    Plugin editor implementation for Sam Sampler

  ==============================================================================
*/

#include "SamSamplerPluginEditor.h"
#include "SamSamplerPluginProcessor.h"

//==============================================================================
// SamSamplerPluginEditor Implementation
//==============================================================================

SamSamplerPluginEditor::SamSamplerPluginEditor(SamSamplerPluginProcessor& p)
    : AudioProcessorEditor(&p), audioProcessor(p) {
    setResizable(true, true);
    setResizeLimits(900, 700, 1400, 1000);

    createControls();
    setupAttachments();
    layoutControls();

    startTimerHz(30); // Update UI at 30 Hz
}

SamSamplerPluginEditor::~SamSamplerPluginEditor() = default;

void SamSamplerPluginEditor::paint(juce::Graphics& g) {
    g.fillAll(juce::Colours::black);

    g.setColour(juce::Colours::white);
    g.setFont(24.0f);
    g.drawFittedText("Sam Sampler", 0, 10, getWidth(), 40, juce::Justification::centred, 1);

    g.setFont(14.0f);
    g.setColour(juce::Colours::lightgrey);
    g.drawFittedText("Professional SF2 Sampler", 0, 40, getWidth(), 20, juce::Justification::centred, 1);
}

void SamSamplerPluginEditor::resized() {
    layoutControls();
}

void SamSamplerPluginEditor::createControls() {
    // Global controls
    masterVolumeSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                         juce::Slider::NoTextBox);
    pitchBendRangeSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                           juce::Slider::NoTextBox);

    // Sample playback controls
    basePitchSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                      juce::Slider::NoTextBox);
    sampleStartSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                        juce::Slider::NoTextBox);
    sampleEndSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                      juce::Slider::NoTextBox);
    loopEnabledButton = std::make_unique<juce::ToggleButton>("Loop Enabled");
    loopStartSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                      juce::Slider::NoTextBox);
    loopEndSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                    juce::Slider::NoTextBox);
    crossfadeSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                      juce::Slider::NoTextBox);

    // Envelope controls
    envAttackSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                      juce::Slider::NoTextBox);
    envDecaySlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                     juce::Slider::NoTextBox);
    envSustainSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                       juce::Slider::NoTextBox);
    envReleaseSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                       juce::Slider::NoTextBox);

    // Filter controls
    filterCutoffSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                         juce::Slider::NoTextBox);
    filterResonanceSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                           juce::Slider::NoTextBox);
    filterEnabledButton = std::make_unique<juce::ToggleButton>("Filter Enabled");

    // Effects controls
    reverbMixSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                      juce::Slider::NoTextBox);
    delayMixSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                     juce::Slider::NoTextBox);
    driveSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                  juce::Slider::NoTextBox);

    // Add all controls to this component
    addAndMakeVisible(*masterVolumeSlider);
    addAndMakeVisible(*pitchBendRangeSlider);

    addAndMakeVisible(*basePitchSlider);
    addAndMakeVisible(*sampleStartSlider);
    addAndMakeVisible(*sampleEndSlider);
    addAndMakeVisible(*loopEnabledButton);
    addAndMakeVisible(*loopStartSlider);
    addAndMakeVisible(*loopEndSlider);
    addAndMakeVisible(*crossfadeSlider);

    addAndMakeVisible(*envAttackSlider);
    addAndMakeVisible(*envDecaySlider);
    addAndMakeVisible(*envSustainSlider);
    addAndMakeVisible(*envReleaseSlider);

    addAndMakeVisible(*filterCutoffSlider);
    addAndMakeVisible(*filterResonanceSlider);
    addAndMakeVisible(*filterEnabledButton);

    addAndMakeVisible(*reverbMixSlider);
    addAndMakeVisible(*delayMixSlider);
    addAndMakeVisible(*driveSlider);
}

void SamSamplerPluginEditor::setupAttachments() {
    auto& params = audioProcessor.getParameters();

    // Global attachments
    masterVolumeAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "masterVolume", *masterVolumeSlider);
    pitchBendRangeAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "pitchBendRange", *pitchBendRangeSlider);

    // Sample playback attachments
    basePitchAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "basePitch", *basePitchSlider);
    sampleStartAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "sampleStart", *sampleStartSlider);
    sampleEndAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "sampleEnd", *sampleEndSlider);
    loopEnabledAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(
        params, "loopEnabled", *loopEnabledButton);
    loopStartAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "loopStart", *loopStartSlider);
    loopEndAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "loopEnd", *loopEndSlider);
    crossfadeAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "crossfade", *crossfadeSlider);

    // Envelope attachments
    envAttackAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "envAttack", *envAttackSlider);
    envDecayAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "envDecay", *envDecaySlider);
    envSustainAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "envSustain", *envSustainSlider);
    envReleaseAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "envRelease", *envReleaseSlider);

    // Filter attachments
    filterCutoffAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "filterCutoff", *filterCutoffSlider);
    filterResonanceAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "filterResonance", *filterResonanceSlider);
    filterEnabledAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(
        params, "filterEnabled", *filterEnabledButton);

    // Effects attachments
    reverbMixAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "reverbMix", *reverbMixSlider);
    delayMixAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "delayMix", *delayMixSlider);
    driveAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "drive", *driveSlider);
}

void SamSamplerPluginEditor::layoutControls() {
    const int sliderWidth = 60;
    const int sliderHeight = 80;
    const int spacing = 15;
    const int startX = 20;
    const int startY = 100;

    int x = startX;
    int y = startY;

    // Global section
    createLabel("Global", x, y - 25, 200, 20);

    masterVolumeSlider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + spacing;
    pitchBendRangeSlider->setBounds(x, y, sliderWidth, sliderHeight);

    // Sample Playback section
    y += sliderHeight + spacing + 30;
    x = startX;

    createLabel("Sample Playback", x, y - 25, 200, 20);

    basePitchSlider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + spacing;
    sampleStartSlider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + spacing;
    sampleEndSlider->setBounds(x, y, sliderWidth, sliderHeight);

    // Second row of sample controls
    y += sliderHeight + spacing;
    x = startX;

    loopEnabledButton->setBounds(x, y + sliderHeight/2, 100, 20);
    x += 110 + spacing;
    loopStartSlider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + spacing;
    loopEndSlider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + spacing;
    crossfadeSlider->setBounds(x, y, sliderWidth, sliderHeight);

    // Envelope section
    y += sliderHeight + spacing + 30;
    x = startX;

    createLabel("Envelope (ADSR)", x, y - 25, 200, 20);

    envAttackSlider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + spacing;
    envDecaySlider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + spacing;
    envSustainSlider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + spacing;
    envReleaseSlider->setBounds(x, y, sliderWidth, sliderHeight);

    // Filter section
    y += sliderHeight + spacing + 30;
    x = startX;

    createLabel("Filter", x, y - 25, 200, 20);

    filterEnabledButton->setBounds(x, y + sliderHeight/2, 100, 20);
    x += 110 + spacing;
    filterCutoffSlider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + spacing;
    filterResonanceSlider->setBounds(x, y, sliderWidth, sliderHeight);

    // Effects section
    y += sliderHeight + spacing + 30;
    x = startX;

    createLabel("Effects", x, y - 25, 200, 20);

    reverbMixSlider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + spacing;
    delayMixSlider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + spacing;
    driveSlider->setBounds(x, y, sliderWidth, sliderHeight);
}

juce::Label* SamSamplerPluginEditor::createLabel(const juce::String& text, int x, int y, int width, int height) {
    auto label = std::make_unique<juce::Label>();
    label->setText(text, juce::dontSendNotification);
    label->setFont(14.0f);
    label->setColour(juce::Label::textColourId, juce::Colours::lightgrey);
    label->setBounds(x, y, width, height);
    addAndMakeVisible(*label);
    labels.push_back(std::move(label));
    return labels.back().get();
}

void SamSamplerPluginEditor::sliderValueChanged(juce::Slider* slider) {
    // Slider changes are handled by parameter attachments
    juce::ignoreUnused(slider);
}

void SamSamplerPluginEditor::buttonClicked(juce::Button* button) {
    // Button changes are handled by parameter attachments
    juce::ignoreUnused(button);
}

void SamSamplerPluginEditor::timerCallback() {
    // Update any real-time UI displays here
    // For now, just repaint for smooth visual updates
    repaint();
}
