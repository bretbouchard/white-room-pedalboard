/*
  ==============================================================================

    SF2Reader.cpp
    Created: 25 Dec 2024
    Author:  Bret Bouchard

    SoundFont 2 (SF2) File Format Reader Implementation

  ==============================================================================
*/

#define JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED 1
#include <juce_core/juce_core.h>
#include "../../include/dsp/SF2Reader.h"
#include <cmath>

//==============================================================================
// Loading Methods
//==============================================================================

std::unique_ptr<SF2File> SF2Reader::loadFromFile(const juce::String& filePath)
{
    juce::File file(filePath);
    if (!file.existsAsFile())
        return nullptr;

    std::unique_ptr<juce::FileInputStream> stream = file.createInputStream();
    if (stream == nullptr || !stream->openedOk())
        return nullptr;

    auto sf2 = std::make_unique<SF2File>();

    // Parse RIFF header
    if (!parseRIFF(*stream, *sf2))
        return nullptr;

    // Parse LIST chunks
    while (!stream->isExhausted())
    {
        juce::String chunkId;
        int chunkSize;

        if (!readChunkHeader(*stream, chunkId, chunkSize))
            break;

        if (chunkId == "LIST")
        {
            // Read list type
            char listType[4];
            if (stream->read(listType, 4) != 4)
                break;

            juce::String listTypeStr(listType, 4);

            if (listTypeStr == "INFO")
            {
                if (!parseINFO(*stream, *sf2))
                    return nullptr;
            }
            else if (listTypeStr == "sdta")
            {
                if (!parseSDTA(*stream, *sf2))
                    return nullptr;
            }
            else if (listTypeStr == "pdta")
            {
                if (!parsePDTA(*stream, *sf2))
                    return nullptr;
            }
            else
            {
                // Skip unknown list types
                if (!skipChunk(*stream, chunkSize - 4))
                    break;
            }
        }
        else
        {
            // Skip unknown chunks
            if (!skipChunk(*stream, chunkSize))
                break;
        }
    }

    if (!sf2->isValid())
        return nullptr;

    return sf2;
}

std::unique_ptr<SF2File> SF2Reader::loadFromMemory(const void* data, size_t dataSize)
{
    if (data == nullptr || dataSize == 0)
        return nullptr;

    juce::MemoryInputStream stream(data, dataSize, false);

    auto sf2 = std::make_unique<SF2File>();

    // Parse RIFF header
    if (!parseRIFF(stream, *sf2))
        return nullptr;

    // Parse LIST chunks
    while (!stream.isExhausted())
    {
        juce::String chunkId;
        int chunkSize;

        if (!readChunkHeader(stream, chunkId, chunkSize))
            break;

        if (chunkId == "LIST")
        {
            // Read list type
            char listType[4];
            if (stream.read(listType, 4) != 4)
                break;

            juce::String listTypeStr(listType, 4);

            if (listTypeStr == "INFO")
            {
                if (!parseINFO(stream, *sf2))
                    return nullptr;
            }
            else if (listTypeStr == "sdta")
            {
                if (!parseSDTA(stream, *sf2))
                    return nullptr;
            }
            else if (listTypeStr == "pdta")
            {
                if (!parsePDTA(stream, *sf2))
                    return nullptr;
            }
            else
            {
                // Skip unknown list types
                if (!skipChunk(stream, chunkSize - 4))
                    break;
            }
        }
        else
        {
            // Skip unknown chunks
            if (!skipChunk(stream, chunkSize))
                break;
        }
    }

    if (!sf2->isValid())
        return nullptr;

    return sf2;
}

//==============================================================================
// Validation
//==============================================================================

bool SF2Reader::isValidSF2File(const juce::String& filePath)
{
    juce::File file(filePath);
    if (!file.existsAsFile())
        return false;

    std::unique_ptr<juce::FileInputStream> stream = file.createInputStream();
    if (stream == nullptr || !stream->openedOk())
        return false;

    // Read RIFF header
    char riff[4];
    if (stream->read(riff, 4) != 4)
        return false;

    if (memcmp(riff, "RIFF", 4) != 0)
        return false;

    // Skip file size
    stream->readInt();

    // Read file type
    char sfbk[4];
    if (stream->read(sfbk, 4) != 4)
        return false;

    if (memcmp(sfbk, "sfbk", 4) != 0)
        return false;

    return true;
}

