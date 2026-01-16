/*
  ==============================================================================

    NexSynthPluginEditor.cpp
    Created: January 8, 2026
    Author:  Bret Bouchard

    Plugin editor for NexSynth FM Synthesizer

  ==============================================================================
*/

#include "NexSynthPluginEditor.h"
#include "NexSynthPluginProcessor.h"

//==============================================================================
// NexSynthPluginEditor Implementation
//==============================================================================

NexSynthPluginEditor::NexSynthPluginEditor(NexSynthPluginProcessor& p)
    : AudioProcessorEditor(&p), audioProcessor(p) {
    setResizable(true, true);
    setResizeLimits(1000, 800, 1400, 1100);

    createControls();
    setupAttachments();
    layoutControls();

    startTimerHz(30); // Update UI at 30 Hz
}

NexSynthPluginEditor::~NexSynthPluginEditor() = default;

void NexSynthPluginEditor::paint(juce::Graphics& g) {
    g.fillAll(juce::Colours::black);

    g.setColour(juce::Colours::white);
    g.setFont(24.0f);
    g.drawFittedText("NexSynth FM", 0, 10, getWidth(), 40, juce::Justification::centred, 1);

    g.setFont(14.0f);
    g.setColour(juce::Colours::lightgrey);
    g.drawFittedText("5-Operator FM Synthesizer", 0, 40, getWidth(), 20, juce::Justification::centred, 1);
}

void NexSynthPluginEditor::resized() {
    layoutControls();
}

void NexSynthPluginEditor::createControls() {
    // Global controls
    masterVolumeSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                        juce::Slider::NoTextBox);
    pitchBendRangeSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                          juce::Slider::NoTextBox);

    // Create operator controls
    for (int i = 0; i < 5; ++i) {
        operatorControls[i].ratioSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                                         juce::Slider::NoTextBox);
        operatorControls[i].detuneSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                                          juce::Slider::NoTextBox);
        operatorControls[i].modIndexSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                                            juce::Slider::NoTextBox);
        operatorControls[i].outputLevelSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                                               juce::Slider::NoTextBox);
        operatorControls[i].feedbackSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                                            juce::Slider::NoTextBox);
        operatorControls[i].attackSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                                          juce::Slider::NoTextBox);
        operatorControls[i].decaySlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                                         juce::Slider::NoTextBox);
        operatorControls[i].sustainSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                                            juce::Slider::NoTextBox);
        operatorControls[i].releaseSlider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                                            juce::Slider::NoTextBox);
    }

    // Modulation matrix controls
    mod2to1Slider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                   juce::Slider::NoTextBox);
    mod3to2Slider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                   juce::Slider::NoTextBox);
    mod4to2Slider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                   juce::Slider::NoTextBox);
    mod5to3Slider = std::make_unique<juce::Slider>(juce::Slider::RotaryHorizontalVerticalDrag,
                                                   juce::Slider::NoTextBox);

    // Add all controls to this component
    addAndMakeVisible(*masterVolumeSlider);
    addAndMakeVisible(*pitchBendRangeSlider);

    for (int i = 0; i < 5; ++i) {
        addAndMakeVisible(*operatorControls[i].ratioSlider);
        addAndMakeVisible(*operatorControls[i].detuneSlider);
        addAndMakeVisible(*operatorControls[i].modIndexSlider);
        addAndMakeVisible(*operatorControls[i].outputLevelSlider);
        addAndMakeVisible(*operatorControls[i].feedbackSlider);
        addAndMakeVisible(*operatorControls[i].attackSlider);
        addAndMakeVisible(*operatorControls[i].decaySlider);
        addAndMakeVisible(*operatorControls[i].sustainSlider);
        addAndMakeVisible(*operatorControls[i].releaseSlider);
    }

    addAndMakeVisible(*mod2to1Slider);
    addAndMakeVisible(*mod3to2Slider);
    addAndMakeVisible(*mod4to2Slider);
    addAndMakeVisible(*mod5to3Slider);
}

void NexSynthPluginEditor::setupAttachments() {
    auto& params = audioProcessor.getParameters();

    // Global attachments
    masterVolumeAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "masterVolume", *masterVolumeSlider);
    pitchBendRangeAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "pitchBendRange", *pitchBendRangeSlider);

    // Operator attachments
    for (int i = 0; i < 5; ++i) {
        juce::String opPrefix = "op" + juce::String(i + 1) + "_";

        operatorAttachments[i].ratioAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
            params, opPrefix + "ratio", *operatorControls[i].ratioSlider);
        operatorAttachments[i].detuneAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
            params, opPrefix + "detune", *operatorControls[i].detuneSlider);
        operatorAttachments[i].modIndexAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
            params, opPrefix + "modIndex", *operatorControls[i].modIndexSlider);
        operatorAttachments[i].outputLevelAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
            params, opPrefix + "outputLevel", *operatorControls[i].outputLevelSlider);
        operatorAttachments[i].feedbackAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
            params, opPrefix + "feedback", *operatorControls[i].feedbackSlider);
        operatorAttachments[i].attackAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
            params, opPrefix + "attack", *operatorControls[i].attackSlider);
        operatorAttachments[i].decayAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
            params, opPrefix + "decay", *operatorControls[i].decaySlider);
        operatorAttachments[i].sustainAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
            params, opPrefix + "sustain", *operatorControls[i].sustainSlider);
        operatorAttachments[i].releaseAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
            params, opPrefix + "release", *operatorControls[i].releaseSlider);
    }

    // Modulation matrix attachments
    mod2to1Attachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "mod2to1", *mod2to1Slider);
    mod3to2Attachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "mod3to2", *mod3to2Slider);
    mod4to2Attachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "mod4to2", *mod4to2Slider);
    mod5to3Attachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
        params, "mod5to3", *mod5to3Slider);
}

