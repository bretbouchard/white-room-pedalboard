/*
  ==============================================================================

    BaseInstrumentEditor.h
    Created: January 7, 2026
    Author: Bret Bouchard

    Base class for instrument plugin editors with:
    - Automatic parameter attachment
    - Common UI components
    - Responsive layout
    - Dark theme styling

  ==============================================================================
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>

namespace PluginTemplates {

//==============================================================================
// UI Component Categories
//==============================================================================

enum class UIComponentType {
    slider,
    button,
    comboBox,
    label,
    meter
};

//==============================================================================
// Base Instrument Editor
//==============================================================================

class BaseInstrumentEditor : public juce::AudioProcessorEditor {
public:
    //==========================================================================
    // Constructor
    //==========================================================================

    BaseInstrumentEditor(juce::AudioProcessor& processor, juce::AudioProcessorValueTreeState& params)
        : juce::AudioProcessorEditor(processor)
        , parameters(params)
        , lastUIWidth_(400)
        , lastUIHeight_(300)
    {
        // Set up basic editor properties
        setResizable(true, true);
        setResizeLimits(300, 200, 2000, 1500);
        setSize(lastUIWidth_, lastUIHeight_);
    }

    //==========================================================================
    // Destructor
    //==========================================================================

    ~BaseInstrumentEditor() override = default;

    //==========================================================================
    // Painting
    //==========================================================================

    void paint(juce::Graphics& g) override
    {
        g.fillAll(getLookAndFeel().findColour(juce::ResizableWindow::backgroundColourId));
    }

    //==========================================================================
    // Resizing
    //==========================================================================

    void resized() override
    {
        // Save size for restoration
        lastUIWidth_ = getWidth();
        lastUIHeight_ = getHeight();

        // Subclass should implement actual layout
        layoutComponents();
    }

    //==========================================================================
    // UI Component Builders
    //==========================================================================

    // Create a slider with automatic parameter attachment
    std::unique_ptr<juce::Slider> createParameterSlider(
        const juce::String& parameterID,
        const juce::String& labelText = "")
    {
        auto slider = std::make_unique<juce::Slider>();

        if (auto* param = parameters.getParameter(parameterID))
        {
            // Create attachment (auto-connects slider to parameter)
            auto attachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(
                parameters, parameterID, *slider);

            // Store attachment to keep it alive
            sliderAttachments_.push_back(std::move(attachment));

            // Set slider style
            slider->setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
            slider->setTextBoxStyle(juce::Slider::TextBoxBelow, false, 80, 20);

            // Add label if provided
            if (labelText.isNotEmpty())
            {
                auto label = std::make_unique<juce::Label>(labelText, labelText);
                label->attachToComponent(slider.get(), false);
                label->setJustificationType(juce::Justification::centred);
                label->setFont(juce::Font(juce::FontOptions(12.0f)));
                labels_.push_back(std::move(label));
            }
        }

        return slider;
    }

    // Create a button with automatic parameter attachment
    std::unique_ptr<juce::ToggleButton> createParameterButton(
        const juce::String& parameterID,
        const juce::String& buttonText)
    {
        auto button = std::make_unique<juce::ToggleButton>(buttonText);

        if (auto* param = parameters.getParameter(parameterID))
        {
            // Create attachment
            auto attachment = std::make_unique<juce::AudioProcessorValueTreeState::ButtonAttachment>(
                parameters, parameterID, *button);

            buttonAttachments_.push_back(std::move(attachment));
        }

        return button;
    }

    // Create a combo box with automatic parameter attachment
    std::unique_ptr<juce::ComboBox> createParameterComboBox(
        const juce::String& parameterID,
        const juce::String& labelText)
    {
        auto comboBox = std::make_unique<juce::ComboBox>();

        if (auto* param = parameters.getParameter(parameterID))
        {
            // Create attachment
            auto attachment = std::make_unique<juce::AudioProcessorValueTreeState::ComboBoxAttachment>(
                parameters, parameterID, *comboBox);

            comboBoxAttachments_.push_back(std::move(attachment));

            // Add label if provided
            if (labelText.isNotEmpty())
            {
                auto label = std::make_unique<juce::Label>(labelText, labelText);
                label->attachToComponent(comboBox.get(), false);
                label->setJustificationType(juce::Justification::centredLeft);
                label->setFont(juce::Font(juce::FontOptions(12.0f)));
                labels_.push_back(std::move(label));
            }
        }

        return comboBox;
    }

    // Create a horizontal meter
    std::unique_ptr<juce::Component> createMeter(const juce::String& name)
    {
        auto meter = std::make_unique<MeterComponent>();
        meter->setName(name);
        meters_.push_back(std::move(meter));
        return std::move(meters_.back());
    }

protected:
    //==========================================================================
    // Protected Members
    //==========================================================================

    juce::AudioProcessorValueTreeState& parameters;

    //==========================================================================
    // Layout Override Point
    //==========================================================================

    virtual void layoutComponents() = 0;

private:
    //==========================================================================
    // Private Members
    //==========================================================================

    int lastUIWidth_;
    int lastUIHeight_;

    // Store attachments to keep them alive
    std::vector<std::unique_ptr<juce::AudioProcessorValueTreeState::SliderAttachment>> sliderAttachments_;
    std::vector<std::unique_ptr<juce::AudioProcessorValueTreeState::ButtonAttachment>> buttonAttachments_;
    std::vector<std::unique_ptr<juce::AudioProcessorValueTreeState::ComboBoxAttachment>> comboBoxAttachments_;

    // Store labels and meters
    std::vector<std::unique_ptr<juce::Label>> labels_;
    std::vector<std::unique_ptr<juce::Component>> meters_;

    //==========================================================================
    // Simple Meter Component
    //==========================================================================

    struct MeterComponent : public juce::Component
    {
        MeterComponent() : level(0.0f) {}

        void paint(juce::Graphics& g) override
        {
            auto bounds = getLocalBounds().toFloat();

            // Background
            g.setColour(juce::Colours::black);
            g.fillRect(bounds);

            // Level
            g.setColour(getColourForLevel(level));
            auto levelBounds = bounds.withWidth(bounds.getWidth() * level);
            g.fillRect(levelBounds);
        }

        void setLevel(float newLevel) { level = juce::jlimit(0.0f, 1.0f, newLevel); repaint(); }

        juce::Colour getColourForLevel(float lvl)
        {
            if (lvl < 0.7f) return juce::Colours::green;
            if (lvl < 0.9f) return juce::Colours::orange;
            return juce::Colours::red;
        }

        float level;
    };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(BaseInstrumentEditor)
};

} // namespace PluginTemplates
