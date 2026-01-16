/*
  ==============================================================================

    OrchestrationAPI.h
    Created: 2 Dec 2025
    Author:  Schillinger System

    Advanced orchestration system implementing Schillinger's mathematical
    approach to instrument combination, texture analysis, and register field
    control for professional composition and arrangement.

  ==============================================================================
*/

#pragma once

#include "SchillingerSDK.h"
#include "AdvancedHarmonyAPI.h"
#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>
#include <memory>
#include <functional>

namespace Schillinger
{
    //==============================================================================
    /** Instrument families for orchestral organization */
    enum class InstrumentFamily : uint8_t
    {
        Strings = 0,          // Violin, viola, cello, double bass
        Woodwinds = 1,        // Flute, oboe, clarinet, bassoon
        Brass = 2,           // Trumpet, horn, trombone, tuba
        Percussion = 3,       // Timpani, orchestral percussion
        Keyboard = 4,         // Piano, organ, harpsichord
        Harp = 5,            // Concert harp
        Vocal = 6,           // Choir, solo voices
        Electronic = 7,       // Synthesizers, electronic instruments
        World = 8,           // Ethnic and folk instruments
        Guitar = 9,          // Acoustic and electric guitar
        BassGuitar = 10      // Electric and acoustic bass guitar
    };

    //==============================================================================
    /** Playing techniques and articulations */
    enum class PlayingTechnique : uint16_t
    {
        // Basic techniques
        Legato = 0x0001,
        Staccato = 0x0002,
        Pizzicato = 0x0004,
        Arco = 0x0008,
        Tremolo = 0x0010,
        Vibrato = 0x0020,
        Trill = 0x0040,
        Mute = 0x0080,

        // Extended techniques
        Harmonics = 0x0100,
        SulTasto = 0x0200,
        SulPonticello = 0x0400,
        ColLegno = 0x0800,
        FlutterTongue = 0x1000,
        Glissando = 0x2000,
        Portamento = 0x4000,
        Multiphonics = 0x8000
    };

    //==============================================================================
    /** Dynamic ranges and expressive capabilities */
    struct DynamicRange
    {
        double minDynamic = 0.0;      // Minimum volume (0.0-1.0)
        double maxDynamic = 1.0;      // Maximum volume (0.0-1.0)
        double averageDynamic = 0.6;  // Average comfortable dynamic
        bool hasWideDynamic = true;   // Wide dynamic range capability
        double dynamicRange = 1.0;    // Overall dynamic range
        juce::String dynamicDescription; // e.g., "Very wide dynamic range"

        /** Calculate dynamic range */
        void calculateDynamicRange()
        {
            dynamicRange = maxDynamic - minDynamic;
            hasWideDynamic = dynamicRange > 0.7;

            if (dynamicRange > 0.8)
                dynamicDescription = "Very wide dynamic range";
            else if (dynamicRange > 0.6)
                dynamicDescription = "Wide dynamic range";
            else if (dynamicRange > 0.4)
                dynamicDescription = "Moderate dynamic range";
            else if (dynamicRange > 0.2)
                dynamicDescription = "Limited dynamic range";
            else
                dynamicDescription = "Narrow dynamic range";
        }