void NexSynthPluginEditor::layoutControls() {
    const int sliderWidth = 50;
    const int sliderHeight = 70;
    const int smallSpacing = 10;
    const int largeSpacing = 20;
    const int startX = 15;
    const int startY = 100;

    int x = startX;
    int y = startY;

    // Global section
    createLabel("Global", x, y - 25, 100, 20);
    masterVolumeSlider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + smallSpacing;
    pitchBendRangeSlider->setBounds(x, y, sliderWidth, sliderHeight);

    // Modulation matrix section
    y += sliderHeight + largeSpacing;
    x = startX;

    createLabel("Modulation", x, y - 25, 200, 20);
    createLabel("2->1", x, y + sliderHeight + 5, sliderWidth, 15);
    mod2to1Slider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + smallSpacing;
    createLabel("3->2", x, y + sliderHeight + 5, sliderWidth, 15);
    mod3to2Slider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + smallSpacing;
    createLabel("4->2", x, y + sliderHeight + 5, sliderWidth, 15);
    mod4to2Slider->setBounds(x, y, sliderWidth, sliderHeight);
    x += sliderWidth + smallSpacing;
    createLabel("5->3", x, y + sliderHeight + 5, sliderWidth, 15);
    mod5to3Slider->setBounds(x, y, sliderWidth, sliderHeight);

    // Operator sections (5 operators in 2 rows)
    y += sliderHeight + largeSpacing + 20;

    for (int opRow = 0; opRow < 3; ++opRow) {
        x = startX;

        for (int opCol = 0; opCol < 2; ++opCol) {
            int opIndex = opRow * 2 + opCol;
            if (opIndex >= 5) break;

            // Operator header
            createLabel("Operator " + juce::String(opIndex + 1), x, y - 25, 150, 20);

            // First row of sliders (Ratio, Detune, Mod Index, Output, Feedback)
            int opX = x;
            operatorControls[opIndex].ratioSlider->setBounds(opX, y, sliderWidth, sliderHeight);
            opX += sliderWidth + smallSpacing;
            operatorControls[opIndex].detuneSlider->setBounds(opX, y, sliderWidth, sliderHeight);
            opX += sliderWidth + smallSpacing;
            operatorControls[opIndex].modIndexSlider->setBounds(opX, y, sliderWidth, sliderHeight);
            opX += sliderWidth + smallSpacing;
            operatorControls[opIndex].outputLevelSlider->setBounds(opX, y, sliderWidth, sliderHeight);
            opX += sliderWidth + smallSpacing;
            operatorControls[opIndex].feedbackSlider->setBounds(opX, y, sliderWidth, sliderHeight);

            // Second row of sliders (Attack, Decay, Sustain, Release)
            y += sliderHeight + smallSpacing;
            opX = x;
            operatorControls[opIndex].attackSlider->setBounds(opX, y, sliderWidth, sliderHeight);
            opX += sliderWidth + smallSpacing;
            operatorControls[opIndex].decaySlider->setBounds(opX, y, sliderWidth, sliderHeight);
            opX += sliderWidth + smallSpacing;
            operatorControls[opIndex].sustainSlider->setBounds(opX, y, sliderWidth, sliderHeight);
            opX += sliderWidth + smallSpacing;
            operatorControls[opIndex].releaseSlider->setBounds(opX, y, sliderWidth, sliderHeight);

            y += sliderHeight + largeSpacing;
        }
    }
}

juce::Label* NexSynthPluginEditor::createLabel(const juce::String& text, int x, int y, int width, int height) {
    auto label = std::make_unique<juce::Label>();
    label->setText(text, juce::dontSendNotification);
    label->setFont(12.0f);
    label->setColour(juce::Label::textColourId, juce::Colours::lightgrey);
    label->setJustificationType(juce::Justification::centred);
    label->setBounds(x, y, width, height);
    addAndMakeVisible(*label);
    labels.push_back(std::move(label));
    return labels.back().get();
}

void NexSynthPluginEditor::sliderValueChanged(juce::Slider* slider) {
    // Slider changes are handled by parameter attachments
    juce::ignoreUnused(slider);
}

void NexSynthPluginEditor::timerCallback() {
    // Update any real-time UI displays here
    // For now, just repaint for smooth visual updates
    repaint();
}
