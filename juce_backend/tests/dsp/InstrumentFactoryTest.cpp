/*
  ==============================================================================

    InstrumentFactoryTest.cpp
    Created: December 30, 2025
    Author:  Bret Bouchard

    Unit tests for instrument factory system

  ==============================================================================
*/

#include "dsp/InstrumentDSP.h"
#include <cassert>
#include <iostream>
#include <cstring>

namespace Test {

//==============================================================================
// Mock Instrument for Testing
//==============================================================================

class MockInstrument : public DSP::InstrumentDSP
{
public:
    MockInstrument() = default;
    ~MockInstrument() override = default;

    bool prepare(double sampleRate, int blockSize) override {
        sampleRate_ = sampleRate;
        blockSize_ = blockSize;
        return true;
    }

    void reset() override {
        resetCount_++;
    }

    void process(float** outputs, int numChannels, int numSamples) override {
        // Generate silence
        for (int ch = 0; ch < numChannels; ++ch) {
            for (int i = 0; i < numSamples; ++i) {
                outputs[ch][i] = 0.0f;
            }
        }
    }

    void handleEvent(const DSP::ScheduledEvent& event) override {
        lastEventType_ = event.type;
    }

    float getParameter(const char* paramId) const override {
        if (std::strcmp(paramId, "test") == 0) {
            return testParam_;
        }
        return 0.0f;
    }

    void setParameter(const char* paramId, float value) override {
        if (std::strcmp(paramId, "test") == 0) {
            testParam_ = value;
        }
    }

    bool savePreset(char* jsonBuffer, int jsonBufferSize) const override {
        if (jsonBufferSize > 0) {
            jsonBuffer[0] = '{';
            jsonBuffer[1] = '}';
            jsonBuffer[2] = '\0';
            return true;
        }
        return false;
    }

    bool loadPreset(const char* jsonData) override {
        return jsonData != nullptr && jsonData[0] == '{';
    }

    int getActiveVoiceCount() const override { return 0; }
    int getMaxPolyphony() const override { return 1; }
    const char* getInstrumentName() const override { return "MockInstrument"; }
    const char* getInstrumentVersion() const override { return "1.0.0"; }

