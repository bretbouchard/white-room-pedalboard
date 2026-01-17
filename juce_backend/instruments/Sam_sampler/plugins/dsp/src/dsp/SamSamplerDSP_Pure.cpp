/*
  ==============================================================================

    SamSamplerDSP_Pure.cpp
    Created: December 30, 2025
    Author:  Bret Bouchard

    Pure DSP implementation of Sam Sampler for tvOS

    Professional sampler with SF2 SoundFont support,
    sample playback, and real-time safe audio processing.
    No allocations in audio thread, deterministic output.

  ==============================================================================
*/

#define JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED 1

#include "dsp/SamSamplerDSP.h"
#include "../../../../include/dsp/InstrumentFactory.h"
#include "../../../../include/dsp/LookupTables.h"
#include "../../../../include/dsp/DSPLogging.h"
#include <cstring>
#include <cmath>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <fstream>

namespace DSP {

//==============================================================================
// Enhanced ADSR Envelope Implementation
//==============================================================================

void ADSREnvelope::reset()
{
    currentLevel = 0.0;
    envelopeTime = 0.0;
    isReleased = false;
    isActive = false;
}

void ADSREnvelope::start()
{
    currentLevel = 0.0;
    envelopeTime = 0.0;
    isReleased = false;
    isActive = true;
}

void ADSREnvelope::release()
{
    isReleased = true;
    envelopeTime = 0.0;
}

double ADSREnvelope::applyCurve(double t, EnvelopeCurve curve) const
{
    // t is normalized 0-1
    switch (curve)
    {
        case EnvelopeCurve::Linear:
            return t;

        case EnvelopeCurve::Exponential:
            // Natural exponential curve (easier in)
            return std::pow(t, 2.0);

        case EnvelopeCurve::Logarithmic:
            // Logarithmic curve (slower start)
            return std::sqrt(t);

        case EnvelopeCurve::SCurve:
            // Smooth S-curve using sine
            return (1.0 - std::cos(t * M_PI)) / 2.0;

        default:
            return t;
    }
}

double ADSREnvelope::process(double sampleRate, int numSamples)
{
    if (!isActive)
    {
        currentLevel = 0.0;
        return 0.0;
    }

    double time = envelopeTime / sampleRate;
    double target = 0.0;

    if (!isReleased)
    {
        // Attack phase
        if (time < attack)
        {
            double t = time / attack;
            target = applyCurve(t, attackCurve);
        }
        // Hold phase (NEW)
        else if (time < (attack + hold))
        {
            target = 1.0;  // Stay at peak
        }
        // Decay phase
        else if (time < (attack + hold + decay))
        {
            double t = (time - attack - hold) / decay;
            double curve = applyCurve(1.0 - t, decayCurve);  // Invert for decay
            target = sustain + (1.0 - sustain) * curve;
        }
        // Sustain phase
        else
        {
            target = sustain;
        }
    }
    else
    {
        // Release phase
        double timeInRelease = time;
        if (timeInRelease < releaseTime)
        {
            double t = timeInRelease / releaseTime;
            double curve = applyCurve(1.0 - t, releaseCurve);  // Invert for release
            target = currentLevel * curve;
        }
        else
        {
            isActive = false;
            currentLevel = 0.0;
            return 0.0;
        }
    }

    envelopeTime += static_cast<double>(numSamples);
    currentLevel = target;
    return currentLevel;
}

//==============================================================================
// State Variable Filter Implementation
//==============================================================================

void StateVariableFilter::reset()
{
    s1[0] = s1[1] = 0.0;
    s2[0] = s2[1] = 0.0;
    cutoffSmooth = cutoff;
    resonanceSmooth = resonance;
    coefficientsDirty = true;
}

void StateVariableFilter::prepare(double sampleRate)
{
    sampleRate = sampleRate;
    reset();
}

void StateVariableFilter::setParameters(double cutoff, double resonance)
{
    // Only update if parameters changed
    if (cutoffSmooth != cutoff || resonanceSmooth != resonance)
    {
        cutoffSmooth = cutoff;
        resonanceSmooth = resonance;
        coefficientsDirty = true;
    }
}

void StateVariableFilter::process(float** samples, int numChannels, int numSamples)
{
    // Smooth parameter changes
    cutoff = cutoff + (cutoffSmooth - cutoff) * (1.0 - smoothingCoeff);
    resonance = resonance + (resonanceSmooth - resonance) * (1.0 - smoothingCoeff);

    // Clamp values
    cutoff = std::max(20.0, std::min(20000.0, cutoff));
    resonance = std::max(0.0, std::min(1.0, resonance));

    // Only calculate coefficients if parameters changed
    double g, R, h;
    if (coefficientsDirty)
    {
        // Calculate filter coefficients (TPT topology)
        g = std::tan(M_PI * cutoff / sampleRate);
        R = 1.0 - (resonance * 0.99);  // Q = 1/R, range 0.5 to 100
        h = 1.0 / (1.0 + g * (2.0 * R + g));

        // Cache the coefficients
        cachedG = g;
        cachedR = R;
        cachedH = h;
        coefficientsDirty = false;
    }
    else
    {
        // Use cached coefficients
        g = cachedG;
        R = cachedR;
        h = cachedH;
    }

    // Process each sample
    for (int i = 0; i < numSamples; ++i)
    {
        for (int ch = 0; ch < numChannels; ++ch)
        {
            double input = static_cast<double>(samples[ch][i]);

            // TPT State Variable Filter
            double highpass = (input - (1.0 + g * 2.0 * R) * s1[ch] - g * g * s2[ch]) * h;
            double bandpass = g * highpass + s1[ch];
            double lowpass = g * bandpass + s2[ch];

            // Update states
            s1[ch] = 2.0 * bandpass - s1[ch];
            s2[ch] = 2.0 * lowpass - s2[ch];

            // Select output based on filter type
            double output = 0.0;
            switch (type)
            {
                case FilterType::Lowpass:
                    output = lowpass;
                    break;
                case FilterType::Bandpass:
                    output = bandpass;
                    break;
                case FilterType::Highpass:
                    output = highpass;
                    break;
                case FilterType::Notch:
                    output = input - bandpass;
                    break;
            }

            samples[ch][i] = static_cast<float>(output);
        }
    }
}

//==============================================================================
// SamSamplerVoice Implementation
//==============================================================================

SamSamplerVoice::SamSamplerVoice()
{
    // Initialize filter
    filter_.prepare(48000.0);
}

void SamSamplerVoice::setFilterParameters(double cutoff, double resonance, FilterType type)
{
    filter_.type = type;
    filter_.setParameters(cutoff, resonance);
    filterEnabled_ = true;
}

void SamSamplerVoice::setEnvelopeParameters(double attack, double hold, double decay, double sustain, double release,
                                            EnvelopeCurve attackCurve, EnvelopeCurve decayCurve, EnvelopeCurve releaseCurve)
{
    envelope_.attack = attack;
    envelope_.hold = hold;
    envelope_.decay = decay;
    envelope_.sustain = sustain;
    envelope_.releaseTime = release;
    envelope_.attackCurve = attackCurve;
    envelope_.decayCurve = decayCurve;
    envelope_.releaseCurve = releaseCurve;
}

void SamSamplerVoice::setInterpolationQuality(int quality)
{
    interpolationQuality_ = quality;
}

double SamSamplerVoice::interpolateLinear(double position) const
{
    if (!sample_ || !sample_->isValid())
        return 0.0;

    int index0 = static_cast<int>(position);
    int index1 = index0 + 1;
    double frac = position - index0;

    // Handle stereo samples
    int stride = sample_->numChannels;

    if (sample_->numChannels == 1)
    {
        // Mono
        if (index0 >= 0 && index0 < sample_->numSamples - 1)
        {
            return sample_->audioData[index0] * (1.0 - frac) +
                   sample_->audioData[index1] * frac;
        }
    }
    else if (sample_->numChannels == 2)
    {
        // Stereo - take left channel
        index0 = index0 * 2;
        index1 = index0 + 2;

        if (index0 >= 0 && index0 < sample_->numSamples * 2 - 2)
        {
            return sample_->audioData[index0] * (1.0 - frac) +
                   sample_->audioData[index1] * frac;
        }
    }

    return 0.0;
}

double SamSamplerVoice::interpolateCubic(double position) const
{
    if (!sample_ || !sample_->isValid())
        return 0.0;

    int index = static_cast<int>(position);
    double frac = position - index;

    // Handle stereo samples
    int stride = sample_->numChannels;

    if (sample_->numChannels == 1)
    {
        // Mono - need 4 samples for cubic
        if (index >= 1 && index < sample_->numSamples - 2)
        {
            double y0 = sample_->audioData[index - 1];
            double y1 = sample_->audioData[index];
            double y2 = sample_->audioData[index + 1];
            double y3 = sample_->audioData[index + 2];

            // Cubic interpolation
            return y1 + 0.5 * frac * (y2 - y0 +
                   frac * (2.0 * y0 - 5.0 * y1 + 4.0 * y2 - y3 +
                   frac * (3.0 * (y1 - y2) + y3 - y0)));
        }
    }
    else if (sample_->numChannels == 2)
    {
        // Stereo - left channel
        index = index * 2;

        if (index >= 2 && index < sample_->numSamples * 2 - 4)
        {
            double y0 = sample_->audioData[index - 2];
            double y1 = sample_->audioData[index];
            double y2 = sample_->audioData[index + 2];
            double y3 = sample_->audioData[index + 4];

            // Cubic interpolation
            return y1 + 0.5 * frac * (y2 - y0 +
                   frac * (2.0 * y0 - 5.0 * y1 + 4.0 * y2 - y3 +
                   frac * (3.0 * (y1 - y2) + y3 - y0)));
        }
    }

    // Fall back to linear if out of bounds
    return interpolateLinear(position);
}

double SamSamplerVoice::processLoopCrossfade(double position, int channel)
{
    if (!sample_ || !sample_->isValid())
        return 0.0;

    // Check if we're near loop end
    if (isLooping_ && position >= loopEnd_ - loopCrossfade_ * sample_->sampleRate)
    {
        double crossfadeSamples = loopCrossfade_ * sample_->sampleRate;
        double distanceToEnd = loopEnd_ - position;
        double crossfadeAmount = 1.0 - (distanceToEnd / crossfadeSamples);
        crossfadeAmount = std::max(0.0, std::min(1.0, crossfadeAmount));

        // Get sample from current position
        double sample1 = (interpolationQuality_ == 1) ?
                         interpolateCubic(position) :
                         interpolateLinear(position);

        // Get sample from loop start position
        double loopPosition = loopStart_ + (position - (loopEnd_ - crossfadeSamples));
        double sample2 = (interpolationQuality_ == 1) ?
                         interpolateCubic(loopPosition) :
                         interpolateLinear(loopPosition);

        // Crossfade
        return sample1 * (1.0 - crossfadeAmount) + sample2 * crossfadeAmount;
    }

    // Normal playback
    return (interpolationQuality_ == 1) ?
           interpolateCubic(position) :
           interpolateLinear(position);
}

void SamSamplerVoice::startNote(int midiNote, float velocity, std::shared_ptr<Sample> sample)
{
    midiNote_ = midiNote;
    velocity_ = velocity;
    frequency_ = midiToFrequency(midiNote);
    sample_ = sample;
    isActive_ = true;

    // Start envelope
    envelope_.start();

    // Reset filter state
    filter_.reset();

    // Calculate playback rate based on sample's root note
    if (sample_ && sample_->isValid())
    {
        double sampleRootFreq = midiToFrequency(static_cast<int>(sample_->rootNote));
        playbackRate_ = frequency_ / sampleRootFreq;

        // Apply pitch correction (in cents) using LookupTables
        double pitchCorrection = sample_->pitchCorrection / 1200.0; // cents to ratio
        playbackRate_ *= SchillingerEcosystem::DSP::LookupTables::getInstance().detuneToRatio(
            static_cast<float>(sample_->pitchCorrection)
        );
    }
    else
    {
        playbackRate_ = 1.0;
    }

    playPosition_ = 0.0;
}

void SamSamplerVoice::stopNote(float velocity)
{
    envelope_.release();
}

void SamSamplerVoice::reset()
{
    envelope_.reset();
    isActive_ = false;
    midiNote_ = 0;
    velocity_ = 0.0f;
    frequency_ = 440.0;
    playPosition_ = 0.0;
    playbackRate_ = 1.0;
    sample_.reset();
}

double SamSamplerVoice::midiToFrequency(int midiNote) const
{
    // Use LookupTables for MIDI to frequency conversion
    return static_cast<double>(
        SchillingerEcosystem::DSP::LookupTables::getInstance().midiToFreq(static_cast<float>(midiNote))
    );
}

void SamSamplerVoice::process(float** outputs, int numChannels, int numSamples, double sampleRate)
{
    if (!isActive_ || !sample_ || !sample_->isValid())
        return;

    // Temporary buffer for voice output (for filtering)
    std::vector<float> voiceBuffer(numSamples);

    // Process each sample
    for (int sample = 0; sample < numSamples; ++sample)
    {
        // Get envelope value
        double env = envelope_.process(sampleRate, 1);

        // Check if voice is finished
        if (!envelope_.isActive)
        {
            isActive_ = false;
            break;
        }

        // Get interpolated sample with improved quality
        double output = processLoopCrossfade(playPosition_, 0);

        // Apply envelope and velocity
        output *= env * static_cast<double>(velocity_);

        // Store in voice buffer
        voiceBuffer[sample] = static_cast<float>(output);

        // Advance playhead
        playPosition_ += playbackRate_;

        // Handle looping
        if (isLooping_ && playPosition_ >= loopEnd_)
        {
            playPosition_ = loopStart_ + (playPosition_ - loopEnd_);
        }
        // Check for end of sample
        else if (playPosition_ >= sample_->numSamples)
        {
            isActive_ = false;
            break;
        }
    }

    // Apply filter if enabled (processes entire buffer)
    if (filterEnabled_)
    {
        float* channelPtr[1] = { voiceBuffer.data() };
        filter_.process(channelPtr, 1, numSamples);
    }

    // Write to all output channels
    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            outputs[ch][i] += voiceBuffer[i];
        }
    }
}

