/*
==============================================================================
White Room Pedalboard Editor
==============================================================================

WebView-based editor for the pedalboard plugin
*/

#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include "PedalboardProcessor.h"

//==============================================================================
/**
    Pedalboard Editor using WebView
*/
class PedalboardEditor : public juce::AudioProcessorEditor
{
public:
    //==============================================================================
    PedalboardEditor (PedalboardProcessor&);
    ~PedalboardEditor() override;

    //==============================================================================
    void paint (juce::Graphics&) override;
    void resized() override;

    //==============================================================================
    // JavaScript bridge functions
    void addPedal(const juce::String& pedalType, int position);
    void removePedal(int position);
    void movePedal(int fromPosition, int toPosition);
    void setPedalBypass(int position, bool bypassed);
    void setPedalParameter(int position, int parameterIndex, float value);
    void savePreset(const juce::String& presetName);
    void loadPreset(const juce::String& presetName);
    void saveScene(int sceneNumber, const juce::String& sceneName);
    void loadScene(int sceneNumber);

private:
    //==============================================================================
    // This reference is provided as a quick way for your editor to
    // access the processor object that created it.
    PedalboardProcessor& processor;

    std::unique_ptr<juce::WebBrowserComponent> webView;
    juce::File pedalboardHTMLFile;

    // JavaScript binding
    juce::var getPedalChain() const;
    juce::var getPedalParameters(int position) const;
    void updateJavaScriptState();

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PedalboardEditor)
};
