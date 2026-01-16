#pragma once

#include <JuceHeader.h>
#include <memory>
#include <string>
#include <array>

namespace schill {
namespace airwindows {

//==============================================================================
// Airwindows Algorithm Types
//==============================================================================
enum class AlgorithmType {
    // Reverbs
    Everglade,
    GalacticReverb,
    Capacitor,
    Verbity,

    // Dynamics
    Density,
    ConsoleChannel,
    ConsoleBuss,
    Pop,
    Punch,

    // Distortion/Saturation
    Cabs,
    IronOxide,
    Tube,
    Drive,
    StarChild,

    // EQ/Filters
    Capacitor2,
    ConsoleEQ,
    Herbalizer,

    // Modulation
    AngelHalo,
    Bias,
    Chorus,
    DeEss,

    // Delays
    Delay,
    Echo,
    TapeDelay,

    // Specialized
    AtmosphereBuss,
    bassKit,
    bassAmp,
    Nyquist,
    Point
};

//==============================================================================
// Base Airwindows Algorithm Interface
//==============================================================================
class AirwindowsAlgorithm {
public:
    virtual ~AirwindowsAlgorithm() = default;

    virtual void processBlock(juce::AudioBuffer<float>& buffer) = 0;
    virtual float processSample(float input) = 0;
    virtual void reset() = 0;
    virtual void prepareToPlay(double sampleRate, int samplesPerBlock) = 0;

    virtual std::string getAlgorithmName() const = 0;
    virtual int getParameterCount() const = 0;
    virtual std::string getParameterName(int index) const = 0;
    virtual float getParameterValue(int index) const = 0;
    virtual void setParameterValue(int index, float value) = 0;
    virtual float getParameterDefault(int index) const = 0;

protected:
    double sampleRate = 44100.0;
    int samplesPerBlock = 512;
};

//==============================================================================
// Factory for Airwindows Algorithms
//==============================================================================
class AirwindowsFactory {
public:
    static std::unique_ptr<AirwindowsAlgorithm> create(AlgorithmType type);
    static std::unique_ptr<AirwindowsAlgorithm> create(const std::string& name);
    static std::vector<std::string> getAvailableAlgorithms();
    static std::vector<AlgorithmType> getAvailableTypes();
    static bool isAlgorithmAvailable(const std::string& name);
    static AlgorithmType getAlgorithmType(const std::string& name);
    static std::string getAlgorithmDisplayName(AlgorithmType type);
    static std::string getAlgorithmDescription(AlgorithmType type);
};

//==============================================================================
// Everglade Reverb Implementation (Example)
//==============================================================================
class EvergladeReverb : public AirwindowsAlgorithm {
public:
    EvergladeReverb();

    void processBlock(juce::AudioBuffer<float>& buffer) override;
    float processSample(float input) override;
    void reset() override;
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;

    std::string getAlgorithmName() const override { return "Everglade"; }
    int getParameterCount() const override { return 9; }
    std::string getParameterName(int index) const override;
    float getParameterValue(int index) const override;
    void setParameterValue(int index, float value) override;
    float getParameterDefault(int index) const override;

private:
    // Everglade algorithm parameters
    float A; // algorithm dryness (0-1)
    float B; // size (0-1)
    float C; // predelay (0-1)
    float D; // diffusion (0-1)
    float E; // regen (0-1)
    float F; // low cut (0-1)
    float G; // high cut (0-1)
    float H; // mix (0-1)
    float I; // width (0-1)
    bool bypass;

    // Everglade algorithm state
    int count;

    // Early reflections delay line
    static constexpr int delayLength = 16386;
    std::array<float, delayLength> earlyReflectionL;
    int delayPos;

    // Diffusion delay lines
    static constexpr int diffusionLength = 1105;
    std::array<float, diffusionLength> aL;
    std::array<float, diffusionLength> bL;
    std::array<float, diffusionLength> cL;
    std::array<float, diffusionLength> dL;
    int aPos, bPos, cPos, dPos;

    // Stereo processing
    std::array<float, diffusionLength> aR;
    std::array<float, diffusionLength> bR;
    std::array<float, diffusionLength> cR;
    std::array<float, diffusionLength> dR;
    int aPosR, bPosR, cPosR, dPosR;

    // Feedforward and feedback coefficients
    float feedbackL;
    float feedbackR;
    float feedforwardL;
    float feedforwardR;

    // Previous samples for diffusion
    float prevSampL;
    float prevSampR;

    // Internal processing methods
    float evergladeProcess(float input);
    void processEarlyReflections(float& sampleL, float& sampleR);
    void processDiffusion(float& sampleL, float& sampleR);
    void processFilters(float& sampleL, float& sampleR);
    void applyPredelay(float& sampleL, float& sampleR);
};

//==============================================================================
// Density Algorithm Implementation (Example)
//==============================================================================
class Density : public AirwindowsAlgorithm {
public:
    Density();

    void processBlock(juce::AudioBuffer<float>& buffer) override;
    float processSample(float input) override;
    void reset() override;
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;