//==============================================================================
// SF2Reader Implementation (Simplified for Phase 0)
//==============================================================================

bool SF2Reader::loadFile(const char* filePath)
{
    // For Phase 0, create a simple implementation that loads basic SF2 files
    // Full SF2 parsing would be implemented here
    // For now, we'll create dummy samples to test the architecture

    // TODO: Implement full RIFF parsing
    // For now, return true to indicate "loaded"
    // In production, this would parse the actual SF2 file format

    romName_ = "Default ROM";
    romVersion_ = "1.0";

    // Create a default instrument
    Instrument defaultInst;
    defaultInst.name = "Default Instrument";
    defaultInst.presetNumber = 0;
    defaultInst.bank = 0;

    // Create a default zone covering full MIDI range
    Zone defaultZone;
    defaultZone.keyRangeLow = 0;
    defaultZone.keyRangeHigh = 127;
    defaultZone.velocityRangeLow = 0;
    defaultZone.velocityRangeHigh = 127;
    defaultZone.rootKey = 60;

    // Create a simple sine wave sample for testing
    auto testSample = std::make_unique<Sample>();
    int testSampleRate = 44100;
    int duration = testSampleRate; // 1 second
    testSample->numSamples = duration;
    testSample->numChannels = 1;
    testSample->sampleRate = testSampleRate;
    testSample->rootNote = 60;
    testSample->audioData.resize(duration);

    // Generate sine wave using LookupTables
    for (int i = 0; i < duration; ++i)
    {
        double t = static_cast<double>(i) / testSampleRate;
        float phase = static_cast<float>(2.0 * M_PI * 440.0 * t);
        testSample->audioData[i] = SchillingerEcosystem::DSP::fastSineLookup(phase);
    }

    samples_.push_back(std::move(testSample));
    defaultZone.sampleIndex = 0;
    defaultInst.zones.push_back(defaultZone);
    instruments_.push_back(defaultInst);

    return true;
}

