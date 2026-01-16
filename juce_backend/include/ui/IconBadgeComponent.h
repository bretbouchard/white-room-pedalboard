#pragma once

// JUCE includes
#include <juce_gui_basics/juce_gui_basics.h>

// Forward declarations
class IconManager;

/**
 * IconBadgeComponent displays an icon with customizable color
 *
 * Simple component that renders icons using the IconManager system.
 * Ideal for status indicators, badges, and decorative icons.
 */
class IconBadgeComponent : public juce::Component
{
public:
    //==============================================================================
    IconBadgeComponent();
    IconBadgeComponent(const juce::String& name);
    ~IconBadgeComponent() override = default;

    //==============================================================================
    // Icon configuration
    void setIconKey(const juce::String& key);
    juce::String getIconKey() const { return iconKey; }

    void setIconColour(juce::Colour colour);
    juce::Colour getIconColour() const { return iconColour; }

    //==============================================================================
    // Component overrides
    void paint(juce::Graphics& g) override;

private:
    //==============================================================================
    juce::String iconKey = "default";
    juce::Colour iconColour = juce::Colours::white;

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(IconBadgeComponent)
};