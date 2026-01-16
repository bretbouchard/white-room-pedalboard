/*
    InstrumentMapper.h

    Manages MIDI instrument assignments and sends program change/bank select messages.

    Copyright © 2026 White Room. All rights reserved.
*/

#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_audio_devices/juce_audio_devices.h>
#include <map>
#include <memory>
#include <string>

namespace white_room {
namespace midi {

/**
 * Represents an instrument assignment
 */
struct InstrumentAssignment
{
    std::string id;
    std::string name;
    std::string type;
    int channel;        // MIDI channel (1-16)
    int patch;          // MIDI program change (0-127)
    int bankMSB = 0;    // Bank select MSB (0-127)
    int bankLSB = 0;    // Bank select LSB (0-127)
    std::string color;
    std::string icon;

    InstrumentAssignment() = default;

    InstrumentAssignment(const std::string& id_, const std::string& name_,
                        const std::string& type_, int channel_, int patch_)
        : id(id_), name(name_), type(type_), channel(channel_), patch(patch_)
    {}
};

/**
 * Manages instrument assignments and sends MIDI messages
 */
class InstrumentMapper
{
public:
    InstrumentMapper();
    explicit InstrumentMapper(juce::MidiOutput* midiOutput);
    ~InstrumentMapper();

    /**
     * Set the MIDI output device
     */
    void setMidiOutput(juce::MidiOutput* output);

    /**
     * Assign instrument to track
     */
    bool assignInstrument(const std::string& trackId, const InstrumentAssignment& instrument);

    /**
     * Get instrument for track
     */
    InstrumentAssignment* getInstrument(const std::string& trackId);

    /**
     * Remove assignment
     */
    void removeAssignment(const std::string& trackId);

    /**
     * Get all assignments
     */
    std::vector<std::pair<std::string, InstrumentAssignment>> getAllAssignments() const;

    /**
     * Send program change for track
     */
    void sendProgramChange(const std::string& trackId);

    /**
     * Send bank select and program change for track
     */
    void sendBankSelectAndProgramChange(const std::string& trackId);

    /**
     * Send program change to specific channel
     */
    void sendProgramChange(int channel, int program);

    /**
     * Send bank select messages to specific channel
     */
    void sendBankSelect(int channel, int msb, int lsb);

    /**
     * Send all pending program changes
     */
    void sendAllProgramChanges();

    /**
     * Clear all assignments
     */
    void clearAll();

    /**
     * Validate assignment
     */
    static bool validateAssignment(const InstrumentAssignment& instrument);

    /**
     * Check for channel conflicts
     */
    std::string findChannelConflict(int channel, const std::string& excludeTrackId = "") const;

    /**
     * Get available MIDI channels
     */
    std::vector<int> getAvailableChannels() const;

private:
    juce::MidiOutput* midiOutput;
    std::map<std::string, InstrumentAssignment> assignments;
    juce::CriticalSection lock;

    /**
     * Send MIDI message
     */
    void sendMidiMessage(const juce::MidiMessage& message);

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(InstrumentMapper)
};

} // namespace midi
} // namespace white_room
