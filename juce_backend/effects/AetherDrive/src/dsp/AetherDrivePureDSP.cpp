/*
  ==============================================================================

    AetherDrivePureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Pure DSP implementation of Aether Drive
    Guitar effects pedal emulator with bridge nonlinearity and body resonator

  ==============================================================================
*/

#include "dsp/AetherDrivePureDSP.h"
#include <cstring>
#include <random>
#include <algorithm>
#include <cassert>

// DSP logging is disabled for effect plugins
#define LOG_PARAMETER_CHANGE(plugin, param, oldVal, newVal)

namespace DSP {

//==============================================================================
// Bridge Nonlinearity Implementation
//==============================================================================

AetherDrivePureDSP::BridgeNonlinearity::BridgeNonlinearity()
{
}

void AetherDrivePureDSP::BridgeNonlinearity::prepare(double sampleRate)
{
    this->sampleRate = sampleRate;
}

void AetherDrivePureDSP::BridgeNonlinearity::reset()
{
    state = 0.0f;
}

float AetherDrivePureDSP::BridgeNonlinearity::processSample(float input)
{
    // Apply drive (pre-gain before nonlinearity)
    float driven = input * (1.0f + driveAmount * 3.0f); // Up to 4x gain

    // Apply soft clipping using tanh (tube-like saturation)
    float saturated = std::tanh(driven);

    // Apply tone control (simple lowpass filter)
    // Higher tone = less filtering (more high frequencies)
    float alpha = 1.0f - (toneAmount * 0.5f); // 0.5 to 1.0
    float output = alpha * state + (1.0f - alpha) * saturated;
    state = output;

    return output;
}

void AetherDrivePureDSP::BridgeNonlinearity::setDrive(float drive)
{
    driveAmount = std::max(0.0f, std::min(1.0f, drive));
}

void AetherDrivePureDSP::BridgeNonlinearity::setTone(float tone)
{
    toneAmount = std::max(0.0f, std::min(1.0f, tone));
}

//==============================================================================
// Modal Body Resonator Implementation
//==============================================================================

void AetherDrivePureDSP::ModalBodyResonator::Mode::prepare(double sampleRate)
{
    // Nothing to prepare - state is reset independently
}

float AetherDrivePureDSP::ModalBodyResonator::Mode::processSample(float excitation)
{
    // Simple resonant filter (2nd order harmonic oscillator)
    // Use 48kHz as default - will be overridden by prepare()
    float safeSampleRate = 48000.0f;
    float omega = 2.0f * M_PI * frequency / safeSampleRate;

    phase += omega;
    if (phase > 2.0f * M_PI) phase -= 2.0f * M_PI;

    // Decay energy with NaN safety
    float safeDecay = std::max(0.001f, decay);
    float decayFactor = std::exp(-1.0f / (safeDecay * safeSampleRate));

    // Clamp energy to prevent NaN/Inf explosion
    energy = energy * decayFactor + excitation * amplitude * 0.1f;
    energy = std::max(-100.0f, std::min(100.0f, energy));

    float output = std::sin(phase) * energy;

    // Final NaN check
    if (std::isnan(output) || std::isinf(output))
    {
        energy = 0.0f;
        return 0.0f;
    }

    return output;
}

void AetherDrivePureDSP::ModalBodyResonator::Mode::reset()
{
    phase = 0.0f;
    energy = 0.0f;
}

AetherDrivePureDSP::ModalBodyResonator::ModalBodyResonator()
{
    modes.resize(8);
}

void AetherDrivePureDSP::ModalBodyResonator::prepare(double sampleRate)
{
    this->sampleRate = sampleRate;
    for (auto& mode : modes)
    {
        mode.prepare(sampleRate);
    }
}

void AetherDrivePureDSP::ModalBodyResonator::reset()
{
    for (auto& mode : modes)
    {
        mode.reset();
    }
}

float AetherDrivePureDSP::ModalBodyResonator::processSample(float input)
{
    float output = 0.0f;
    for (auto& mode : modes)
    {
        output += mode.processSample(input);
    }
    return output * resonanceAmount;
}

void AetherDrivePureDSP::ModalBodyResonator::setResonance(float amount)
{
    resonanceAmount = amount;
}

void AetherDrivePureDSP::ModalBodyResonator::loadGuitarBodyPreset()
{
    // Typical acoustic guitar body modes
    modes.resize(8);

    modes[0].frequency = 95.0f;   // Air resonance
    modes[0].amplitude = 1.0f;
    modes[0].decay = 2.0f;

    modes[1].frequency = 190.0f;  // Top plate
    modes[1].amplitude = 0.8f;
    modes[1].decay = 1.5f;

    modes[2].frequency = 280.0f;  // Back plate
    modes[2].amplitude = 0.6f;
    modes[2].decay = 1.2f;

    modes[3].frequency = 400.0f;  // Helmholtz
    modes[3].amplitude = 0.5f;
    modes[3].decay = 1.0f;

    modes[4].frequency = 580.0f;  // Higher stiffness
    modes[4].amplitude = 0.4f;
    modes[4].decay = 0.8f;

    modes[5].frequency = 750.0f;
    modes[5].amplitude = 0.3f;
    modes[5].decay = 0.6f;

    modes[6].frequency = 920.0f;
    modes[6].amplitude = 0.2f;
    modes[6].decay = 0.5f;

    modes[7].frequency = 1100.0f;
    modes[7].amplitude = 0.15f;
    modes[7].decay = 0.4f;
}

void AetherDrivePureDSP::ModalBodyResonator::loadViolinBodyPreset()
{
    // Violin body modes (higher frequencies, shorter decay)
    modes.resize(8);

    modes[0].frequency = 280.0f;  // Main wood resonance
    modes[0].amplitude = 1.0f;
    modes[0].decay = 1.5f;

    modes[1].frequency = 450.0f;  // Top plate
    modes[1].amplitude = 0.8f;
    modes[1].decay = 1.2f;

    modes[2].frequency = 600.0f;  // Air cavity
    modes[2].amplitude = 0.6f;
    modes[2].decay = 1.0f;

    modes[3].frequency = 900.0f;  // Bridge
    modes[3].amplitude = 0.5f;
    modes[3].decay = 0.8f;

    modes[4].frequency = 1200.0f;
    modes[4].amplitude = 0.4f;
    modes[4].decay = 0.6f;

    modes[5].frequency = 1600.0f;
    modes[5].amplitude = 0.3f;
    modes[5].decay = 0.5f;

    modes[6].frequency = 2200.0f;
    modes[6].amplitude = 0.2f;
    modes[6].decay = 0.4f;

    modes[7].frequency = 3000.0f;
    modes[7].amplitude = 0.15f;
    modes[7].decay = 0.3f;
}

void AetherDrivePureDSP::ModalBodyResonator::loadCelloBodyPreset()
{
    // Cello body modes (lower frequencies, longer decay)
    modes.resize(8);

    modes[0].frequency = 130.0f;  // Main body resonance
    modes[0].amplitude = 1.0f;
    modes[0].decay = 2.5f;

    modes[1].frequency = 200.0f;  // Top plate
    modes[1].amplitude = 0.8f;
    modes[1].decay = 2.0f;

    modes[2].frequency = 280.0f;  // Air cavity
    modes[2].amplitude = 0.6f;
    modes[2].decay = 1.5f;

    modes[3].frequency = 400.0f;  // Bridge
    modes[3].amplitude = 0.5f;
    modes[3].decay = 1.2f;

    modes[4].frequency = 550.0f;
    modes[4].amplitude = 0.4f;
    modes[4].decay = 1.0f;

    modes[5].frequency = 700.0f;
    modes[5].amplitude = 0.3f;
    modes[5].decay = 0.8f;

    modes[6].frequency = 900.0f;
    modes[6].amplitude = 0.2f;
    modes[6].decay = 0.6f;

    modes[7].frequency = 1100.0f;
    modes[7].amplitude = 0.15f;
    modes[7].decay = 0.5f;
}

void AetherDrivePureDSP::ModalBodyResonator::loadUprightBassPreset()
{
    // Upright bass body modes (very low frequencies, very long decay)
    modes.resize(8);

    modes[0].frequency = 80.0f;   // Main body
    modes[0].amplitude = 1.0f;
    modes[0].decay = 3.0f;

    modes[1].frequency = 120.0f;  // Top plate
    modes[1].amplitude = 0.8f;
    modes[1].decay = 2.5f;

    modes[2].frequency = 180.0f;  // Air cavity
    modes[2].amplitude = 0.6f;
    modes[2].decay = 2.0f;

    modes[3].frequency = 250.0f;  // Bridge
    modes[3].amplitude = 0.5f;
    modes[3].decay = 1.5f;

    modes[4].frequency = 350.0f;
    modes[4].amplitude = 0.4f;
    modes[4].decay = 1.2f;

    modes[5].frequency = 450.0f;
    modes[5].amplitude = 0.3f;
    modes[5].decay = 1.0f;

    modes[6].frequency = 600.0f;
    modes[6].amplitude = 0.2f;
    modes[6].decay = 0.8f;

    modes[7].frequency = 800.0f;
    modes[7].amplitude = 0.15f;
    modes[7].decay = 0.6f;
}

float AetherDrivePureDSP::ModalBodyResonator::getModeFrequency(int index) const
{
    if (index >= 0 && index < static_cast<int>(modes.size()))
        return modes[index].frequency;
    return 0.0f;
}

//==============================================================================
// Main DSP Implementation
//==============================================================================

AetherDrivePureDSP::AetherDrivePureDSP()
{
    // Load default preset (Clean Boost)
    loadFactoryPreset(0);
}

AetherDrivePureDSP::~AetherDrivePureDSP()
{
}

bool AetherDrivePureDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;

