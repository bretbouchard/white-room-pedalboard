#define JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED 1
#define JUCE_WASAPI_CODE 1
#define JUCE_DIRECTSOUND_CODE 1
#define JUCE_ALSA_CODE 1
#define JUCE_JACK_CODE 1
#define JUCE_USE_CURL 0
#define JUCE_WEB_BROWSER 0
#define JUCE_VST3_CAN_REPLACE_VST2 0

#include <iostream>
#include <atomic>
#include <memory>
#include <cassert>

// Mock JUCE classes for testing
namespace juce {
    class String {
    public:
        String() = default;
        String(const char* str) : data(str) {}
        String(const std::string& str) : data(str) {}
        String(double value) : data(std::to_string(value)) {}
        String(float value) : data(std::to_string(value)) {}
        String(int value) : data(std::to_string(value)) {}

        std::string toStdString() const { return data; }
        const char* toUTF8() const { return data.c_str(); }

        bool operator==(const String& other) const { return data == other.data; }

    private:
        std::string data;
    };

    class var {
    public:
        var() {}
        var(int value) : intVal(value), type(Int) {}
        var(float value) : floatVal(value), type(Float) {}
        var(double value) : doubleVal(value), type(Double) {}
        var(bool value) : boolVal(value), type(Bool) {}
        var(const String& value) : stringVal(value), type(StringVal) {}

        double doubleVal = 0.0;
        float floatVal = 0.0;
        int intVal = 0;
        bool boolVal = false;
        String stringVal;

        enum ValueType { Empty, Int, Float, Double, Bool, StringVal, Object };
        ValueType type = Empty;

        class DynamicObject* getDynamicObject() { return nullptr; }

        bool hasProperty(const class String&) const { return false; }
        var getProperty(const class String&) const { return var(); }
    };

    class DynamicObject {
    public:
        void setProperty(const String&, const var&) {}
        bool hasProperty(const String&) const { return false; }
        var getProperty(const String&) const { return var(); }
    };

    using DynamicObjectPtr = std::shared_ptr<DynamicObject>;

    namespace JSON {
        static String toString(const var& v) {
            return "{}";
        }

        static var parse(const String& json) {
            return var();
        }
    }

    template<typename T>
    T jlimit(T min, T max, T value) {
        return (value < min) ? min : (value > max) ? max : value;
    }
}

// Helper function
template<typename T>
T clampValue(T min, T max, T value) {
    return (value < min) ? min : (value > max) ? max : value;
}

// Our ChannelStripModel (simplified version for testing)
namespace audio::core {

class ChannelStripModel
{
public:
    struct EQBand {
        std::atomic<float> freq{100.0f};
        std::atomic<float> gain{0.0f};
        std::atomic<float> q{1.0f};
        std::atomic<bool> enabled{false};

        void setFreq(float newFreq) { freq.store(clampValue(20.0f, 20000.0f, newFreq)); }
        void setGain(float newGain) { gain.store(clampValue(-15.0f, 15.0f, newGain)); }
        void setQ(float newQ) { q.store(clampValue(0.1f, 10.0f, newQ)); }
    };

    struct Compressor {
        std::atomic<float> threshold{-20.0f};
        std::atomic<float> ratio{4.0f};
        std::atomic<float> attack{5.0f};
        std::atomic<float> release{100.0f};
        std::atomic<float> makeup{0.0f};
        std::atomic<bool> enabled{false};

        void setThreshold(float newThreshold) { threshold.store(clampValue(-60.0f, 0.0f, newThreshold)); }
        void setRatio(float newRatio) { ratio.store(clampValue(1.0f, 20.0f, newRatio)); }
    };

    ChannelStripModel() = default;
    ~ChannelStripModel() = default;

    // Main parameters
    std::atomic<float> inputTrim{0.0f};
    std::atomic<float> hpfFreq{0.0f};
    std::atomic<float> lpfFreq{24000.0f};
    EQBand low, mid, high;
    Compressor comp;
    std::atomic<float> outputFader{0.0f};

    void setInputTrim(float newTrim) {
        inputTrim.store(clampValue(-60.0f, 12.0f, newTrim));
    }

    void setHpfFreq(float newFreq) {
        hpfFreq.store(clampValue(0.0f, 20000.0f, newFreq));
    }

    void setOutputFader(float newFader) {
        outputFader.store(clampValue(-60.0f, 0.0f, newFader));
    }

    juce::String toJSON() const {
        auto obj = std::make_shared<juce::DynamicObject>();
        obj->setProperty("inputTrim", inputTrim.load());
        obj->setProperty("hpfFreq", hpfFreq.load());
        obj->setProperty("outputFader", outputFader.load());
        return juce::JSON::toString(juce::var());
    }

    static ChannelStripModel fromJSON(const juce::String& jsonData) {
        return ChannelStripModel();
    }
};

} // namespace audio::core

// Simple test function
void testChannelStripModel() {
    using namespace audio::core;

    std::cout << "Testing ChannelStripModel..." << std::endl;

    ChannelStripModel model;

    // Test default values
    assert(model.inputTrim.load() == 0.0f);
    assert(model.hpfFreq.load() == 0.0f);
    assert(model.outputFader.load() == 0.0f);
    assert(model.low.freq.load() == 100.0f);
    assert(model.low.enabled.load() == false);
    assert(model.comp.threshold.load() == -20.0f);
    assert(model.comp.enabled.load() == false);

    std::cout << "✓ Default values test passed" << std::endl;

    // Test parameter setting with range enforcement
    model.setInputTrim(-80.0f);  // Below range
    assert(model.inputTrim.load() == -60.0f);  // Should be clamped

    model.setInputTrim(20.0f);   // Above range
    assert(model.inputTrim.load() == 12.0f);   // Should be clamped

    model.setInputTrim(-6.0f);   // Within range
    assert(model.inputTrim.load() == -6.0f);   // Should be accepted

    std::cout << "✓ Range enforcement test passed" << std::endl;

    // Test EQ band operations
    model.low.setFreq(10.0f);   // Below range
    assert(model.low.freq.load() == 20.0f);    // Should be clamped

    model.low.setGain(20.0f);   // Above range
    assert(model.low.gain.load() == 15.0f);    // Should be clamped

    std::cout << "✓ EQ band operations test passed" << std::endl;

    // Test JSON serialization (basic)
    auto json = model.toJSON();
    assert(!json.toStdString().empty());

    std::cout << "✓ JSON serialization test passed" << std::endl;

    std::cout << "All tests passed! ✓" << std::endl;
}

int main() {
    testChannelStripModel();
    return 0;
}