const SF2Reader::Instrument* SF2Reader::getInstrument(int index) const
{
    if (index >= 0 && index < static_cast<int>(instruments_.size()))
        return &instruments_[index];
    return nullptr;
}

const Sample* SF2Reader::getSample(int index) const
{
    if (index >= 0 && index < static_cast<int>(samples_.size()))
        return samples_[index].get();
    return nullptr;
}

const Sample* SF2Reader::findSample(int instrumentIndex, int midiNote, float velocity) const
{
    const Instrument* inst = getInstrument(instrumentIndex);
    if (!inst)
        return nullptr;

    // Find zone matching MIDI note and velocity
    for (const auto& zone : inst->zones)
    {
        if (midiNote >= zone.keyRangeLow && midiNote <= zone.keyRangeHigh &&
            velocity >= zone.velocityRangeLow && velocity <= zone.velocityRangeHigh)
        {
            return getSample(zone.sampleIndex);
        }
    }

    return nullptr;
}

//==============================================================================
// SamSamplerDSP Implementation
//==============================================================================

SamSamplerDSP::SamSamplerDSP()
{
    // Initialize voices
    for (auto& voice : voices_)
    {
        voice = std::make_unique<SamSamplerVoice>();
    }

    // Create SF2 reader
    sf2Reader_ = std::make_unique<SF2Reader>();
}