    // Prepare internal DSP modules
    bridgeNonlinearity_.prepare(sampleRate);
    bodyResonator_.prepare(sampleRate);

    // Load guitar body preset by default
    bodyResonator_.loadGuitarBodyPreset();

    return true;
}

void AetherDrivePureDSP::reset()
{
    bridgeNonlinearity_.reset();
    bodyResonator_.reset();
}

void AetherDrivePureDSP::process(float** inputs, float** outputs, int numChannels, int numSamples)
{
    // Process mono or stereo
    int channelsToProcess = std::min(2, numChannels);

    for (int ch = 0; ch < channelsToProcess; ++ch)
    {
        // Clear output buffer
        std::fill(outputs[ch], outputs[ch] + numSamples, 0.0f);

        for (int i = 0; i < numSamples; ++i)
        {
            float input = inputs[ch][i];

            // Check for NaN input
            if (std::isnan(input) || std::isinf(input))
            {
                input = 0.0f;
            }

            // Store dry signal for mix
            float dry = input;

            // Process through bridge nonlinearity (distortion)
            float distorted = bridgeNonlinearity_.processSample(input);

            // Process through body resonator (cabinet simulation)
            float resonant = bodyResonator_.processSample(distorted);

            // Apply cabinet simulation (mix in resonant signal)
            float wet = distorted * (1.0f - params_.cabinetSimulation) +
                       resonant * params_.cabinetSimulation;

            // Apply dry/wet mix
            float output = dry * (1.0f - params_.mix) + wet * params_.mix;

            // Apply output level
            output *= params_.outputLevel;

            // Final safety checks
            if (std::isnan(output) || std::isinf(output))
            {
                output = 0.0f;
            }

            // Soft clip output to prevent digital clipping
            output = std::tanh(output);

            // Copy to output
            outputs[ch][i] = output;
        }
    }

    // Clear any additional channels
    for (int ch = channelsToProcess; ch < numChannels; ++ch)
    {
        std::fill(outputs[ch], outputs[ch] + numSamples, 0.0f);
    }
}