bool SF2Reader::isValidSF2Memory(const void* data, size_t dataSize)
{
    if (data == nullptr || dataSize < 12)
        return false;

    const uint8_t* ptr = static_cast<const uint8_t*>(data);

    // Check RIFF header
    if (memcmp(ptr, "RIFF", 4) != 0)
        return false;

    // Check file type (skip 4 bytes for file size)
    if (memcmp(ptr + 8, "sfbk", 4) != 0)
        return false;

    return true;
}

//==============================================================================
// RIFF Chunk Parsing
//==============================================================================

bool SF2Reader::parseRIFF(juce::InputStream& stream, SF2File& sf2)
{
    // Read RIFF header
    char riffId[4];
    if (stream.read(riffId, 4) != 4)
        return false;

    if (memcmp(riffId, "RIFF", 4) != 0)
        return false;

    sf2.fileId = "RIFF";

    // Read file size (little-endian)
    int fileSizeBE = stream.readIntBigEndian();
    sf2.fileSize = juce::ByteOrder::swapIfBigEndian(fileSizeBE);

    // Read file type
    char sfbk[4];
    if (stream.read(sfbk, 4) != 4)
        return false;

    if (memcmp(sfbk, "sfbk", 4) != 0)
        return false;

    sf2.fileType = "sfbk";

    return true;
}

bool SF2Reader::parseINFO(juce::InputStream& stream, SF2File& sf2)
{
    int endPosition = stream.getPosition() + 3000; // Safety limit

    while (stream.getPosition() < endPosition && !stream.isExhausted())
    {
        juce::String chunkId;
        int chunkSize;

        if (!readChunkHeader(stream, chunkId, chunkSize))
            break;

        // Read chunk data
        juce::String chunkData = readString(stream, chunkSize);

        // Pad to even boundary
        if ((chunkSize % 2) != 0)
        {
            char padding;
            stream.read(&padding, 1);
        }

        // Store metadata
        if (chunkId == "ifil")
        {
            // Version (2 bytes major, 2 bytes minor)
            sf2.majorVersion = 2;
            sf2.minorVersion = 0;
        }
        else if (chunkId == "isng")
        {
            sf2.soundEngine = chunkData;
        }
        else if (chunkId == "INAM")
        {
            sf2.romName = chunkData;
        }
        else if (chunkId == "IENG")
        {
            sf2.soundEngineName = chunkData;
        }
        else if (chunkId == "IROM")
        {
            sf2.romVersion = chunkData;
        }
        else if (chunkId == "ICRD")
        {
            sf2.creationDate = chunkData;
        }
        else if (chunkId == "IENG")
        {
            sf2.author = chunkData;
        }
        else if (chunkId == "IPRD")
        {
            sf2.product = chunkData;
        }
        else if (chunkId == "ICOP")
        {
            sf2.copyright = chunkData;
        }
        else if (chunkId == "IST")
        {
            sf2.targetSoundEngine = chunkData;
        }
    }

    return true;
}

bool SF2Reader::parseSDTA(juce::InputStream& stream, SF2File& sf2)
{
    // Look for smpl chunk within sdta LIST
    while (!stream.isExhausted())
    {
        juce::String chunkId;
        int chunkSize;

        if (!readChunkHeader(stream, chunkId, chunkSize))
            break;

        if (chunkId == "smpl")
        {
            // Read 16-bit PCM samples
            int numSamples = chunkSize / 2;

            // Store sample data position and size for later loading
            // We'll load individual samples when parsing headers
            sf2.fileSize = numSamples; // Temporarily use fileSize to store numSamples

            return true;
        }
        else if (chunkId == "sm24")
        {
            // 24-bit samples (optional, skip for now)
            if (!skipChunk(stream, chunkSize))
                return false;
        }
        else
        {
            // Skip unknown chunks
            if (!skipChunk(stream, chunkSize))
                break;
        }
    }

    return true;
}

