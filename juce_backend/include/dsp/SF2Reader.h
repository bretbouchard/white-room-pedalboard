/*
  ==============================================================================

    SF2Reader.h
    Created: 25 Dec 2024
    Author:  Bret Bouchard

    SoundFont 2 (SF2) File Format Reader
    - Parses RIFF-based SF2 files
    - Extracts samples, instruments, presets
    - Supports key/velocity zones, loops, envelopes

  ==============================================================================
*/

#pragma once

#define JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED 1
#include <juce_core/juce_core.h>
#include <juce_audio_basics/juce_audio_basics.h>
#include <memory>
#include <vector>
#include <array>

//==============================================================================
/**
 * @brief SF2 File Structure
 *
 * Complete representation of a SoundFont 2 file
 */
struct SF2File
{
    // RIFF header
    juce::String fileId;      // "RIFF"
    int fileSize = 0;
    juce::String fileType;    // "sfbk"

    // INFO chunk metadata
    juce::String soundEngine;
    juce::String soundEngineName;
    juce::String romName;
    juce::String romVersion;
    juce::String creationDate;
    juce::String author;
    juce::String product;
    juce::String copyright;
    juce::String targetSoundEngine;
    int majorVersion = 2;
    int minorVersion = 0;

    // Samples (from sdta chunk)
    struct SF2Sample
    {
        juce::String name;
        int startSample = 0;
        int endSample = 0;
        int loopStart = 0;
        int loopEnd = 0;
        int sampleRate = 44100;
        int originalPitch = 60;       // MIDI note number
        int pitchCorrection = 0;      // cents
        int sampleLink = 0;           // linked sample
        int sampleType = 0;           // mono/stereo

        std::unique_ptr<juce::AudioBuffer<float>> audioData;

        bool isValid() const { return audioData != nullptr && audioData->getNumSamples() > 0; }
    };

    std::vector<std::unique_ptr<SF2Sample>> samples;

    // Instruments (presets)
    struct SF2Instrument
    {
        juce::String name;
        int presetNumber = 0;
        int bank = 0;
        int library = 0;
        int genre = 0;
        int morphology = 0;

        // Zones (key ranges, velocity ranges)
        struct SF2Zone
        {
            // Key range
            int keyRangeLow = 0;
            int keyRangeHigh = 127;

            // Velocity range
            int velocityRangeLow = 0;
            int velocityRangeHigh = 127;

            // Sample reference
            int sampleIndex = -1;
            juce::String sampleName;

            // Sample playback
            int rootKey = 60;            // MIDI note number
            double tuning = 0.0;         // cents
            double pitchCorrection = 0.0; // cents

            // Loop points
            int loopStart = 0;
            int loopEnd = 0;
            int loopMode = 0;            // 0=none, 1=forward, 2=reverse, etc.

            // Envelope generators (VOL, MOD, PITCH, FILTER)
            bool hasVolumeEnvelope = false;
            double attack = 0.0;         // seconds
            double decay = 0.0;
            double sustain = 0.0;        // 0-1
            double release = 0.0;
            double hold = 0.0;
            double delay = 0.0;

            // Filter
            bool hasFilter = false;
            double initialFilterCutoff = 13500.0;  // Hz
            double initialFilterQ = 0.0;
            double filterEnvelopeToPitch = 0.0;

            // Modulation LFO
            double modLfoToPitch = 0.0;
            double modLfoToFilter = 0.0;
            double modLfoToVolume = 0.0;
            double modLfoFrequency = 0.0;
            double modLfoDelay = 0.0;

            // Vibrato LFO
            double vibLfoToPitch = 0.0;
            double vibLfoFrequency = 0.0;
            double vibLfoDelay = 0.0;

            // Modulation envelope
            double modEnvToPitch = 0.0;
            double modEnvToFilter = 0.0;
            double modEnvAttack = 0.0;
            double modEnvDecay = 0.0;
            double modEnvSustain = 0.0;
            double modEnvRelease = 0.0;
            double modEnvDelay = 0.0;

            bool isGlobal() const { return sampleIndex < 0; }
            bool isInRange(int key, int velocity) const
            {
                return key >= keyRangeLow && key <= keyRangeHigh &&
                       velocity >= velocityRangeLow && velocity <= velocityRangeHigh;
            }
        };

        std::vector<SF2Zone> zones;
    };

    std::vector<SF2Instrument> instruments;

    bool isValid() const { return fileId == "RIFF" && fileType == "sfbk"; }
};

//==============================================================================
/**
 * @brief SF2 File Reader
 *
 * Parses SoundFont 2 files and converts to internal format
 */
class SF2Reader
{
public:
    //==========================================================================
    // Loading Methods
    //==========================================================================

    /**
     * Load SF2 file from disk
     */
    static std::unique_ptr<SF2File> loadFromFile(const juce::String& filePath);

    /**
     * Load SF2 from memory buffer
     */
    static std::unique_ptr<SF2File> loadFromMemory(const void* data, size_t dataSize);

    //==========================================================================
    // Validation
    //==========================================================================

    /**
     * Check if file is valid SF2
     */
    static bool isValidSF2File(const juce::String& filePath);

    /**
     * Check if memory contains valid SF2
     */
    static bool isValidSF2Memory(const void* data, size_t dataSize);

private:
    //==========================================================================
    // RIFF Chunk Parsing
    //==========================================================================

