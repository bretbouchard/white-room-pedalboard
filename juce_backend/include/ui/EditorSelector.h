#pragma once

#include <JuceHeader.h>
#include "ui/PianoRollEditor.h"
#include "ui/TablatureEditor.h"
#include "ui/IconTextButton.h"

namespace ui {

class EditorSelector : public juce::Component,
                       public juce::ChangeListener,
                       public juce::Button::Listener
{
public:
    enum class EditorType
    {
        PianoRoll,
        Tablature,
        DrumPattern,
        Score,
        StepSequencer
    };

    EditorSelector();
    ~EditorSelector() override;

    // Component interface
    void paint (juce::Graphics& g) override;
    void resized() override;

    // Button listener interface
    void buttonClicked (juce::Button* button) override;

    // Change listener interface
    void changeListenerCallback (juce::ChangeBroadcaster* source) override;

    // Editor management
    void setActiveEditor (EditorType type);
    EditorType getActiveEditorType() const { return currentEditorType; }

    // Factory methods for creating editors
    std::unique_ptr<juce::Component> createEditor (EditorType type);

    // Editor access
    PianoRollEditor* getPianoRollEditor() const;
    TablatureEditor* getTablatureEditor() const;

    // Configuration
    void setEditorConfiguration (EditorType type, const juce::var& config);
    juce::var getEditorConfiguration (EditorType type) const;

private:
    void createEditorButtons();
    void switchToEditor (EditorType type);
    void updateButtonStates();

    // Editor factory - CRITICAL: This is where std::make_unique calls happen
    std::unique_ptr<PianoRollEditor> pianoRollEditor;
    std::unique_ptr<TablatureEditor> tablatureEditor;

    // These will be implemented as needed
    // std::unique_ptr<DrumPatternEditor> drumPatternEditor;
    // std::unique_ptr<ScoreEditor> scoreEditor;
    // std::unique_ptr<StepSequencerEditor> stepSequencerEditor;

    // UI components
    std::unique_ptr<ui::IconTextButton> pianoRollButton;
    std::unique_ptr<ui::IconTextButton> tablatureButton;
    std::unique_ptr<ui::IconTextButton> drumPatternButton;
    std::unique_ptr<ui::IconTextButton> scoreButton;
    std::unique_ptr<ui::IconTextButton> stepSequencerButton;

    // Current state
    EditorType currentEditorType = EditorType::PianoRoll;
    juce::Component* currentEditor = nullptr;

    // Configuration storage - use array instead of HashMap to avoid hash function issues
    juce::Array<juce::var> editorConfigs;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (EditorSelector)
};

} // namespace ui