bool SF2Reader::parsePDTA(juce::InputStream& stream, SF2File& sf2)
{
    while (!stream.isExhausted())
    {
        juce::String chunkId;
        int chunkSize;

        if (!readChunkHeader(stream, chunkId, chunkSize))
            break;

        if (chunkId == "phdr")
        {
            if (!parsePresetHeaders(stream, sf2.instruments, chunkSize))
                return false;
        }
        else if (chunkId == "pbag")
        {
            std::vector<int> zoneGenerators;
            std::vector<int> zoneModulators;
            if (!parsePresetZones(stream, zoneGenerators, zoneModulators, chunkSize))
                return false;
        }
        else if (chunkId == "pgen")
        {
            std::vector<SF2File::SF2Instrument::SF2Zone> zones;
            if (!parsePresetGenerators(stream, zones, chunkSize))
                return false;
        }
        else if (chunkId == "inst")
        {
            if (!parseInstrumentHeaders(stream, sf2.instruments, chunkSize))
                return false;
        }
        else if (chunkId == "ibag")
        {
            std::vector<int> zoneGenerators;
            std::vector<int> zoneModulators;
            if (!parseInstrumentZones(stream, zoneGenerators, zoneModulators, chunkSize))
                return false;
        }
        else if (chunkId == "igen")
        {
            std::vector<SF2File::SF2Instrument::SF2Zone> zones;
            if (!parseInstrumentGenerators(stream, zones, chunkSize))
                return false;
        }
        else if (chunkId == "shdr")
        {
            if (!parseSampleHeaders(stream, sf2.samples, chunkSize))
                return false;
        }
        else
        {
            // Skip unknown chunks
            if (!skipChunk(stream, chunkSize))
                break;
        }
    }

    return true;
}

//==============================================================================
// Helper Functions
//==============================================================================

bool SF2Reader::readChunkHeader(juce::InputStream& stream,
                                juce::String& chunkId,
                                int& chunkSize)
{
    char id[4];
    if (stream.read(id, 4) != 4)
        return false;

    chunkId = juce::String(id, 4);

    // Read little-endian 32-bit integer
    char sizeBytes[4];
    if (stream.read(sizeBytes, 4) != 4)
        return false;

    chunkSize = juce::ByteOrder::littleEndianInt(sizeBytes);

    return true;
}

bool SF2Reader::skipChunk(juce::InputStream& stream, int chunkSize)
{
    if (chunkSize <= 0)
        return true;

    return stream.setPosition(stream.getPosition() + chunkSize);
}

juce::String SF2Reader::readString(juce::InputStream& stream, int maxLength)
{
    juce::MemoryBlock buffer(maxLength + 1, true);
    int bytesRead = stream.read(buffer.getData(), maxLength);
    return juce::String::fromUTF8(static_cast<const char*>(buffer.getData()), bytesRead);
}

int16_t SF2Reader::readInt16LE(juce::InputStream& stream)
{
    char bytes[2];
    if (stream.read(bytes, 2) != 2)
        return 0;
    return static_cast<int16_t>(juce::ByteOrder::littleEndianShort(bytes));
}

int32_t SF2Reader::readInt32LE(juce::InputStream& stream)
{
    char bytes[4];
    if (stream.read(bytes, 4) != 4)
        return 0;
    return static_cast<int32_t>(juce::ByteOrder::littleEndianInt(bytes));
}

uint8_t SF2Reader::readUInt8(juce::InputStream& stream)
{
    char byte;
    if (stream.read(&byte, 1) != 1)
        return 0;
    return static_cast<uint8_t>(byte);
}

void SF2Reader::convertSamples(const int16_t* src, float* dst, int numSamples)
{
    for (int i = 0; i < numSamples; ++i)
    {
        // Convert 16-bit PCM to float (-1.0 to 1.0)
        dst[i] = static_cast<float>(src[i]) / 32768.0f;
    }
}

//==============================================================================
// PDTA Sub-Chunk Parsing
//==============================================================================

bool SF2Reader::parsePresetHeaders(juce::InputStream& stream,
                                   std::vector<SF2File::SF2Instrument>& presets,
                                   int chunkSize)
{
    int numPresets = chunkSize / 38; // Each preset header is 38 bytes

    for (int i = 0; i < numPresets; ++i)
    {
        SF2File::SF2Instrument preset;

        // Read preset name (20 chars)
        preset.name = readString(stream, 20);

        // Read preset number
        preset.presetNumber = SF2Reader::readInt16LE(stream);

        // Read bank
        preset.bank = SF2Reader::readInt16LE(stream);

        // Read preset bag index
        uint16_t presetBagNdx = SF2Reader::readInt16LE(stream);

        // Skip library, genre, morphology (4 DWORDs)
        SF2Reader::readInt32LE(stream);
        SF2Reader::readInt32LE(stream);
        SF2Reader::readInt32LE(stream);
        SF2Reader::readInt32LE(stream);

        // Skip last preset (terminator)
        if (i < numPresets - 1)
        {
            presets.push_back(preset);
        }
    }

    return true;
}

