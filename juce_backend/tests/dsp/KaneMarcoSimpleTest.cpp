/*
  Simple diagnostic test to isolate Kane Marco segfault
*/

#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_dsp/juce_dsp.h>
#include "../../include/dsp/KaneMarcoDSP.h"

int main(int argc, char** argv)
{
    printf("Step 1: Initializing JUCE...\n");
    juce::MessageManager::getInstance();

    printf("Step 2: Creating KaneMarcoDSP...\n");
    fflush(stdout);

    try {
        KaneMarcoDSP* synth = new KaneMarcoDSP();
        printf("Step 3: KaneMarcoDSP created successfully!\n");
        fflush(stdout);

        printf("Step 4: Calling prepareToPlay...\n");
        fflush(stdout);

        synth->prepareToPlay(48000.0, 512);
        printf("Step 5: prepareToPlay completed!\n");
        fflush(stdout);

        printf("Step 6: Creating audio buffer...\n");
        fflush(stdout);

        juce::AudioBuffer<float> buffer(2, 512);
        juce::MidiBuffer midi;

        printf("Step 7: Processing audio block...\n");
        fflush(stdout);

        synth->processBlock(buffer, midi);
        printf("Step 8: processBlock completed!\n");
        fflush(stdout);

        printf("Step 9: Cleaning up...\n");
        delete synth;

        printf("\n✅ SUCCESS: All steps completed without crash!\n");
        fflush(stdout);

        juce::MessageManager::deleteInstance();
        return 0;

    } catch (const std::exception& e) {
        printf("\n❌ EXCEPTION: %s\n", e.what());
        fflush(stdout);
        juce::MessageManager::deleteInstance();
        return 1;
    } catch (...) {
        printf("\n❌ UNKNOWN EXCEPTION\n");
        fflush(stdout);
        juce::MessageManager::deleteInstance();
        return 1;
    }
}