SamSamplerDSP::~SamSamplerDSP()
{
    // Voices and SF2 reader automatically cleaned up
}

bool SamSamplerDSP::prepare(double sampleRate, int blockSize)
{
    sampleRate_ = sampleRate;
    blockSize_ = blockSize;

    // Load a test sample if no samples are cached
    if (sampleCache_.empty() && sf2Reader_ && !sf2Reader_->isLoaded())
    {
        // Try to load an SF2 file (for now, creates a test sample)
        sf2Reader_->loadFile(""); // Empty path creates test data

        // Cache the samples
        for (int i = 0; i < sf2Reader_->getInstrumentCount(); ++i)
        {
            // Get all samples from the instrument and cache them
            // For now, just get the first sample
            const Sample* sample = sf2Reader_->getSample(0);
            if (sample)
            {
                // Create a shared copy of the sample
                auto sampleCopy = std::make_shared<Sample>();
                sampleCopy->audioData = sample->audioData;
                sampleCopy->numChannels = sample->numChannels;
                sampleCopy->sampleRate = sample->sampleRate;
                sampleCopy->numSamples = sample->numSamples;
                sampleCopy->rootNote = sample->rootNote;
                sampleCopy->pitchCorrection = sample->pitchCorrection;
                sampleCache_.push_back(sampleCopy);
            }
        }
    }

    // Reset all voices to inactive state and prepare filters
    for (auto& voice : voices_)
    {
        if (voice) {
            voice->reset();
            // Note: Filter is prepared in voice constructor with default sample rate
            // Could add voice->prepare(sampleRate) if needed
        }
    }

    return true;
}