bool SF2Reader::parsePresetZones(juce::InputStream& stream,
                                 std::vector<int>& zoneGenerators,
                                 std::vector<int>& zoneModulators,
                                 int chunkSize)
{
    int numZones = chunkSize / 4; // Each zone is 4 bytes

    for (int i = 0; i < numZones; ++i)
    {
        uint16_t genNdx = SF2Reader::readInt16LE(stream);
        uint16_t modNdx = SF2Reader::readInt16LE(stream);

        zoneGenerators.push_back(genNdx);
        zoneModulators.push_back(modNdx);
    }

    return true;
}

bool SF2Reader::parsePresetGenerators(juce::InputStream& stream,
                                      std::vector<SF2File::SF2Instrument::SF2Zone>& zones,
                                      int chunkSize)
{
    int numGenerators = chunkSize / 4; // Each generator is 4 bytes

    for (int i = 0; i < numGenerators; ++i)
    {
        uint16_t genType = SF2Reader::readInt16LE(stream);
        int16_t genAmount = SF2Reader::readInt16LE(stream);

        SF2File::SF2Instrument::SF2Zone zone;
        applyGenerator(zone, static_cast<GeneratorType>(genType), genAmount);

        zones.push_back(zone);
    }

    return true;
}

bool SF2Reader::parseInstrumentHeaders(juce::InputStream& stream,
                                      std::vector<SF2File::SF2Instrument>& instruments,
                                      int chunkSize)
{
    int numInstruments = chunkSize / 22; // Each instrument is 22 bytes

    for (int i = 0; i < numInstruments; ++i)
    {
        SF2File::SF2Instrument instrument;

        // Read instrument name (20 chars)
        instrument.name = readString(stream, 20);

        // Read instrument bag index
        uint16_t instBagNdx = SF2Reader::readInt16LE(stream);

        // Skip last instrument (terminator)
        if (i < numInstruments - 1)
        {
            instruments.push_back(instrument);
        }
    }

    return true;
}

bool SF2Reader::parseInstrumentZones(juce::InputStream& stream,
                                    std::vector<int>& zoneGenerators,
                                    std::vector<int>& zoneModulators,
                                    int chunkSize)
{
    int numZones = chunkSize / 4; // Each zone is 4 bytes

    for (int i = 0; i < numZones; ++i)
    {
        uint16_t genNdx = SF2Reader::readInt16LE(stream);
        uint16_t modNdx = SF2Reader::readInt16LE(stream);

        zoneGenerators.push_back(genNdx);
        zoneModulators.push_back(modNdx);
    }

    return true;
}

bool SF2Reader::parseInstrumentGenerators(juce::InputStream& stream,
                                         std::vector<SF2File::SF2Instrument::SF2Zone>& zones,
                                         int chunkSize)
{
    int numGenerators = chunkSize / 4; // Each generator is 4 bytes

    for (int i = 0; i < numGenerators; ++i)
    {
        uint16_t genType = SF2Reader::readInt16LE(stream);
        int16_t genAmount = SF2Reader::readInt16LE(stream);

        SF2File::SF2Instrument::SF2Zone zone;
        applyGenerator(zone, static_cast<GeneratorType>(genType), genAmount);

        zones.push_back(zone);
    }

    return true;
}

bool SF2Reader::parseSampleHeaders(juce::InputStream& stream,
                                   std::vector<std::unique_ptr<SF2File::SF2Sample>>& samples,
                                   int chunkSize)
{
    int numSamples = chunkSize / 46; // Each sample header is 46 bytes

    for (int i = 0; i < numSamples; ++i)
    {
        auto sample = std::make_unique<SF2File::SF2Sample>();

        // Read sample name (20 chars)
        sample->name = readString(stream, 20);

        // Read sample start
        sample->startSample = SF2Reader::readInt32LE(stream);

        // Read sample end
        sample->endSample = SF2Reader::readInt32LE(stream);

        // Read loop start
        sample->loopStart = SF2Reader::readInt32LE(stream);

        // Read loop end
        sample->loopEnd = SF2Reader::readInt32LE(stream);

        // Read sample rate
        sample->sampleRate = SF2Reader::readInt32LE(stream);

        // Read original pitch
        sample->originalPitch = SF2Reader::readUInt8(stream);

        // Read pitch correction
        sample->pitchCorrection = static_cast<char>(SF2Reader::readUInt8(stream));

        // Skip sample link
        SF2Reader::readInt16LE(stream);

        // Read sample type
        sample->sampleType = SF2Reader::readInt16LE(stream);

        // Skip last sample (terminator)
        if (i < numSamples - 1)
        {
            // We'll load sample data separately
            samples.push_back(std::move(sample));
        }
    }

    return true;
}