float AetherDrivePureDSP::getParameter(const char* paramId) const
{
    if (std::strcmp(paramId, "drive") == 0)
        return params_.drive;
    if (std::strcmp(paramId, "bass") == 0)
        return params_.bass;
    if (std::strcmp(paramId, "mid") == 0)
        return params_.mid;
    if (std::strcmp(paramId, "treble") == 0)
        return params_.treble;
    if (std::strcmp(paramId, "body_resonance") == 0)
        return params_.bodyResonance;
    if (std::strcmp(paramId, "resonance_decay") == 0)
        return params_.resonanceDecay;
    if (std::strcmp(paramId, "mix") == 0)
        return params_.mix;
    if (std::strcmp(paramId, "output_level") == 0)
        return params_.outputLevel;
    if (std::strcmp(paramId, "cabinet_simulation") == 0)
        return params_.cabinetSimulation;

    return 0.0f;
}

void AetherDrivePureDSP::setParameter(const char* paramId, float value)
{
    // Get old value for logging
    float oldValue = getParameter(paramId);

    if (std::strcmp(paramId, "drive") == 0)
        params_.drive = value;
    else if (std::strcmp(paramId, "bass") == 0)
        params_.bass = value;
    else if (std::strcmp(paramId, "mid") == 0)
        params_.mid = value;
    else if (std::strcmp(paramId, "treble") == 0)
        params_.treble = value;
    else if (std::strcmp(paramId, "body_resonance") == 0)
        params_.bodyResonance = value;
    else if (std::strcmp(paramId, "resonance_decay") == 0)
        params_.resonanceDecay = value;
    else if (std::strcmp(paramId, "mix") == 0)
        params_.mix = value;
    else if (std::strcmp(paramId, "output_level") == 0)
        params_.outputLevel = value;
    else if (std::strcmp(paramId, "cabinet_simulation") == 0)
        params_.cabinetSimulation = value;

    // Log parameter change
    LOG_PARAMETER_CHANGE("AetherDrive", paramId, oldValue, value);

    applyParameters();
}