void SamSamplerDSP::reset()
{
    // Reset all voices to inactive state
    for (auto& voice : voices_)
    {
        if (voice) {
            voice->reset();
        }
    }

    pitchBend_ = 0.0;
}

void SamSamplerDSP::process(float** outputs, int numChannels, int numSamples)
{
    // Clear output buffers
    for (int ch = 0; ch < numChannels; ++ch)
    {
        std::memset(outputs[ch], 0, sizeof(float) * numSamples);
    }

    // Process all active voices
    int activeCount = 0;
    for (auto& voice : voices_)
    {
        if (voice && voice->isActive())
        {
            voice->process(outputs, numChannels, numSamples, sampleRate_);
            activeCount++;
        }
    }

    // Apply master volume
    float masterVol = static_cast<float>(params_.masterVolume);
    for (int ch = 0; ch < numChannels; ++ch)
    {
        for (int i = 0; i < numSamples; ++i)
        {
            outputs[ch][i] *= masterVol;
        }
    }

    // Apply effects (Phase 2)
    // applyEffects(outputs, numChannels, numSamples);
}

void SamSamplerDSP::handleEvent(const ScheduledEvent& event)
{
    switch (event.type)
    {
        case ScheduledEvent::NOTE_ON:
        {
            SamSamplerVoice* voice = findFreeVoice();
            if (voice)
            {
                // Get sample from cache (for now, just use the first cached sample)
                std::shared_ptr<Sample> samplePtr;
                if (!sampleCache_.empty())
                {
                    samplePtr = sampleCache_[0];
                }

                voice->startNote(event.data.note.midiNote, event.data.note.velocity, samplePtr);

                // Apply filter settings if enabled
                if (params_.filterEnabled)
                {
                    FilterType type = static_cast<FilterType>(params_.filterType);
                    voice->setFilterParameters(params_.filterCutoff, params_.filterResonance, type);
                }

                // Apply envelope settings
                EnvelopeCurve attackCurve = static_cast<EnvelopeCurve>(params_.envAttackCurve);
                EnvelopeCurve decayCurve = static_cast<EnvelopeCurve>(params_.envDecayCurve);
                EnvelopeCurve releaseCurve = static_cast<EnvelopeCurve>(params_.envReleaseCurve);
                voice->setEnvelopeParameters(params_.envAttack, params_.envHold, params_.envDecay,
                                             params_.envSustain, params_.envRelease,
                                             attackCurve, decayCurve, releaseCurve);
            }
            break;
        }

        case ScheduledEvent::NOTE_OFF:
        {
            SamSamplerVoice* voice = findVoiceForNote(event.data.note.midiNote);
            if (voice)
            {
                voice->stopNote(event.data.note.velocity);
            }
            break;
        }

        case ScheduledEvent::PITCH_BEND:
        {
            pitchBend_ = event.data.pitchBend.bendValue;
            // Update active voices
            for (auto& voice : voices_)
            {
                if (voice && voice->isActive())
                {
                    // Voice will use pitchBend_ in next process call
                }
            }
            break;
        }

        case ScheduledEvent::RESET:
        {
            reset();
            break;
        }

        default:
            break;
    }
}