    // Test-specific methods
    int getResetCount() const { return resetCount_; }
    double getSampleRate() const { return sampleRate_; }
    int getBlockSize() const { return blockSize_; }
    DSP::ScheduledEvent::Type getLastEventType() const { return lastEventType_; }

private:
    double sampleRate_ = 0.0;
    int blockSize_ = 0;
    int resetCount_ = 0;
    float testParam_ = 0.0f;
    DSP::ScheduledEvent::Type lastEventType_ = DSP::ScheduledEvent::NOTE_ON;
};

static DSP::InstrumentDSP* createMockInstrument() {
    return new MockInstrument();
}

//==============================================================================
// Test Cases
//==============================================================================

void testFactoryRegistration()
{
    std::cout << "Test: Factory Registration... ";

    // Register mock instrument
    DSP::registerInstrumentFactory("MockInstrument", createMockInstrument);

    // Verify it's registered
    bool registered = DSP::isInstrumentRegistered("MockInstrument");
    assert(registered);

    // Verify count
    int count = DSP::getRegisteredInstrumentCount();
    assert(count >= 1);

    // Cleanup
    DSP::unregisterAllFactories();

    std::cout << "PASS\n";
}

void testFactoryCreation()
{
    std::cout << "Test: Factory Creation... ";

    // Register mock instrument
    DSP::registerInstrumentFactory("MockInstrument", createMockInstrument);

    // Create instrument
    DSP::InstrumentDSP* instrument = DSP::createInstrument("MockInstrument");
    assert(instrument != nullptr);

    // Verify it's the right type
    assert(std::string(instrument->getInstrumentName()) == "MockInstrument");

    // Cleanup
    delete instrument;
    DSP::unregisterAllFactories();

    std::cout << "PASS\n";
}

void testFactoryNotFound()
{
    std::cout << "Test: Factory Not Found... ";

    // Try to create non-existent instrument
    DSP::InstrumentDSP* instrument = DSP::createInstrument("NonExistent");
    assert(instrument == nullptr);

    std::cout << "PASS\n";
}

void testInstrumentInterface()
{
    std::cout << "Test: Instrument Interface... ";

    // Register and create mock instrument
    DSP::registerInstrumentFactory("MockInstrument", createMockInstrument);
    DSP::InstrumentDSP* instrument = DSP::createInstrument("MockInstrument");

    assert(instrument != nullptr);

    // Test prepare
    bool prepared = instrument->prepare(48000.0, 512);
    assert(prepared);

    // Test reset
    instrument->reset();

    // Test process
    constexpr int numChannels = 2;
    constexpr int numSamples = 256;
    float* outputs[numChannels];
    float bufferL[numSamples];
    float bufferR[numSamples];
    outputs[0] = bufferL;
    outputs[1] = bufferR;

    instrument->process(outputs, numChannels, numSamples);

    // Test handleEvent
    DSP::ScheduledEvent event;
    event.type = DSP::ScheduledEvent::NOTE_ON;
    event.data.note.midiNote = 60;
    event.data.note.velocity = 0.8f;
    instrument->handleEvent(event);

    // Test parameters
    instrument->setParameter("test", 0.5f);
    float param = instrument->getParameter("test");
    assert(param == 0.5f);

    // Test preset
    char jsonBuffer[256];
    bool saved = instrument->savePreset(jsonBuffer, sizeof(jsonBuffer));
    assert(saved);

    bool loaded = instrument->loadPreset(jsonBuffer);
    assert(loaded);

    // Test queries
    int voices = instrument->getActiveVoiceCount();
    assert(voices == 0);

    int maxVoices = instrument->getMaxPolyphony();
    assert(maxVoices == 1);

    const char* name = instrument->getInstrumentName();
    assert(std::string(name) == "MockInstrument");

    const char* version = instrument->getInstrumentVersion();
    assert(std::string(version) == "1.0.0");

    // Cleanup
    delete instrument;
    DSP::unregisterAllFactories();

    std::cout << "PASS\n";
}

void testMultipleInstruments()
{
    std::cout << "Test: Multiple Instruments... ";

    // Register multiple mock instruments
    DSP::registerInstrumentFactory("MockInstrument1", createMockInstrument);
    DSP::registerInstrumentFactory("MockInstrument2", createMockInstrument);
    DSP::registerInstrumentFactory("MockInstrument3", createMockInstrument);

    // Verify count
    int count = DSP::getRegisteredInstrumentCount();
    assert(count == 3);

    // Create all instruments
    DSP::InstrumentDSP* inst1 = DSP::createInstrument("MockInstrument1");
    DSP::InstrumentDSP* inst2 = DSP::createInstrument("MockInstrument2");
    DSP::InstrumentDSP* inst3 = DSP::createInstrument("MockInstrument3");

    assert(inst1 != nullptr);
    assert(inst2 != nullptr);
    assert(inst3 != nullptr);

    // Verify they're independent instances
    assert(inst1 != inst2);
    assert(inst2 != inst3);

    // Cleanup
    delete inst1;
    delete inst2;
    delete inst3;
    DSP::unregisterAllFactories();

    std::cout << "PASS\n";
}

void testUnregisterFactory()
{
    std::cout << "Test: Unregister Factory... ";

    // Register instrument
    DSP::registerInstrumentFactory("MockInstrument", createMockInstrument);
    assert(DSP::isInstrumentRegistered("MockInstrument"));

    // Unregister
    DSP::unregisterInstrumentFactory("MockInstrument");
    assert(!DSP::isInstrumentRegistered("MockInstrument"));

    // Try to create (should fail)
    DSP::InstrumentDSP* instrument = DSP::createInstrument("MockInstrument");
    assert(instrument == nullptr);

    std::cout << "PASS\n";
}

void testGetAllInstrumentNames()
{
    std::cout << "Test: Get All Instrument Names... ";

    // Register multiple instruments
    DSP::registerInstrumentFactory("Instrument1", createMockInstrument);
    DSP::registerInstrumentFactory("Instrument2", createMockInstrument);
    DSP::registerInstrumentFactory("Instrument3", createMockInstrument);

    // Get all names
    char namesBuffer[256];
    DSP::getAllRegisteredInstrumentNames(namesBuffer, sizeof(namesBuffer));

    // Verify buffer is not empty
    assert(std::strlen(namesBuffer) > 0);

    // Verify all instruments are listed
    std::string names(namesBuffer);
    assert(names.find("Instrument1") != std::string::npos);
    assert(names.find("Instrument2") != std::string::npos);
    assert(names.find("Instrument3") != std::string::npos);

    // Cleanup
    DSP::unregisterAllFactories();

    std::cout << "PASS\n";
}

void testUnregisterAllFactories()
{
    std::cout << "Test: Unregister All Factories... ";

    // Register multiple instruments
    DSP::registerInstrumentFactory("Instrument1", createMockInstrument);
    DSP::registerInstrumentFactory("Instrument2", createMockInstrument);
    DSP::registerInstrumentFactory("Instrument3", createMockInstrument);

    assert(DSP::getRegisteredInstrumentCount() == 3);

    // Unregister all
    DSP::unregisterAllFactories();

    // Verify all are gone
    assert(DSP::getRegisteredInstrumentCount() == 0);
    assert(!DSP::isInstrumentRegistered("Instrument1"));
    assert(!DSP::isInstrumentRegistered("Instrument2"));
    assert(!DSP::isInstrumentRegistered("Instrument3"));

    std::cout << "PASS\n";
}

//==============================================================================
// Test Runner
//==============================================================================

int runAllTests()
{
    std::cout << "\n";
    std::cout << "===========================================\n";
    std::cout << "Instrument Factory System Tests\n";
    std::cout << "===========================================\n";
    std::cout << "\n";

    try {
        testFactoryRegistration();
        testFactoryCreation();
        testFactoryNotFound();
        testInstrumentInterface();
        testMultipleInstruments();
        testUnregisterFactory();
        testGetAllInstrumentNames();
        testUnregisterAllFactories();

        std::cout << "\n";
        std::cout << "===========================================\n";
        std::cout << "All tests PASSED!\n";
        std::cout << "===========================================\n";
        std::cout << "\n";

        return 0;
    }
    catch (const std::exception& e) {
        std::cout << "\n";
        std::cout << "===========================================\n";
        std::cout << "TEST FAILED: " << e.what() << "\n";
        std::cout << "===========================================\n";
        std::cout << "\n";

        return 1;
    }
}

} // namespace Test

//==============================================================================
// Main
//==============================================================================

int main()
{
    return Test::runAllTests();
}
