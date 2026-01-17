/*******************************************************************************
 * FilterGate - Preset Manager
 *
 * Handles preset save/load functionality with JSON serialization.
 * Manages factory and user presets.
 *
 * @author FilterGate Autonomous Agent 7
 * @date  2025-12-30
 ******************************************************************************/

#pragma once

#include <juce_core/juce_core.h>
#include "dsp/DualPhaser.h"
#include "dsp/FilterEngine.h"
#include "dsp/GateDetector.h"
#include "dsp/EnvelopeGenerator.h"
#include "dsp/EnvelopeFollower.h"
#include "dsp/ModulationMatrix.h"
#include "dsp/Mixer.h"
#include "dsp/DriveStage.h"

namespace FilterGate {

//==============================================================================
/**
 * Complete preset structure
 *
 * Contains all parameters for all DSP modules in FilterGate.
 * Designed for JSON serialization and version compatibility.
 */
struct Preset {
    // Metadata
    juce::String name = "Untitled";
    juce::String author = "Unknown";
    juce::String category = "User";
    juce::String description = "";
    int version = 1;                    // Preset format version
    juce::String createdDate = "";      // ISO 8601 format
    juce::String modifiedDate = "";     // ISO 8601 format

    // Gate parameters
    float gateThreshold = 0.5f;
    float gateAttack = 10.0f;
    float gateHold = 100.0f;
    float gateRelease = 200.0f;
    float gateHysteresis = 0.05f;

    // Envelope 1 parameters
    int env1Mode = 1;                   // 0 = ADR, 1 = ADSR
    float env1Attack = 10.0f;
    float env1Decay = 100.0f;
    float env1Sustain = 0.5f;
    float env1Release = 200.0f;
    bool env1Loop = false;
    bool env1VelocitySensitive = false;

    // Envelope 2 parameters
    int env2Mode = 1;
    float env2Attack = 10.0f;
    float env2Decay = 100.0f;
    float env2Sustain = 0.5f;
    float env2Release = 200.0f;
    bool env2Loop = false;
    bool env2VelocitySensitive = false;

    // Envelope Follower parameters
    float envFollowerAttack = 5.0f;
    float envFollowerRelease = 50.0f;

    // Pre-Drive parameters
    int preDriveType = 0;               // 0 = SOFT_CLIP, 1 = HARD_CLIP, 2 = ASYMMETRIC, 3 = FUZZ
    float preDriveDrive = 0.0f;
    float preDriveOutput = 1.0f;
    float preDriveTone = 0.5f;

    // Post-Drive parameters
    int postDriveType = 0;
    float postDriveDrive = 0.0f;
    float postDriveOutput = 1.0f;
    float postDriveTone = 0.5f;

    // Phaser A parameters
    int phaserAStages = 4;
    float phaserARate = 0.5f;
    float phaserADepth = 0.7f;
    float phaserAFeedback = 0.5f;
    float phaserACenter = 1000.0f;
    float phaserASpread = 2000.0f;
    float phaserAMix = 0.5f;

    // Phaser B parameters
    int phaserBStages = 4;
    float phaserBRate = 0.5f;
    float phaserBDepth = 0.7f;
    float phaserBFeedback = 0.5f;
    float phaserBCenter = 1000.0f;
    float phaserBSpread = 2000.0f;
    float phaserBMix = 0.5f;

    // Dual Phaser parameters
    int dualPhaserRouting = 0;          // 0 = SERIAL, 1 = PARALLEL, 2 = STEREO
    float dualPhaserLFOPhaseOffset = 0.0f;
    float dualPhaserCrossFeedback = 0.0f;

    // Filter parameters
    int filterModel = 0;                // 0 = SVF, 1 = LADDER, 2 = OTA, 3 = MS20, 4 = COMB, 5 = MORPH
    float filterCutoff = 1000.0f;
    float filterResonance = 0.5f;
    float filterDrive = 0.0f;
    float filterPostDrive = 0.0f;
    float filterKeyTrack = 0.0f;
    float filterPitch = 69.0f;          // MIDI note (69 = A4 = 440Hz)
    int filterOversampling = 1;