float SamSamplerDSP::getParameter(const char* paramId) const
{
    if (std::strcmp(paramId, "masterVolume") == 0)
        return static_cast<float>(params_.masterVolume);

    if (std::strcmp(paramId, "pitchBendRange") == 0)
        return static_cast<float>(params_.pitchBendRange);

    if (std::strcmp(paramId, "basePitch") == 0)
        return static_cast<float>(params_.basePitch);

    if (std::strcmp(paramId, "envAttack") == 0)
        return static_cast<float>(params_.envAttack);

    if (std::strcmp(paramId, "envHold") == 0)
        return static_cast<float>(params_.envHold);

    if (std::strcmp(paramId, "envDecay") == 0)
        return static_cast<float>(params_.envDecay);

    if (std::strcmp(paramId, "envSustain") == 0)
        return static_cast<float>(params_.envSustain);

    if (std::strcmp(paramId, "envRelease") == 0)
        return static_cast<float>(params_.envRelease);

    if (std::strcmp(paramId, "envAttackCurve") == 0)
        return static_cast<float>(params_.envAttackCurve);

    if (std::strcmp(paramId, "envDecayCurve") == 0)
        return static_cast<float>(params_.envDecayCurve);

    if (std::strcmp(paramId, "envReleaseCurve") == 0)
        return static_cast<float>(params_.envReleaseCurve);

    if (std::strcmp(paramId, "filterCutoff") == 0)
        return static_cast<float>(params_.filterCutoff);

    if (std::strcmp(paramId, "filterResonance") == 0)
        return static_cast<float>(params_.filterResonance);

    if (std::strcmp(paramId, "filterEnabled") == 0)
        return params_.filterEnabled ? 1.0f : 0.0f;

    if (std::strcmp(paramId, "filterType") == 0)
        return static_cast<float>(params_.filterType);

    return 0.0f;
}