//==============================================================================
// Generator Application
//==============================================================================

void SF2Reader::applyGenerator(SF2File::SF2Instrument::SF2Zone& zone,
                               GeneratorType type,
                               int16_t value)
{
    switch (type)
    {
        case keyRange:
            zone.keyRangeLow = (value & 0xFF);
            zone.keyRangeHigh = (value >> 8) & 0xFF;
            break;

        case velRange:
            zone.velocityRangeLow = (value & 0xFF);
            zone.velocityRangeHigh = (value >> 8) & 0xFF;
            break;

        case overridingRootKey:
            zone.rootKey = value;
            break;

        case coarseTune:
            zone.tuning += value * 100.0; // cents
            break;

        case fineTune:
            zone.tuning += value; // cents
            break;

        case startLoopAddrCoarseOffset:
            zone.loopStart += value * 32768;
            break;

        case endLoopAddrCoarseOffset:
            zone.loopEnd += value * 32768;
            break;

        case initialFilterFc:
            zone.hasFilter = true;
            // Convert from 150-13500 Hz (log scale)
            zone.initialFilterCutoff = 8.176 * std::pow(2.0, value / 1200.0);
            break;

        case initialFilterQ:
            zone.hasFilter = true;
            zone.initialFilterQ = value / 10.0;
            break;

        case attackVolEnv:
            zone.hasVolumeEnvelope = true;
            zone.attack = std::pow(2.0, value / 1200.0); // seconds
            break;

        case decayVolEnv:
            zone.hasVolumeEnvelope = true;
            zone.decay = std::pow(2.0, value / 1200.0);
            break;

        case sustainVolEnv:
            zone.hasVolumeEnvelope = true;
            zone.sustain = value / 1000.0; // 0.1% = 0.001
            break;

        case releaseVolEnv:
            zone.hasVolumeEnvelope = true;
            zone.release = std::pow(2.0, value / 1200.0);
            break;

        case delayVolEnv:
            zone.hasVolumeEnvelope = true;
            zone.delay = std::pow(2.0, value / 1200.0);
            break;

        case modLfoToPitch:
            zone.modLfoToPitch = value;
            break;

        case vibLfoToPitch:
            zone.vibLfoToPitch = value;
            break;

        case modEnvToPitch:
            zone.modEnvToPitch = value;
            break;

        case modLfoToFilterFc:
            zone.modLfoToFilter = value;
            break;

        case modEnvToFilterFc:
            zone.modEnvToFilter = value;
            break;

        case modLfoToVolume:
            zone.modLfoToVolume = value;
            break;

        case freqModLFO:
            zone.modLfoFrequency = std::pow(2.0, value / 1200.0);
            break;

        case freqVibLFO:
            zone.vibLfoFrequency = std::pow(2.0, value / 1200.0);
            break;

        case delayModLFO:
            zone.modLfoDelay = std::pow(2.0, value / 1200.0);
            break;

        case delayVibLFO:
            zone.vibLfoDelay = std::pow(2.0, value / 1200.0);
            break;

        case delayModEnv:
            zone.modEnvDelay = std::pow(2.0, value / 1200.0);
            break;

        case attackModEnv:
            zone.modEnvAttack = std::pow(2.0, value / 1200.0);
            break;

        case decayModEnv:
            zone.modEnvDecay = std::pow(2.0, value / 1200.0);
            break;

        case sustainModEnv:
            zone.modEnvSustain = value / 1000.0;
            break;

        case releaseModEnv:
            zone.modEnvRelease = std::pow(2.0, value / 1200.0);
            break;

        case sampleID:
            zone.sampleIndex = value;
            break;

        case sampleModes:
            zone.loopMode = value;
            break;

        default:
            // Other generators not implemented
            break;
    }
}
