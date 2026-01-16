/*
  ==============================================================================

    PedalboardPureDSP.h
    Created: January 15, 2026
    Author: Bret Bouchard

    Modular pedalboard system with reconfigurable pedal chain

  ==============================================================================
*/

#pragma once

#include "GuitarPedalPureDSP.h"
#include <memory>
#include <vector>

namespace DSP {

//==============================================================================
/**
 * Modular Pedalboard System
 *
 * Allows chaining multiple guitar pedals in configurable order
 * - Load/unload pedals dynamically
 * - Reorder pedals by drag-and-drop
 * - Bypass individual pedals
 * - Save/load complete board configurations
 *
 * Features:
 * - Unlimited pedal slots
 * - Real-time pedal reordering
 * - Dry/wet mixing per pedal
 * - Global input/output gain
 * - Tuner and metronome integration
 */
class PedalboardPureDSP : public GuitarPedalPureDSP
{
public:
    //==============================================================================
    /**
     * Pedal slot configuration
     */
    struct PedalSlot
    {
        std::unique_ptr<GuitarPedalPureDSP> pedal;  // The pedal (nullptr if empty)
        bool bypassed = false;                       // Is this pedal bypassed?
        float mix = 1.0f;                            // Dry/wet mix (0=dry, 1=wet)
        float inputGain = 1.0f;                      // Input gain for this pedal
        float outputGain = 1.0f;                     // Output gain for this pedal

        bool isEmpty() const { return pedal == nullptr; }
    };

    //==============================================================================
    // Pedal Types (Factory)
    //==============================================================================

    enum class PedalType
    {
        None,
        Overdrive,
        Fuzz,
        Chorus,
        Delay
        // Add more as we implement them
    };

    //==============================================================================
    PedalboardPureDSP();
    ~PedalboardPureDSP() override;

    //==============================================================================
    // GuitarPedalPureDSP implementation
    //==============================================================================

    bool prepare(double sampleRate, int blockSize) override;
    void reset() override;
    void process(float** inputs, float** outputs, int numChannels, int numSamples) override;

    const char* getName() const override { return "White Room Pedalboard"; }
    PedalCategory getCategory() const override { return PedalCategory::TimeBased; }

    //==============================================================================
    // Pedalboard Management
    //==============================================================================

    /**
     * Add a pedal to the board
     * @param slotIndex Where to insert (-1 for end)
     * @param type Type of pedal to create
     * @return Index of added pedal
     */
    int addPedal(int slotIndex, PedalType type);

    /**
     * Remove a pedal from the board
     * @param slotIndex Slot to remove
     */
    void removePedal(int slotIndex);

    /**
     * Move a pedal to a new position
     * @param fromIndex Current position
     * @param toIndex New position
     */
    void movePedal(int fromIndex, int toIndex);

    /**
     * Swap two pedals
     */
    void swapPedals(int index1, int index2);

    /**
     * Clear all pedals
     */
    void clear();

    /**
     * Get number of pedal slots
     */
    int getNumPedals() const { return static_cast<int>(pedals_.size()); }

    /**
     * Get pedal slot (read-only)
     */
    const PedalSlot* getPedalSlot(int index) const;

    /**
     * Get pedal slot (mutable)
     */
    PedalSlot* getPedalSlot(int index);

    //==============================================================================
    // Parameters (Pedalboard-level)
    //==============================================================================

    static constexpr int NUM_PARAMETERS = 2;

    enum ParameterIndex
    {
        InputLevel = 0,
        OutputLevel
    };

    int getNumParameters() const override { return NUM_PARAMETERS; }

    const Parameter* getParameter(int index) const override;
    float getParameterValue(int index) const override;
    void setParameterValue(int index, float value) override;

    //==============================================================================
    // Presets (Board configurations)
    //==============================================================================

    static constexpr int NUM_PRESETS = 5;
    int getNumPresets() const override { return NUM_PRESETS; }
    const Preset* getPreset(int index) const override;

private:
    //==============================================================================
    // Processing Pipeline
    //==============================================================================

    /**
     * Process audio through pedal chain
     */
    void processChain(float** inputs, float** outputs, int numChannels, int numSamples);

    /**
     * Create pedal instance by type
     */
    std::unique_ptr<GuitarPedalPureDSP> createPedal(PedalType type);

    //==============================================================================
    // Member Variables
    //==============================================================================

    std::vector<PedalSlot> pedals_;           // Pedal chain

    struct Parameters
    {
        float inputLevel = 1.0f;               // Global input level
        float outputLevel = 1.0f;              // Global output level
    } params_;

    // Temporary buffers for processing (avoid real-time allocations)
    static constexpr int MAX_BLOCK_SIZE = 512;
    float tempBuffer_[2][MAX_BLOCK_SIZE];
};

//==============================================================================
// Factory Presets (Board Configurations)
//==============================================================================

static constexpr PedalboardPureDSP::Preset PEDALBOARD_PRESETS[PedalboardPureDSP::NUM_PRESETS] =
{
    {
        "Clean Board",
        (float[]){1.0f, 1.0f},
        2
    },
    {
        "Overdrive + Delay",
        (float[]){1.0f, 0.9f},
        2
    },
    {
        "Fuzz Board",
        (float[]){1.0f, 0.8f},
        2
    },
    {
        "Modulation Board",
        (float[]){1.0f, 0.9f},
        2
    },
    {
        "Full Board",
        (float[]){1.0f, 0.7f},
        2
    }
};

} // namespace DSP