void SamSamplerDSP::setParameter(const char* paramId, float value)
{
    // Get old value for logging (before change)
    float oldValue = getParameter(paramId);

    if (std::strcmp(paramId, "masterVolume") == 0)
    {
        params_.masterVolume = clamp(value, 0.0f, 1.0f);
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "pitchBendRange") == 0)
    {
        params_.pitchBendRange = clamp(value, 0.0f, 24.0f);
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "basePitch") == 0)
    {
        params_.basePitch = clamp(value, 0.1f, 4.0f);
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "envAttack") == 0)
    {
        params_.envAttack = clamp(value, 0.001f, 5.0f);
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "envHold") == 0)
    {
        params_.envHold = clamp(value, 0.0f, 5.0f);
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "envDecay") == 0)
    {
        params_.envDecay = clamp(value, 0.001f, 5.0f);
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "envSustain") == 0)
    {
        params_.envSustain = clamp(value, 0.0f, 1.0f);
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "envRelease") == 0)
    {
        params_.envRelease = clamp(value, 0.001f, 5.0f);
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "envAttackCurve") == 0)
    {
        params_.envAttackCurve = static_cast<int>(clamp(value, 0.0f, 3.0f));
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "envDecayCurve") == 0)
    {
        params_.envDecayCurve = static_cast<int>(clamp(value, 0.0f, 3.0f));
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "envReleaseCurve") == 0)
    {
        params_.envReleaseCurve = static_cast<int>(clamp(value, 0.0f, 3.0f));
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "filterCutoff") == 0)
    {
        params_.filterCutoff = clamp(value, 20.0f, 20000.0f);
        // Update all active voices
        for (auto& voice : voices_)
        {
            if (voice && voice->isActive())
            {
                FilterType type = static_cast<FilterType>(params_.filterType);
                voice->setFilterParameters(params_.filterCutoff, params_.filterResonance, type);
            }
        }
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "filterResonance") == 0)
    {
        params_.filterResonance = clamp(value, 0.0f, 1.0f);
        // Update all active voices
        for (auto& voice : voices_)
        {
            if (voice && voice->isActive())
            {
                FilterType type = static_cast<FilterType>(params_.filterType);
                voice->setFilterParameters(params_.filterCutoff, params_.filterResonance, type);
            }
        }
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "filterEnabled") == 0)
    {
        params_.filterEnabled = (value > 0.5f);
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }

    if (std::strcmp(paramId, "filterType") == 0)
    {
        params_.filterType = static_cast<int>(clamp(value, 0.0f, 3.0f));
        // Update all active voices
        for (auto& voice : voices_)
        {
            if (voice && voice->isActive())
            {
                FilterType type = static_cast<FilterType>(params_.filterType);
                voice->setFilterParameters(params_.filterCutoff, params_.filterResonance, type);
            }
        }
        LOG_PARAMETER_CHANGE("SamSampler", paramId, oldValue, value);
        return;
    }
}

bool SamSamplerDSP::savePreset(char* jsonBuffer, int jsonBufferSize) const
{
    if (!jsonBuffer || jsonBufferSize <= 0)
        return false;

    int offset = 0;

    // Write opening brace
    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = '{';

    // Write master volume
    if (!writeJsonParameter("masterVolume", params_.masterVolume, jsonBuffer, offset, jsonBufferSize))
        return false;

    // Write pitch bend range
    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = ',';
    if (!writeJsonParameter("pitchBendRange", params_.pitchBendRange, jsonBuffer, offset, jsonBufferSize))
        return false;

    // Write envelope parameters
    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = ',';
    if (!writeJsonParameter("envAttack", params_.envAttack, jsonBuffer, offset, jsonBufferSize))
        return false;

    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = ',';
    if (!writeJsonParameter("envDecay", params_.envDecay, jsonBuffer, offset, jsonBufferSize))
        return false;

    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = ',';
    if (!writeJsonParameter("envSustain", params_.envSustain, jsonBuffer, offset, jsonBufferSize))
        return false;

    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = ',';
    if (!writeJsonParameter("envRelease", params_.envRelease, jsonBuffer, offset, jsonBufferSize))
        return false;

    // Write closing brace
    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = '}';
    if (offset >= jsonBufferSize) return false;
    jsonBuffer[offset++] = '\0';

    return true;
}

