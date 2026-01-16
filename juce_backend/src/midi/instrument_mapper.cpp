/*
    InstrumentMapper.cpp

    Implementation of instrument assignment management and MIDI message sending.

    Copyright © 2026 White Room. All rights reserved.
*/

#include "instrument_mapper.h"
#include <stdexcept>

namespace white_room {
namespace midi {

InstrumentMapper::InstrumentMapper()
    : midiOutput(nullptr)
{
}

InstrumentMapper::InstrumentMapper(juce::MidiOutput* midiOutput)
    : midiOutput(midiOutput)
{
}

InstrumentMapper::~InstrumentMapper()
{
    clearAll();
}

void InstrumentMapper::setMidiOutput(juce::MidiOutput* output)
{
    const juce::ScopedLock scopedLock(lock);
    midiOutput = output;
}

bool InstrumentMapper::assignInstrument(const std::string& trackId, const InstrumentAssignment& instrument)
{
    if (!validateAssignment(instrument))
    {
        return false;
    }

    // Check for channel conflicts
    std::string conflict = findChannelConflict(instrument.channel, trackId);
    if (!conflict.empty())
    {
        return false;
    }

    const juce::ScopedLock scopedLock(lock);
    assignments[trackId] = instrument;
    return true;
}

InstrumentAssignment* InstrumentMapper::getInstrument(const std::string& trackId)
{
    const juce::ScopedLock scopedLock(lock);
    auto it = assignments.find(trackId);
    if (it != assignments.end())
    {
        return &(it->second);
    }
    return nullptr;
}

void InstrumentMapper::removeAssignment(const std::string& trackId)
{
    const juce::ScopedLock scopedLock(lock);
    assignments.erase(trackId);
}

std::vector<std::pair<std::string, InstrumentAssignment>> InstrumentMapper::getAllAssignments() const
{
    const juce::ScopedLock scopedLock(lock);
    std::vector<std::pair<std::string, InstrumentAssignment>> result;
    for (const auto& pair : assignments)
    {
        result.push_back(pair);
    }
    return result;
}

void InstrumentMapper::sendProgramChange(const std::string& trackId)
{
    const juce::ScopedLock scopedLock(lock);
    auto it = assignments.find(trackId);
    if (it != assignments.end())
    {
        const auto& instrument = it->second;
        sendProgramChange(instrument.channel, instrument.patch);
    }
}

void InstrumentMapper::sendBankSelectAndProgramChange(const std::string& trackId)
{
    const juce::ScopedLock scopedLock(lock);
    auto it = assignments.find(trackId);
    if (it != assignments.end())
    {
        const auto& instrument = it->second;
        sendBankSelect(instrument.channel, instrument.bankMSB, instrument.bankLSB);
        sendProgramChange(instrument.channel, instrument.patch);
    }
}

void InstrumentMapper::sendProgramChange(int channel, int program)
{
    if (channel < 1 || channel > 16)
    {
        throw std::invalid_argument("MIDI channel must be between 1 and 16");
    }

    if (program < 0 || program > 127)
    {
        throw std::invalid_argument("MIDI program must be between 0 and 127");
    }

    // MIDI Program Change message: 0xC0 + channel - 1
    juce::MidiMessage message = juce::MidiMessage::programChange(channel - 1, program);
    sendMidiMessage(message);
}

void InstrumentMapper::sendBankSelect(int channel, int msb, int lsb)
{
    if (channel < 1 || channel > 16)
    {
        throw std::invalid_argument("MIDI channel must be between 1 and 16");
    }

    if (msb < 0 || msb > 127)
    {
        throw std::invalid_argument("Bank MSB must be between 0 and 127");
    }

    if (lsb < 0 || lsb > 127)
    {
        throw std::invalid_argument("Bank LSB must be between 0 and 127");
    }

    // MIDI Control Change messages for Bank Select
    // Bank Select MSB: Controller 0
    juce::MidiMessage msbMessage = juce::MidiMessage::controllerEvent(channel - 1, 0, msb);
    sendMidiMessage(msbMessage);

    // Bank Select LSB: Controller 32
    juce::MidiMessage lsbMessage = juce::MidiMessage::controllerEvent(channel - 1, 32, lsb);
    sendMidiMessage(lsbMessage);
}

void InstrumentMapper::sendAllProgramChanges()
{
    const juce::ScopedLock scopedLock(lock);
    for (const auto& pair : assignments)
    {
        const auto& instrument = pair.second;
        if (instrument.bankMSB != 0 || instrument.bankLSB != 0)
        {
            sendBankSelect(instrument.channel, instrument.bankMSB, instrument.bankLSB);
        }
        sendProgramChange(instrument.channel, instrument.patch);
    }
}

void InstrumentMapper::clearAll()
{
    const juce::ScopedLock scopedLock(lock);
    assignments.clear();
}

bool InstrumentMapper::validateAssignment(const InstrumentAssignment& instrument)
{
    // Validate MIDI channel (1-16)
    if (instrument.channel < 1 || instrument.channel > 16)
    {
        return false;
    }

    // Validate MIDI program change (0-127)
    if (instrument.patch < 0 || instrument.patch > 127)
    {
        return false;
    }

    // Validate bank select (0-127)
    if (instrument.bankMSB < 0 || instrument.bankMSB > 127)
    {
        return false;
    }

    if (instrument.bankLSB < 0 || instrument.bankLSB > 127)
    {
        return false;
    }

    return true;
}

std::string InstrumentMapper::findChannelConflict(int channel, const std::string& excludeTrackId) const
{
    const juce::ScopedLock scopedLock(lock);
    for (const auto& pair : assignments)
    {
        if (pair.first != excludeTrackId && pair.second.channel == channel)
        {
            return pair.first;
        }
    }
    return "";
}

std::vector<int> InstrumentMapper::getAvailableChannels() const
{
    const juce::ScopedLock scopedLock(lock);
    std::set<int> usedChannels;
    for (const auto& pair : assignments)
    {
        usedChannels.insert(pair.second.channel);
    }

    std::vector<int> available;
    for (int channel = 1; channel <= 16; ++channel)
    {
        if (usedChannels.find(channel) == usedChannels.end())
        {
            available.push_back(channel);
        }
    }

    return available;
}

void InstrumentMapper::sendMidiMessage(const juce::MidiMessage& message)
{
    juce::ScopedLock scopedLock(lock);
    if (midiOutput != nullptr)
    {
        midiOutput->sendMessageNow(message);
    }
}

} // namespace midi
} // namespace white_room