        /** Convert to JSON */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("minDynamic", minDynamic);
            json->setProperty("maxDynamic", maxDynamic);
            json->setProperty("averageDynamic", averageDynamic);
            json->setProperty("hasWideDynamic", hasWideDynamic);
            json->setProperty("dynamicRange", dynamicRange);
            json->setProperty("dynamicDescription", dynamicDescription);
            return juce::var(json);
        }
    };

    //==============================================================================
    /** Register/tessitura information for instruments */
    struct RegisterInfo
    {
        double lowestNote = 0.0;      // MIDI note number
        double highestNote = 127.0;    // MIDI note number
        double comfortableLow = 24.0;  // Comfortable playing range low
        double comfortableHigh = 96.0; // Comfortable playing range high
        double optimalRange = 72.0;   // Optimal register for this instrument
        juce::String registerType;    // "soprano", "alto", "tenor", "bass", etc.
        juce::String clef;           // Primary clef used
        bool isTransposing = false;    // Whether instrument transposes
        int transposeInterval = 0;     // Transposition in semitones

        /** Get range span */
        double getRangeSpan() const { return highestNote - lowestNote; }

        /** Check if note is in comfortable range */
        bool isInComfortableRange(double note) const
        {
            return note >= comfortableLow && note <= comfortableHigh;
        }

        /** Convert note number to pitch name */
        juce::String noteToPitchName(double note) const
        {
            const juce::String noteNames[] = {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};
            int octave = static_cast<int>(note) / 12 - 1;
            int noteIndex = static_cast<int>(note) % 12;
            return noteNames[noteIndex] + juce::String(octave);
        }

        /** Convert to JSON */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("lowestNote", lowestNote);
            json->setProperty("highestNote", highestNote);
            json->setProperty("comfortableLow", comfortableLow);
            json->setProperty("comfortableHigh", comfortableHigh);
            json->setProperty("optimalRange", optimalRange);
            json->setProperty("rangeSpan", getRangeSpan());
            json->setProperty("registerType", registerType);
            json->setProperty("clef", clef);
            json->setProperty("isTransposing", isTransposing);
            json->setProperty("transposeInterval", transposeInterval);
            return juce::var(json);
        }
    };

    //==============================================================================
    /** Instrument definition with comprehensive properties */
    struct Instrument
    {
        int id = 0;
        juce::String name;             // Instrument name
        juce::String section;          // Section (e.g., "First Violins", "2nd Clarinets")
        InstrumentFamily family = InstrumentFamily::Strings;
        DynamicRange dynamicRange;
        RegisterInfo registerInfo;
        juce::Array<PlayingTechnique> availableTechniques;
        juce::StringList commonRoles;   // Typical orchestral roles
        juce::String soundCharacter;     // "bright", "warm", "mellow", "brilliant", etc.
        double blendFactor = 1.0;       // How well it blends with other instruments
        double presence = 1.0;           // How much presence it has in mix
        bool isSoloCapable = true;        // Can play effective solos
        bool isEnsembleCapable = true;  // Works well in ensemble
        juce::String manufacturer;        // Optional manufacturer info
        juce::String model;              // Optional model info
        juce::var metadata;              // Additional instrument-specific data

        /** Get all available techniques as string list */
        juce::StringArray getTechniqueNames() const
        {
            juce::StringArray names;
            for (auto technique : availableTechniques)
            {
                names.add(getTechniqueName(technique));
            }
            return names;
        }

        /** Check if instrument supports specific technique */
        bool hasTechnique(PlayingTechnique technique) const
        {
            return availableTechniques.contains(technique);
        }

        /** Get technique name from enum */
        static juce::String getTechniqueName(PlayingTechnique technique)
        {
            switch (technique)
            {
                case PlayingTechnique::Legato: return "Legato";
                case PlayingTechnique::Staccato: return "Staccato";
                case PlayingTechnique::Pizzicato: return "Pizzicato";
                case PlayingTechnique::Arco: return "Arco";
                case PlayingTechnique::Tremolo: return "Tremolo";
                case PlayingTechnique::Vibrato: return "Vibrato";
                case PlayingTechnique::Trill: return "Trill";
                case PlayingTechnique::Mute: return "Mute";
                case PlayingTechnique::Harmonics: return "Harmonics";
                case PlayingTechnique::SulTasto: return "Sul Tasto";
                case PlayingTechnique::SulPonticello: return "Sul Ponticello";
                case PlayingTechnique::ColLegno: return "Col Legno";
                case PlayingTechnique::FlutterTongue: return "Flutter Tongue";
                case PlayingTechnique::Glissando: return "Glissando";
                case PlayingTechnique::Portamento: return "Portamento";
                case PlayingTechnique::Multiphonics: return "Multiphonics";
                default: return "Unknown";
            }
        }

        /** Convert to JSON */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("id", id);
            json->setProperty("name", name);
            json->setProperty("section", section);
            json->setProperty("family", static_cast<int>(family));
            json->setProperty("dynamicRange", dynamicRange.toJson());
            json->setProperty("registerInfo", registerInfo.toJson());
            json->setProperty("soundCharacter", soundCharacter);
            json->setProperty("blendFactor", blendFactor);
            json->setProperty("presence", presence);
            json->setProperty("isSoloCapable", isSoloCapable);
            json->setProperty("isEnsembleCapable", isEnsembleCapable);
            json->setProperty("manufacturer", manufacturer);
            json->setProperty("model", model);
            json->setProperty("metadata", metadata);

            auto techniquesArray = new juce::Array<juce::var>();
            for (auto technique : availableTechniques)
                techniquesArray->add(juce::var(static_cast<int>(technique)));
            json->setProperty("availableTechniques", juce::var(techniquesArray));

            auto rolesArray = new juce::Array<juce::var>();
            for (const auto& role : commonRoles)
                rolesArray->add(juce::var(role));
            json->setProperty("commonRoles", juce::var(rolesArray));

            return juce::var(json);
        }
    };

    //==============================================================================
    /** Texture analysis results for orchestration */
    struct TextureAnalysis
    {
        juce::String textureType;        // "homophonic", "polyphonic", "monophonic", "heterophonic"
        double density = 0.0;            // Number of voices per measure
        double complexity = 0.0;         // Rhythmic and melodic complexity
        juce::String balance;            // "balanced", "heavy_bass", "bright_treble"
        juce::String spatialization;      // How instruments are spaced
        double transparency = 1.0;        // How transparent the texture is
        juce::String blendQuality;       // How well instruments blend
        juce::Array<juce::String> dominantInstruments; // Most prominent instruments
        juce::var schillingerAnalysis;   // Schillinger mathematical analysis

        /** Calculate texture metrics */
        void calculateMetrics(const juce::Array<Instrument>& instruments)
        {
            density = static_cast<double>(instruments.size());
            complexity = calculateComplexity(instruments);
            balance = determineBalance(instruments);
            spatialization = determineSpatialization(instruments);
            blendQuality = analyzeBlendQuality(instruments);
        }

        /** Convert to JSON */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("textureType", textureType);
            json->setProperty("density", density);
            json->setProperty("complexity", complexity);
            json->setProperty("balance", balance);
            json->setProperty("spatialization", spatialization);
            json->setProperty("transparency", transparency);
            json->setProperty("blendQuality", blendQuality);
            json->setProperty("schillingerAnalysis", schillingerAnalysis);

            auto instrumentsArray = new juce::Array<juce::var>();
            for (const auto& instrument : dominantInstruments)
                instrumentsArray->add(juce::var(instrument));
            json->setProperty("dominantInstruments", juce::var(instrumentsArray));

            return juce::var(json);
        }

    private:
        double calculateComplexity(const juce::Array<Instrument>& instruments)
        {
            double complexity = 0.0;
            for (const auto& instrument : instruments)
            {
                if (instrument.family == InstrumentFamily::Strings || instrument.family == InstrumentFamily::Woodwinds)
                    complexity += 1.5; // Higher complexity for melodic instruments
                else if (instrument.family == InstrumentFamily::Brass)
                    complexity += 1.2;
                else if (instrument.family == InstrumentFamily::Percussion)
                    complexity += 0.8;
                else
                    complexity += 1.0;
            }
            return juce::jlimit(0.0, 5.0, complexity / instruments.size());
        }

        juce::String determineBalance(const juce::Array<Instrument>& instruments)
        {
            int highRegister = 0, lowRegister = 0, midRegister = 0;

            for (const auto& instrument : instruments)
            {
                double centerNote = (instrument.registerInfo.lowestNote + instrument.registerInfo.highestNote) / 2;
                if (centerNote > 84) // High register
                    highRegister++;
                else if (centerNote < 48) // Low register
                    lowRegister++;
                else
                    midRegister++;
            }

            if (highRegister > lowRegister && highRegister > midRegister)
                return "bright_treble";
            else if (lowRegister > highRegister && lowRegister > midRegister)
                return "heavy_bass";
            else
                return "balanced";
        }

        juce::String determineSpatialization(const juce::Array<Instrument>& instruments)
        {
            // Analyze register spread
            double lowest = 127.0, highest = 0.0;
            for (const auto& instrument : instruments)
            {
                lowest = juce::jmin(lowest, instrument.registerInfo.lowestNote);
                highest = juce::jmax(highest, instrument.registerInfo.highestNote);
            }

            double range = highest - lowest;
            if (range > 60)
                return "wide_spread";
            else if (range > 36)
                return "moderate_spread";
            else
                return "close_spread";
        }

        juce::String analyzeBlendQuality(const juce::Array<Instrument>& instruments)
        {
            double totalBlendFactor = 0.0;
            for (const auto& instrument : instruments)
                totalBlendFactor += instrument.blendFactor;

            double averageBlend = totalBlendFactor / instruments.size();
            if (averageBlend > 0.8)
                return "excellent_blend";
            else if (averageBlend > 0.6)
                return "good_blend";
            else if (averageBlend > 0.4)
                return "moderate_blend";
            else
                return "poor_blend";
        }
    };

    //==============================================================================
    /** Register field for spatial orchestration */
    struct RegisterField
    {
        double frequencyStart = 20.0;       // Low frequency boundary (Hz)
        double frequencyEnd = 20000.0;      // High frequency boundary (Hz)
        juce::String registerName;           // "sub_bass", "bass", "baritone", "tenor", "alto", "soprano", "extreme_soprano"
        juce::Array<Instrument> instruments;  // Instruments primarily in this register
        juce::StringArray roles;             // Roles this register serves
        double saturationLevel = 0.5;        // How saturated/occupied this register is
        juce::String interactionType;         // "supportive", "soloistic", "harmonic", "rhythmic"
        double weight = 1.0;                // Importance weight in orchestral balance

        /** Check if frequency is in this register */
        bool containsFrequency(double frequency) const
        {
            return frequency >= frequencyStart && frequency <= frequencyEnd;
        }

        /** Add instrument to register based on its range */
        void addInstrumentIfInRange(const Instrument& instrument)
        {
            double instrumentCenter = (instrument.registerInfo.lowestNote + instrument.registerInfo.highestNote) / 2;
            double frequency = 440.0 * std::pow(2.0, (instrumentCenter - 69.0) / 12.0); // Convert MIDI to Hz

            if (containsFrequency(frequency))
            {
                instruments.add(instrument);
            }
        }

        /** Calculate register saturation */
        void calculateSaturation()
        {
            saturationLevel = static_cast<double>(instruments.size()) / 5.0; // Normalized to 5 instruments
            saturationLevel = juce::jlimit(0.0, 1.0, saturationLevel);
        }

        /** Convert to JSON */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("frequencyStart", frequencyStart);
            json->setProperty("frequencyEnd", frequencyEnd);
            json->setProperty("registerName", registerName);
            json->setProperty("saturationLevel", saturationLevel);
            json->setProperty("interactionType", interactionType);
            json->setProperty("weight", weight);

            auto instrumentsArray = new juce::Array<juce::var>();
            for (const auto& instrument : instruments)
                instrumentsArray->add(instrument.toJson());
            json->setProperty("instruments", juce::var(instrumentsArray));

            auto rolesArray = new juce::Array<juce::var>();
            for (const auto& role : roles)
                rolesArray->add(juce::var(role));
            json->setProperty("roles", juce::var(rolesArray));

            return juce::var(json);
        }
    };

    //==============================================================================
    /**
        Advanced Orchestration API implementing Schillinger's mathematical
        approach to instrument combination, texture analysis, and register
        field control for professional composition and arrangement.
    */
    class OrchestrationAPI
    {
    public:
        //==============================================================================
        using AsyncCallback = std::function<void(juce::Result, juce::var)>;

        //==============================================================================
        /** Constructor */
        OrchestrationAPI();

        /** Destructor */
        ~OrchestrationAPI();

        //==============================================================================
        // Instrument Database Management

        /** Load instrument database */
        void loadInstrumentDatabase(AsyncCallback<bool> callback);

        /** Synchronous version of instrument database loading */
        juce::Result loadInstrumentDatabaseSync();

        /** Get instrument by ID */
        Instrument getInstrumentById(int id) const;

        /** Search instruments by criteria */
        juce::Array<Instrument> searchInstruments(const juce::String& nameFilter = "",
                                                     InstrumentFamily familyFilter = InstrumentFamily::Strings,
                                                     const juce::String& techniqueFilter = "") const;

        /** Get instruments by family */
        juce::Array<Instrument> getInstrumentsByFamily(InstrumentFamily family) const;

        /** Add custom instrument to database */
        bool addInstrument(const Instrument& instrument);

        //==============================================================================
        // Texture Analysis

        /** Analyze orchestral texture */
        void analyzeTexture(const juce::Array<Instrument>& ensemble,
                           AsyncCallback<TextureAnalysis> callback);

        /** Synchronous version of texture analysis */
        juce::Result analyzeTextureSync(const juce::Array<Instrument>& ensemble,
                                        TextureAnalysis& analysis);

        /** Suggest texture adjustments */
        juce::var suggestTextureImprovements(const TextureAnalysis& currentTexture,
                                                 const juce::String& targetTexture);

        /** Generate texture from Schillinger parameters */
        juce::Array<Instrument> generateTextureFromParameters(const juce::var& schillingerParams);

        //==============================================================================
        // Register Field Control

        /** Create register field from ensemble */
        void createRegisterField(const juce::Array<Instrument>& ensemble,
                               AsyncCallback<RegisterField> callback);

        /** Synchronous version of register field creation */
        juce::Result createRegisterFieldSync(const juce::Array<Instrument>& ensemble,
                                               RegisterField& field);

        /** Analyze register balance */
        juce::var analyzeRegisterBalance(const juce::Array<RegisterField>& fields);

        /** Optimize register distribution */
        juce::Array<Instrument> optimizeRegisterDistribution(const juce::Array<Instrument>& availableInstruments,
                                                               int targetDensity);

        /** Check for register conflicts */
        juce::var checkRegisterConflicts(const juce::Array<Instrument>& instruments);

        //==============================================================================
        // Instrumentation Suggestions

        /** Suggest instrumentation for musical style */
        juce::Array<Instrument> suggestInstrumentation(const juce::String& musicalStyle,
                                                          const juce::String& ensembleSize,
                                                          const juce::String& period = "classical");

        /** Suggest solo instrument for melody */
        Instrument suggestSoloInstrument(const ChordProgression& harmony,
                                         const juce::String& style,
                                         double targetTension = 0.5);

        /** Suggest accompanying instruments */
        juce::Array<Instrument> suggestAccompaniment(const Instrument& soloInstrument,
                                                       const ChordProgression& harmony);

        //==============================================================================
        // Orchestration Techniques

        /** Apply Schillinger orchestration techniques */
        juce::var applySchillingerTechnique(const juce::Array<Instrument>& ensemble,
                                                 const juce::String& technique);

        /** Generate orchestration plan */
        juce::var generateOrchestrationPlan(const juce::String& title,
                                                  const juce::String& duration,
                                                  const juce::String& mood,
                                                  const juce::String& style);

        /** Create instrumental contrast */
        juce::Array<Instrument> createInstrumentalContrast(const juce::Array<Instrument>& baseEnsemble,
                                                              const juce::String& contrastType);

        //==============================================================================
        // Blend and Balance Analysis

        /** Calculate blend quality between instruments */
        double calculateBlendQuality(const Instrument& instrument1,
                                         const Instrument& instrument2);

        /** Analyze orchestral balance */
        juce::var analyzeBalance(const juce::Array<Instrument>& ensemble);

        /** Suggest balance adjustments */
        juce::var suggestBalanceImprovements(const juce::Array<Instrument>& ensemble,
                                                  const juce::var& targetBalance);

        //==============================================================================
        // Utility Methods

        /** Convert frequency to MIDI note */
        static int frequencyToMidiNote(double frequency);

        /** Convert MIDI note to frequency */
        static double midiNoteToFrequency(int midiNote);

        /** Get instrument family name */
        static juce::String getFamilyName(InstrumentFamily family);

        /** Validate instrument data */
        static juce::Result validateInstrument(const Instrument& instrument);

        /** Calculate orchestral density */
        static double calculateOrchestralDensity(const juce::Array<Instrument>& ensemble);

    private:
        //==============================================================================
        struct Impl;
        std::unique_ptr<Impl> pimpl;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(OrchestrationAPI)
    };

} // namespace Schillinger