    // Mixer parameters
    float mixerDryLevel = 0.0f;
    float mixerWetLevel = 1.0f;
    float mixerPhaserAMix = 1.0f;
    float mixerPhaserBMix = 1.0f;
    float mixerFilterMix = 1.0f;
    int mixerRouting = 0;               // 0 = SERIES, 1 = PARALLEL, 2 = PHASER_FILTER, 3 = FILTER_PHASER, 4 = STEREO_SPLIT
    float mixerOutputLevel = 1.0f;

    // Modulation Matrix routes
    // Each route: [source, destination, amount, slewMs]
    juce::Array<juce::String> modulationRoutes;
    bool modulationMatrixEnabled = true;

    //==============================================================================
    // Serialization
    //==============================================================================

    /**
     * Convert preset to JSON
     */
    juce::var toJSON() const;

    /**
     * Create preset from JSON
     */
    static Preset fromJSON(const juce::var& json);

    /**
     * Convert preset to JSON string
     */
    juce::String toString() const;

    /**
     * Create preset from JSON string
     */
    static Preset fromString(const juce::String& jsonString);

    //==============================================================================
    // Parameter Application
    //==============================================================================

    /**
     * Apply preset to FilterGateProcessor modules
     * (Requires access to all DSP modules)
     */
    void applyToModules(class FilterGateProcessor& processor) const;

    /**
     * Capture current state from FilterGateProcessor modules
     */
    static Preset captureFromProcessor(const class FilterGateProcessor& processor,
                                      const juce::String& name = "Untitled");
};

//==============================================================================
/**
 * Preset Manager
 *
 * Manages factory presets and user presets.
 * Handles preset loading, saving, and organization.
 */
class PresetManager {
public:
    PresetManager();
    ~PresetManager();

    //==============================================================================
    // Factory Presets
    //==============================================================================

    /**
     * Get all factory presets
     */
    juce::Array<Preset> getFactoryPresets() const;

    /**
     * Get factory preset by name
     */
    Preset getFactoryPreset(const juce::String& name) const;

    /**
     * Get factory preset names
     */
    juce::StringArray getFactoryPresetNames() const;

    //==============================================================================
    // User Presets
    //==============================================================================

    /**
     * Load user preset from file
     */
    Preset loadUserPreset(const juce::File& file) const;

    /**
     * Save user preset to file
     */
    bool saveUserPreset(const Preset& preset, const juce::File& file) const;

    /**
     * Get user presets directory
     */
    juce::File getUserPresetsDirectory() const;

    /**
     * Get all user preset files
     */
    juce::Array<juce::File> getUserPresetFiles() const;

    //==============================================================================
    // Validation
    //==============================================================================

    /**
     * Validate preset structure
     * @return true if preset is valid, false otherwise
     */
    bool validatePreset(const Preset& preset) const;

    /**
     * Get validation error message
     */
    juce::String getValidationError() const { return lastValidationError; }

private:
    mutable juce::String lastValidationError;

    /**
     * Create factory presets
     */
    void createFactoryPresets();

    /**
     * Create specific factory presets
     */
    Preset createInitPreset() const;
    Preset createSubtlePhaserPreset() const;
    Preset createDeepPhaserPreset() const;
    Preset createFilterSweepPreset() const;
    Preset createGateTriggerPreset() const;
    Preset createModulationDemoPreset() const;
    Preset createDualPhaserPreset() const;
    Preset createSoftDrivePreset() const;
    Preset createHardClipPreset() const;
    Preset createVintagePreset() const;
    Preset createModernPreset() const;
    Preset createAmbientPadPreset() const;
    Preset createFunkRhythmPreset() const;
    Preset createElectronicPreset() const;
    Preset createBassEnhancerPreset() const;
    Preset createVocalFXPreset() const;
    Preset createDrumBusPreset() const;
    Preset createSynthLeadPreset() const;
    Preset createGuitarFXPreset() const;
    Preset createExperimentalPreset() const;
    Preset createExtremeModulationPreset() const;
    Preset createMinimalPreset() const;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(PresetManager)
};

//==============================================================================
/**
 * Preset exception for errors
 */
class PresetException : public std::exception {
public:
    explicit PresetException(const juce::String& message) : msg(message.toStdString()) {}
    const char* what() const noexcept override { return msg.c_str(); }
private:
    std::string msg;
};

} // namespace FilterGate