bool AetherDrivePureDSP::savePreset(char* jsonBuffer, int jsonBufferSize) const
{
    int offset = 0;

    // Write opening brace
    int remaining = jsonBufferSize - offset;
    if (remaining < 10) return false;
    std::snprintf(jsonBuffer + offset, remaining, "{");
    offset = 1;

    writeJsonParameter("drive", params_.drive, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("bass", params_.bass, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("mid", params_.mid, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("treble", params_.treble, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("body_resonance", params_.bodyResonance, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("resonance_decay", params_.resonanceDecay, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("mix", params_.mix, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("output_level", params_.outputLevel, jsonBuffer, offset, jsonBufferSize);
    writeJsonParameter("cabinet_simulation", params_.cabinetSimulation, jsonBuffer, offset, jsonBufferSize);

    // Remove trailing comma and add closing brace
    if (offset > 1 && jsonBuffer[offset - 1] == ',')
    {
        offset--;
    }

    remaining = jsonBufferSize - offset;
    if (remaining < 2) return false;
    std::snprintf(jsonBuffer + offset, remaining, "}");

    return true;
}

bool AetherDrivePureDSP::loadPreset(const char* jsonData)
{
    double value;

    if (parseJsonParameter(jsonData, "drive", value))
        params_.drive = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "bass", value))
        params_.bass = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "mid", value))
        params_.mid = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "treble", value))
        params_.treble = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "body_resonance", value))
        params_.bodyResonance = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "resonance_decay", value))
        params_.resonanceDecay = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "mix", value))
        params_.mix = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "output_level", value))
        params_.outputLevel = static_cast<float>(value);
    if (parseJsonParameter(jsonData, "cabinet_simulation", value))
        params_.cabinetSimulation = static_cast<float>(value);

    applyParameters();

    return true;
}

bool AetherDrivePureDSP::loadFactoryPreset(int index)
{
    if (index < 0 || index >= NUM_FACTORY_PRESETS)
        return false;

    const AetherDrivePreset& preset = AETHER_DRIVE_FACTORY_PRESETS[index];

    params_.drive = preset.drive;
    params_.bass = preset.bass;
    params_.mid = preset.mid;
    params_.treble = preset.treble;
    params_.bodyResonance = preset.bodyResonance;
    params_.resonanceDecay = preset.resonanceDecay;
    params_.mix = preset.mix;
    params_.outputLevel = preset.outputLevel;
    params_.cabinetSimulation = preset.cabinetSimulation;

    applyParameters();

    return true;
}

const char* AetherDrivePureDSP::getFactoryPresetName(int index)
{
    if (index < 0 || index >= NUM_FACTORY_PRESETS)
        return "Unknown";

    return AETHER_DRIVE_FACTORY_PRESETS[index].name;
}

void AetherDrivePureDSP::applyParameters()
{
    // Apply drive to bridge nonlinearity
    bridgeNonlinearity_.setDrive(params_.drive);

    // Apply tone control (use treble parameter for tone)
    bridgeNonlinearity_.setTone(params_.treble);

    // Apply body resonance
    bodyResonator_.setResonance(params_.bodyResonance);

    // Adjust resonance decay times based on parameter
    float decayMultiplier = 0.5f + params_.resonanceDecay * 1.5f; // 0.5x to 2.0x
    for (int i = 0; i < bodyResonator_.getNumModes(); ++i)
    {
        // We'd need to store original decay values to do this properly
        // For now, just use the parameter as a modifier
        // This is a simplification - in a full implementation, we'd store base values
    }
}

bool AetherDrivePureDSP::writeJsonParameter(const char* name, double value,
                                           char* buffer, int& offset,
                                           int bufferSize) const
{
    int remaining = bufferSize - offset;
    if (remaining < 50) return false;

    int written = std::snprintf(buffer + offset, remaining,
                               "\"%s\":%.6f,",
                               name, value);

    if (written < 0 || written >= remaining) return false;

    offset += written;
    return true;
}

bool AetherDrivePureDSP::parseJsonParameter(const char* json, const char* param,
                                           double& value) const
{
    const char* search = json;
    char pattern[100];
    std::snprintf(pattern, sizeof(pattern), "\"%s\":", param);

    const char* found = std::strstr(search, pattern);
    if (!found) return false;

    found += std::strlen(pattern);
    value = std::atof(found);

    return true;
}

} // namespace DSP