    /**
     * Parse RIFF header
     */
    static bool parseRIFF(juce::InputStream& stream, SF2File& sf2);

    /**
     * Parse INFO chunk (metadata)
     */
    static bool parseINFO(juce::InputStream& stream, SF2File& sf2);

    /**
     * Parse sdta chunk (sample data)
     */
    static bool parseSDTA(juce::InputStream& stream, SF2File& sf2);

    /**
     * Parse pdta chunk (preset data)
     */
    static bool parsePDTA(juce::InputStream& stream, SF2File& sf2);

    //==========================================================================
    // Helper Functions
    //==========================================================================

    /**
     * Read chunk header
     */
    static bool readChunkHeader(juce::InputStream& stream,
                                juce::String& chunkId,
                                int& chunkSize);

    /**
     * Skip chunk (for unimplemented chunks)
     */
    static bool skipChunk(juce::InputStream& stream, int chunkSize);

    /**
     * Read string from chunk (fixed or null-terminated)
     */
    static juce::String readString(juce::InputStream& stream, int maxLength);

    /**
     * Read little-endian 16-bit integer
     */
    static int16_t readInt16LE(juce::InputStream& stream);

    /**
     * Read little-endian 32-bit integer
     */
    static int32_t readInt32LE(juce::InputStream& stream);

    /**
     * Read unsigned 8-bit integer
     */
    static uint8_t readUInt8(juce::InputStream& stream);

    /**
     * Convert 16-bit PCM samples to float
     */
    static void convertSamples(const int16_t* src, float* dst, int numSamples);

    //==========================================================================
    // PDTA Sub-Chunk Parsing
    //==========================================================================

    /**
     * Parse preset headers (phdr)
     */
    static bool parsePresetHeaders(juce::InputStream& stream,
                                   std::vector<SF2File::SF2Instrument>& presets,
                                   int chunkSize);

    /**
     * Parse preset zones (pbag)
     */
    static bool parsePresetZones(juce::InputStream& stream,
                                 std::vector<int>& zoneGenerators,
                                 std::vector<int>& zoneModulators,
                                 int chunkSize);

    /**
     * Parse preset generators (pgen)
     */
    static bool parsePresetGenerators(juce::InputStream& stream,
                                      std::vector<SF2File::SF2Instrument::SF2Zone>& zones,
                                      int chunkSize);

    /**
     * Parse instrument headers (inst)
     */
    static bool parseInstrumentHeaders(juce::InputStream& stream,
                                      std::vector<SF2File::SF2Instrument>& instruments,
                                      int chunkSize);

    /**
     * Parse instrument zones (ibag)
     */
    static bool parseInstrumentZones(juce::InputStream& stream,
                                    std::vector<int>& zoneGenerators,
                                    std::vector<int>& zoneModulators,
                                    int chunkSize);

    /**
     * Parse instrument generators (igen)
     */
    static bool parseInstrumentGenerators(juce::InputStream& stream,
                                         std::vector<SF2File::SF2Instrument::SF2Zone>& zones,
                                         int chunkSize);

    /**
     * Parse sample headers (shdr)
     */
    static bool parseSampleHeaders(juce::InputStream& stream,
                                   std::vector<std::unique_ptr<SF2File::SF2Sample>>& samples,
                                   int chunkSize);

    //==========================================================================
    // SF2 Generator Types
    //==========================================================================

    enum GeneratorType
    {
        startAddrOffset = 0,
        endAddrOffset = 1,
        startLoopAddrOffset = 2,
        endLoopAddrOffset = 3,
        startAddrCoarseOffset = 4,
        modLfoToPitch = 5,
        vibLfoToPitch = 6,
        modEnvToPitch = 7,
        initialFilterFc = 8,
        initialFilterQ = 9,
        modLfoToFilterFc = 10,
        modEnvToFilterFc = 11,
        endAddrCoarseOffset = 12,
        modLfoToVolume = 13,
        unused1 = 14,
        chorusEffectsSend = 15,
        reverbEffectsSend = 16,
        pan = 16,
        unused2 = 17,
        unused3 = 18,
        unused4 = 19,
        delayModLFO = 20,
        freqModLFO = 21,
        delayVibLFO = 22,
        freqVibLFO = 23,
        delayModEnv = 24,
        attackModEnv = 25,
        holdModEnv = 26,
        decayModEnv = 27,
        sustainModEnv = 28,
        releaseModEnv = 29,
        keynumToModEnvHold = 30,
        keynumToModEnvDecay = 31,
        delayVolEnv = 32,
        attackVolEnv = 33,
        holdVolEnv = 34,
        decayVolEnv = 35,
        sustainVolEnv = 36,
        releaseVolEnv = 37,
        keynumToVolEnvHold = 38,
        keynumToVolEnvDecay = 39,
        instrument = 41,
        keyRange = 43,
        velRange = 44,
        startLoopAddrCoarseOffset = 45,
        keynum = 46,
        velocity = 47,
        initialAttenuation = 48,
        endLoopAddrCoarseOffset = 50,
        coarseTune = 51,
        fineTune = 52,
        sampleID = 53,
        sampleModes = 54,
        scaleTuning = 56,
        exclusiveClass = 57,
        overridingRootKey = 58
    };

    /**
     * Apply generator value to zone
     */
    static void applyGenerator(SF2File::SF2Instrument::SF2Zone& zone,
                               GeneratorType type,
                               int16_t value);
};
