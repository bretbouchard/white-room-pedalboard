#pragma once

#include <juce_gui_basics/juce_gui_basics.h>

/**
 * Stub IconManager class
 *
 * This is a minimal stub implementation to allow compilation.
 * The IconBadgeComponent will use its fallback rendering when
 * IconManager::getInstance() returns nullptr.
 */
class IconManager
{
public:
    //==============================================================================
    // Singleton interface - returns nullptr for stub implementation
    static IconManager* getInstance() { return nullptr; }

    //==============================================================================
    // Icon drawing interface - not implemented in stub
    virtual void drawIcon(juce::Graphics& g,
                         const juce::String& iconKey,
                         const juce::Rectangle<float>& bounds,
                         juce::Justification justification = juce::Justification::centred) {}

    //==============================================================================
    virtual ~IconManager() = default;

private:
    //==============================================================================
    IconManager() = default;
};