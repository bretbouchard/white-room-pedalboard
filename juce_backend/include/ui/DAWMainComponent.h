#pragma once

#include <JuceHeader.h>
#include <memory>
#include "audio/DropoutPrevention.h"
// #include "ui/TransportControlsComponent.h" // Temporarily disabled for JUCE v8 compatibility


namespace SchillingerEcosystem::UI {

class DAWMainComponent : public juce::Component,
                         public juce::KeyListener
{
public:
    DAWMainComponent();
    ~DAWMainComponent() override;

    void paint (juce::Graphics& g) override;
    void resized() override;

    // Keyboard handling
    bool keyPressed (const juce::KeyPress& key, juce::Component* originatingComponent) override;

private:
    // Audio system
    std::unique_ptr<SchillingerEcosystem::Audio::DropoutPrevention> dropoutSystem;

    // Main UI components
    std::unique_ptr<juce::Component> trackView;
    std::unique_ptr<juce::Component> editorSelector;
    std::unique_ptr<juce::Component> miniTimeline;
    std::unique_ptr<juce::Component> songPlaceholder;

    // Professional transport controls - Temporarily disabled for JUCE v8 compatibility
    // std::unique_ptr<jive::TransportControlsComponent> transportControls;

    // Layout regions
    juce::Viewport trackViewport;
    juce::Component editorContainer;
    juce::Component timelineContainer;
    juce::Component sidebar;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (DAWMainComponent)
};

} // namespace SchillingerEcosystem::UI