#include <gtest/gtest.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include "midi/MIDIDeviceManager_Test.h"
#include "midi/MIDIProcessor_Test.h"
#include "control/ControlMapper_Test.h"
#include "recording/MIDIRecorder_Test.h"
#include "websocket/WebSocketMIDIInterface_Test.h"

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}