    std::string getAlgorithmName() const override { return "Density"; }
    int getParameterCount() const override { return 3; }
    std::string getParameterName(int index) const override;
    float getParameterValue(int index) const override;
    void setParameterValue(int index, float value) override;
    float getParameterDefault(int index) const override;

private:
    // Density algorithm parameters
    float A; // drive (0-1)
    float B; // tone (0-1)
    float C; // mix (0-1)
    bool bypass;

    // Density algorithm state
    float drivegain;
    float densitygain;
    float iirSampleA;
    float iirSampleB;
    float iirSampleC;
    float iirSampleD;
    float lastSample;

    // Processing methods
    float densityProcess(float input);
    void updateParameters();
};

//==============================================================================
// Cabs Algorithm Implementation (Example)
//==============================================================================
class Cabs : public AirwindowsAlgorithm {
public:
    Cabs();

    void processBlock(juce::AudioBuffer<float>& buffer) override;
    float processSample(float input) override;
    void reset() override;
    void prepareToPlay(double sampleRate, int samplesPerBlock) override;

    std::string getAlgorithmName() const override { return "Cabs"; }
    int getParameterCount() const override { return 5; }
    std::string getParameterName(int index) const override;
    float getParameterValue(int index) const override;
    void setParameterValue(int index, float value) override;
    float getParameterDefault(int index) const override;

private:
    // Cabs algorithm parameters
    float A; // cab type (0-1)
    float B; // speaker (0-1)
    float C; // mic distance (0-1)
    float D; // mic angle (0-1)
    float E; // mix (0-1)
    bool bypass;

    // Cabs algorithm state - impulse response based
    std::array<float, 44100> impulseL;  // 1 second at 44.1kHz
    std::array<float, 44100> impulseR;
    int impulsePos;
    int impulseLength;

    // Convolution processing
    std::array<float, 44100> delayL;
    std::array<float, 44100> delayR;
    int delayPos;

    // Processing methods
    float cabsProcess(float input);
    void loadImpulseResponse();
    void generateImpulseResponse();
};

//==============================================================================
// Algorithm Registry
//==============================================================================
class AlgorithmRegistry {
public:
    struct AlgorithmInfo {
        AlgorithmType type;
        std::string name;
        std::string displayName;
        std::string category;
        std::string description;
        int parameterCount;
        bool isImplemented;
    };

    static const AlgorithmRegistry& getInstance();
    std::vector<AlgorithmInfo> getAllAlgorithms() const;
    std::vector<AlgorithmInfo> getAlgorithmsByCategory(const std::string& category) const;
    AlgorithmInfo getAlgorithmInfo(AlgorithmType type) const;
    bool isAlgorithmImplemented(AlgorithmType type) const;

    // Categories
    std::vector<std::string> getCategories() const;
    std::vector<AlgorithmInfo> getReverbs() const;
    std::vector<AlgorithmInfo> getDynamics() const;
    std::vector<AlgorithmInfo> getDistortion() const;
    std::vector<AlgorithmInfo> getEQ() const;
    std::vector<AlgorithmInfo> getModulation() const;

private:
    AlgorithmRegistry();
    void initializeRegistry();
    void registerAlgorithm(AlgorithmType type, const std::string& name,
                          const std::string& displayName, const std::string& category,
                          const std::string& description, int paramCount, bool implemented);

    std::map<AlgorithmType, AlgorithmInfo> algorithms;
    std::map<std::string, std::vector<AlgorithmType>> categoryMap;
};

//==============================================================================
// Airwindows Integration Layer
//==============================================================================
class AirwindowsIntegration {
public:
    // Initialize the system
    static bool initialize();

    // Factory methods
    static std::unique_ptr<AirwindowsAlgorithm> createAlgorithm(AlgorithmType type);
    static std::unique_ptr<AirwindowsAlgorithm> createAlgorithm(const std::string& name);

    // Discovery and browsing
    static std::vector<std::string> getAvailableAlgorithms();
    static AlgorithmRegistry::AlgorithmInfo getAlgorithmInfo(const std::string& name);
    static std::vector<AlgorithmRegistry::AlgorithmInfo> getAlgorithmsByCategory(const std::string& category);

    // Status and capabilities
    static bool isInitialized();
    static int getImplementedAlgorithmCount();
    static int getTotalAlgorithmCount();
    static std::vector<std::string> getCategories();

    // Algorithm parameters
    static std::vector<std::string> getAlgorithmParameters(const std::string& algorithmName);
    static float getAlgorithmParameterDefault(const std::string& algorithmName, const std::string& parameter);

    // Presets and configurations
    static bool loadAlgorithmPreset(const std::string& algorithmName, const std::string& presetName);
    static bool saveAlgorithmPreset(const std::string& algorithmName, const std::string& presetName,
                                   const std::map<std::string, float>& parameters);

private:
    static bool initialized;
    static AlgorithmRegistry registry;
};

} // namespace airwindows
} // namespace schill