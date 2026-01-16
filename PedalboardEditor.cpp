/*
==============================================================================
White Room Pedalboard Editor Implementation
==============================================================================
*/

#include "PedalboardEditor.h"

//==============================================================================
PedalboardEditor::PedalboardEditor (PedalboardProcessor& p)
    : AudioProcessorEditor (&p), processor (p)
{
    // Set up the WebView
    pedalboardHTMLFile = juce::File::getSpecialLocation(juce::File::currentExecutableFile)
        .getParentDirectory()
        .getChildFile("web_ui")
        .getChildFile("pedalboard.html");

    // If not found in executable dir, try development location
    if (!pedalboardHTMLFile.exists())
    {
        pedalboardHTMLFile = juce::File(__FILE__)
            .getParentDirectory()
            .getChildFile("web_ui")
            .getChildFile("pedalboard.html");
    }

    // Create WebView component
    webView = std::make_unique<juce::WebBrowserComponent>(
        juce::WebBrowserComponent::Options()
    );

    addAndMakeVisible(*webView);

    // Load the HTML file
    if (pedalboardHTMLFile.exists())
    {
        webView->goToURL(pedalboardHTMLFile.getFullPathName());
    }
    else
    {
        // Show error if HTML file not found
        webView->goToURL("data:text/html,<h1>Pedalboard UI not found</h1>");
    }

    // Set editor size
    setSize (1400, 800);
    setResizable(true, true);
    setResizeLimits(800, 600, 1920, 1200);
}

PedalboardEditor::~PedalboardEditor()
{
}

//==============================================================================
void PedalboardEditor::paint (juce::Graphics& g)
{
    g.fillAll (getLookAndFeel().findColour (juce::ResizableWindow::backgroundColourId));
}

void PedalboardEditor::resized()
{
    webView->setBounds(getLocalBounds());
}

//==============================================================================
void PedalboardEditor::addPedal(const juce::String& pedalType, int position)
{
    processor.addPedal(pedalType.toStdString(), position);
    updateJavaScriptState();
}

void PedalboardEditor::removePedal(int position)
{
    processor.removePedal(position);
    updateJavaScriptState();
}

void PedalboardEditor::movePedal(int fromPosition, int toPosition)
{
    processor.movePedal(fromPosition, toPosition);
    updateJavaScriptState();
}

void PedalboardEditor::setPedalBypass(int position, bool bypassed)
{
    if (auto* pedal = processor.getPedal(position))
    {
        pedal->setBypass(bypassed);
    }
}

void PedalboardEditor::setPedalParameter(int position, int parameterIndex, float value)
{
    if (auto* pedal = processor.getPedal(position))
    {
        pedal->getDSP()->setParameterValue(parameterIndex, value);
    }
}

void PedalboardEditor::savePreset(const juce::String& presetName)
{
    processor.savePreset(presetName.toStdString());
}

void PedalboardEditor::loadPreset(const juce::String& presetName)
{
    processor.loadPreset(presetName.toStdString());
    updateJavaScriptState();
}

void PedalboardEditor::saveScene(int sceneNumber, const juce::String& sceneName)
{
    processor.saveScene(sceneNumber, sceneName.toStdString());
}

void PedalboardEditor::loadScene(int sceneNumber)
{
    processor.loadScene(sceneNumber);
    updateJavaScriptState();
}

//==============================================================================
juce::var PedalboardEditor::getPedalChain() const
{
    juce::Array<juce::var> pedalArray;

    for (int i = 0; i < processor.getNumPedals(); ++i)
    {
        if (auto* pedal = processor.getPedal(i))
        {
            auto* pedalObj = new juce::DynamicObject();
            pedalObj->setProperty("index", i);
            pedalObj->setProperty("type", juce::var(pedal->getName()));
            pedalObj->setProperty("bypassed", pedal->isBypassed());
            pedalArray.add(juce::var(pedalObj));
        }
    }

    return juce::var(pedalArray);
}

juce::var PedalboardEditor::getPedalParameters(int position) const
{
    if (auto* pedal = processor.getPedal(position))
    {
        // Convert JSON parameters to juce::var
        auto params = pedal->getParameters();
        return juce::var(params.dump());
    }

    return juce::var();
}

void PedalboardEditor::updateJavaScriptState()
{
    // Get current pedal chain state
    auto pedalChain = getPedalChain();

    // Execute JavaScript to update UI
    webView->evaluateJavascript(
        "if (typeof updatePedalChain === 'function') { "
        "updatePedalChain(" + pedalChain.toString() + "); "
        "}"
    );
}