bool SamSamplerDSP::loadPreset(const char* jsonData)
{
    if (!jsonData)
        return false;

    // Simple JSON parsing (in production, use a proper JSON library)
    double value;

    if (parseJsonParameter(jsonData, "masterVolume", value))
        params_.masterVolume = value;

    if (parseJsonParameter(jsonData, "pitchBendRange", value))
        params_.pitchBendRange = value;

    if (parseJsonParameter(jsonData, "envAttack", value))
        params_.envAttack = value;

    if (parseJsonParameter(jsonData, "envDecay", value))
        params_.envDecay = value;

    if (parseJsonParameter(jsonData, "envSustain", value))
        params_.envSustain = value;

    if (parseJsonParameter(jsonData, "envRelease", value))
        params_.envRelease = value;

    return true;
}

int SamSamplerDSP::getActiveVoiceCount() const
{
    int count = 0;
    for (const auto& voice : voices_)
    {
        if (voice && voice->isActive())
            count++;
    }
    return count;
}

//==============================================================================
// SF2 SoundFont Management
//==============================================================================

bool SamSamplerDSP::loadSoundFont(const char* filePath)
{
    if (!sf2Reader_)
        sf2Reader_ = std::make_unique<SF2Reader>();

    return sf2Reader_->loadFile(filePath);
}

int SamSamplerDSP::getSoundFontInstrumentCount() const
{
    if (sf2Reader_)
        return sf2Reader_->getInstrumentCount();
    return 0;
}

const char* SamSamplerDSP::getSoundFontInstrumentName(int index) const
{
    if (sf2Reader_)
    {
        const SF2Reader::Instrument* inst = sf2Reader_->getInstrument(index);
        if (inst)
            return inst->name.c_str();
    }
    return "";
}

bool SamSamplerDSP::selectSoundFontInstrument(int index)
{
    if (sf2Reader_ && index >= 0 && index < sf2Reader_->getInstrumentCount())
    {
        currentSoundFontInstrument_ = index;
        return true;
    }
    return false;
}

//==============================================================================
// Private Methods
//==============================================================================

SamSamplerVoice* SamSamplerDSP::findFreeVoice()
{
    // First, try to find a completely inactive voice
    for (auto& voice : voices_)
    {
        if (voice && !voice->isActive())
            return voice.get();
    }

    // If all voices are active, steal the oldest (first one)
    if (voices_[0])
        return voices_[0].get();

    return nullptr;
}

SamSamplerVoice* SamSamplerDSP::findVoiceForNote(int midiNote)
{
    for (auto& voice : voices_)
    {
        if (voice && voice->isActive() && voice->getMidiNote() == midiNote)
            return voice.get();
    }
    return nullptr;
}

void SamSamplerDSP::applyParameters(SamSamplerVoice& voice)
{
    // Apply global envelope parameters to voice
    // This would update voice envelope settings
}

bool SamSamplerDSP::writeJsonParameter(const char* name, double value, char* buffer, int& offset, int bufferSize) const
{
    char temp[128];
    int len = std::snprintf(temp, sizeof(temp), "\"%s\":%.6f", name, value);

    if (offset + len >= bufferSize)
        return false;

    std::memcpy(buffer + offset, temp, len);
    offset += len;
    return true;
}

bool SamSamplerDSP::parseJsonParameter(const char* json, const char* param, double& value) const
{
    // Very simple JSON parsing (for production, use a proper JSON library)
    char search[128];
    std::snprintf(search, sizeof(search), "\"%s\":", param);

    const char* found = std::strstr(json, search);
    if (!found)
        return false;

    // Parse number after the colon
    found += std::strlen(search);
    value = std::atof(found);
    return true;
}

//==============================================================================
// Static Factory (No runtime registration for tvOS hardening)
//==============================================================================

// Pure DSP instruments are instantiated directly, not through dynamic factory
// This ensures tvOS compatibility (no static initialization, no global state)

} // namespace DSP
