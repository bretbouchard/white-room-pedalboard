/*
  ==============================================================================

    OrchestrationAPI.cpp
    Created: 2 Dec 2025
    Author:  Schillinger System

    Implementation of advanced orchestration system with instrument database,
    texture analysis, and register field control using Schillinger's
    mathematical approach to orchestration.

  ==============================================================================*/

#include "../include/OrchestrationAPI.h"
#include <juce_core/juce_core.h>
#include <algorithm>
#include <cmath>

namespace Schillinger
{
    //==============================================================================
    // OrchestrationAPI::Impl
    struct OrchestrationAPI::Impl
    {
        juce::Array<Instrument> instrumentDatabase;
        bool databaseLoaded = false;

        Impl()
        {
            initializeDefaultDatabase();
        }

        /** Initialize with comprehensive instrument database */
        void initializeDefaultDatabase()
        {
            instrumentDatabase.clear();

            // String section instruments
            addInstrument(createInstrument(1, "Violin I", InstrumentFamily::Strings,
                                       "First Violins", "bright", "solo_capable ensemble_capable melodic"));
            addInstrument(createInstrument(2, "Violin II", InstrumentFamily::Strings,
                                       "Second Violins", "bright", "ensemble_capable melodic"));
            addInstrument(createInstrument(3, "Viola", InstrumentFamily::Strings,
                                       "Viola Section", "warm", "melodic harmonic"));
            addInstrument(createInstrument(4, "Cello", InstrumentFamily::Strings,
                                       "Cello Section", "warm", "solo_capable melodic harmonic"));
            addInstrument(createInstrument(5, "Double Bass", InstrumentFamily::Strings,
                                       "Double Basses", "dark", "harmonic foundation"));

            // Woodwind instruments
            addInstrument(createInstrument(6, "Flute", InstrumentFamily::Woodwinds,
                                       "Flutes", "bright", "solo_capable melodic agile"));
            addInstrument(createInstrument(7, "Oboe", InstrumentFamily::Woodwinds,
                                       "Oboes", "penetrating", "solo_capable melodic expressive"));
            addInstrument(createInstrument(8, "Clarinet", InstrumentFamily::Woodwinds,
                                       "Clarinets in B♭", "versatile", "solo_capable melodic agile"));
            addInstrument(createInstrument(9, "Bassoon", InstrumentFamily::Woodwinds,
                                       "Bassoons", "warm", "harmonic foundation"));

            // Brass instruments
            addInstrument(createInstrument(10, "Trumpet", InstrumentFamily::Brass,
                                       "Trumpets in C", "brilliant", "solo_capable powerful"));
            addInstrument(createInstrument(11, "Horn", InstrumentFamily::Brass,
                                       "French Horns", "noble", "solo_capable harmonic expressive"));
            addInstrument(createInstrument(12, "Trombone", InstrumentFamily::Brass,
                                       "Trombones", "bright", "harmonic powerful"));
            addInstrument(createInstrument(13, "Tuba", InstrumentFamily::Brass,
                                       "Tubas", "dark", "foundation powerful"));

            // Keyboard instruments
            addInstrument(createInstrument(14, "Piano", InstrumentFamily::Keyboard,
                                       "Grand Piano", "versatile", "solo_capable harmonic melodic"));
            addInstrument(createInstrument(15, "Harpsichord", InstrumentFamily::Keyboard,
                                       "Harpsichord", "bright", "baroque melodic"));

            // Percussion
            addInstrument(createInstrument(16, "Timpani", InstrumentFamily::Percussion,
                                       "Timpani", "dramatic", "harmonic foundation"));
            addInstrument(createInstrument(17, "Snare Drum", InstrumentFamily::Percussion,
                                       "Snare Drum", "sharp", "rhythmic foundation"));

            databaseLoaded = true;
        }

        /** Create instrument with basic properties */
        Instrument createInstrument(int id, const juce::String& name, InstrumentFamily family,
                                   const juce::String& section, const juce::String& character,
                                   const juce::String& roles)
        {
            Instrument instrument;
            instrument.id = id;
            instrument.name = name;
            instrument.family = family;
            instrument.section = section;
            instrument.soundCharacter = character;
            instrument.commonRoles.addTokens(roles, " ");

            // Set up dynamic range based on instrument type
            setupInstrumentDynamicRange(instrument);

            // Set up register information
            setupInstrumentRegisterInfo(instrument, family);

            // Set up available techniques
            setupInstrumentTechniques(instrument, family);

            // Calculate other properties
            instrument.blendFactor = calculateBlendFactor(family);
            instrument.presence = calculatePresence(family);
            instrument.isSoloCapable = isGenerallySoloCapable(family);
            instrument.isEnsembleCapable = true;

            return instrument;
        }

        /** Setup dynamic range for instrument family */
        void setupInstrumentDynamicRange(Instrument& instrument, InstrumentFamily family)
        {
            switch (family)
            {
                case InstrumentFamily::Strings:
                    instrument.dynamicRange.minDynamic = 0.1;
                    instrument.dynamicRange.maxDynamic = 0.9;
                    instrument.dynamicRange.averageDynamic = 0.5;
                    break;

                case InstrumentFamily::Woodwinds:
                    instrument.dynamicRange.minDynamic = 0.15;
                    instrument.dynamicRange.maxDynamic = 0.8;
                    instrument.dynamicRange.averageDynamic = 0.45;
                    break;

                case InstrumentFamily::Brass:
                    instrument.dynamicRange.minDynamic = 0.2;
                    instrument.dynamicRange.maxDynamic = 0.95;
                    instrument.dynamicRange.averageDynamic = 0.6;
                    break;

                case InstrumentFamily::Percussion:
                    instrument.dynamicRange.minDynamic = 0.3;
                    instrument.dynamicRange.maxDynamic = 1.0;
                    instrument.dynamicRange.averageDynamic = 0.7;
                    break;

                case InstrumentFamily::Keyboard:
                    instrument.dynamicRange.minDynamic = 0.1;
                    instrument.dynamicRange.maxDynamic = 0.85;
                    instrument.dynamicRange.averageDynamic = 0.4;
                    break;

                default:
                    instrument.dynamicRange.minDynamic = 0.2;
                    instrument.dynamicRange.maxDynamic = 0.8;
                    instrument.dynamicRange.averageDynamic = 0.5;
                    break;
            }

            instrument.dynamicRange.calculateDynamicRange();
        }

        /** Setup register information for instrument family */
        void setupInstrumentRegisterInfo(Instrument& instrument, InstrumentFamily family)
        {
            switch (family)
            {
                case InstrumentFamily::Strings:
                    if (instrument.name.contains("Violin"))
                    {
                        instrument.registerInfo.lowestNote = 55;  // G3
                        instrument.registerInfo.highestNote = 96; // C7
                        instrument.registerInfo.comfortableLow = 60; // C4
                        instrument.registerInfo.comfortableHigh = 84; // C6
                        instrument.registerInfo.optimalRange = 72; // C5
                        instrument.registerInfo.registerType = "soprano";
                        instrument.registerInfo.clef = "treble";
                    }
                    else if (instrument.name.contains("Viola"))
                    {
                        instrument.registerInfo.lowestNote = 48; // C3
                        instrument.registerInfo.highestNote = 84; // C6
                        instrument.registerInfo.comfortableLow = 55; // G3
                        instrument.registerInfo.comfortableHigh = 76; // E5
                        instrument.registerInfo.optimalRange = 65; // F4
                        instrument.registerInfo.registerType = "alto";
                        instrument.registerInfo.clef = "alto";
                    }
                    else if (instrument.name.contains("Cello"))
                    {
                        instrument.registerInfo.lowestNote = 36; // C2
                        instrument.registerInfo.highestNote = 77; // G5
                        instrument.registerInfo.comfortableLow = 48; // C3
                        instrument.registerInfo.comfortableHigh = 67; // G4
                        instrument.registerInfo.optimalRange = 55; // G3
                        instrument.registerInfo.registerType = "tenor";
                        instrument.registerInfo.clef = "bass";
                    }
                    else if (instrument.name.contains("Bass"))
                    {
                        instrument.registerInfo.lowestNote = 28; // E1
                        instrument.registerInfo.highestNote = 60; // C4
                        instrument.registerInfo.comfortableLow = 36; // C2
                        instrument.registerInfo.comfortableHigh = 52; // E3
                        instrument.registerInfo.optimalRange = 43; // G2
                        instrument.registerInfo.registerType = "bass";
                        instrument.registerInfo.clef = "bass";
                    }
                    break;

                case InstrumentFamily::Woodwinds:
                    if (instrument.name.contains("Flute"))
                    {
                        instrument.registerInfo.lowestNote = 60; // C4
                        instrument.registerInfo.highestNote = 96; // C7
                        instrument.registerInfo.comfortableLow = 72; // C5
                        instrument.registerInfo.comfortableHigh = 88; // E6
                        instrument.registerInfo.optimalRange = 81; // A5
                        instrument.registerInfo.registerType = "soprano";
                        instrument.registerInfo.clef = "treble";
                    }
                    else if (instrument.name.contains("Oboe"))
                    {
                        instrument.registerInfo.lowestNote = 60; // C4
                        instrument.registerInfo.highestNote = 87; // B6
                        instrument.registerInfo.comfortableLow = 67; // G4
                        instrument.registerInfo.comfortableHigh = 79; // G5
                        instrument.registerInfo.optimalRange = 72; // C5
                        instrument.registerInfo.registerType = "soprano";
                        instrument.registerInfo.clef = "treble";
                    }
                    else if (instrument.name.contains("Clarinet"))
                    {
                        instrument.registerInfo.lowestNote = 52; // E3
                        instrument.registerInfo.highestNote = 88; // E6
                        instrument.registerInfo.comfortableLow = 60; // C4
                        instrument.registerInfo.comfortableHigh = 84; // C6
                        instrument.registerInfo.optimalRange = 72; // C5
                        instrument.registerInfo.registerType = "soprano/alto";
                        instrument.registerInfo.clef = "treble";
                        instrument.registerInfo.isTransposing = true;
                        instrument.registerInfo.transposeInterval = -2; // B♭ clarinet
                    }
                    else if (instrument.name.contains("Bassoon"))
                    {
                        instrument.registerInfo.lowestNote = 34; // B1
                        instrument.registerInfo.highestNote = 72; // C5
                        instrument.registerInfo.comfortableLow = 43; // G2
                        instrument.registerInfo.comfortableHigh = 60; // C4
                        instrument.registerInfo.optimalRange = 52; // E3
                        instrument.registerInfo.registerType = "bass";
                        instrument.registerInfo.clef = "bass";
                    }
                    break;

                case InstrumentFamily::Brass:
                    if (instrument.name.contains("Trumpet"))
                    {
                        instrument.registerInfo.lowestNote = 58; // A♭3
                        instrument.registerInfo.highestNote = 98; // D7
                        instrument.registerInfo.comfortableLow = 72; // C5
                        instrument.registerInfo.comfortableHigh = 87; // B6
                        instrument.registerInfo.optimalRange = 78; // G♯5
                        instrument.registerInfo.registerType = "soprano/alto";
                        instrument.registerInfo.clef = "treble";
                    }
                    else if (instrument.name.contains("Horn"))
                    {
                        instrument.registerInfo.lowestNote = 34; // B1
                        instrument.registerInfo.highestNote = 81; // A5
                        instrument.registerInfo.comfortableLow = 49; // C3
                        instrument.registerInfo.comfortableHigh = 72; // C5
                        instrument.registerInfo.optimalRange = 60; // C4
                        instrument.registerInfo.registerType = "alto/tenor";
                        instrument.registerInfo.clef = "treble";
                        instrument.registerInfo.isTransposing = true;
                        instrument.registerInfo.transposeInterval = -7; // F horn
                    }
                    else if (instrument.name.contains("Trombone"))
                    {
                        instrument.registerInfo.lowestNote = 40; // E2
                        instrument.registerInfo.highestNote = 84; // C6
                        instrument.registerInfo.comfortableLow = 52; // E3
                        instrument.registerInfo.comfortableHigh = 72; // C5
                        instrument.registerInfo.optimalRange = 62; // D4
                        instrument.registerInfo.registerType = "tenor/bass";
                        instrument.registerInfo.clef = "bass";
                    }
                    else if (instrument.name.contains("Tuba"))
                    {
                        instrument.registerInfo.lowestNote = 22; // A0
                        instrument.registerInfo.highestNote = 58; // A♭3
                        instrument.registerInfo.comfortableLow = 28; // E1
                        instrument.registerInfo.comfortableHigh = 46; // A2
                        instrument.registerInfo.optimalRange = 34; // B1
                        instrument.registerInfo.registerType = "bass";
                        instrument.registerInfo.clef = "bass";
                    }
                    break;

                case InstrumentFamily::Keyboard:
                    if (instrument.name.contains("Piano"))
                    {
                        instrument.registerInfo.lowestNote = 21; // A0
                        instrument.registerInfo.highestNote = 108; // C8
                        instrument.registerInfo.comfortableLow = 36; // C2
                        instrument.registerInfo.comfortableHigh = 96; // C7
                        instrument.registerInfo.optimalRange = 60; // C4
                        instrument.registerInfo.registerType = "full_range";
                        instrument.registerInfo.clef = "grand_staff";
                    }
                    else if (instrument.name.contains("Harpsichord"))
                    {
                        instrument.registerInfo.lowestNote = 36; // C2
                        instrument.registerInfo.highestNote = 84; // C6
                        instrument.registerInfo.comfortableLow = 48; // C3
                        instrument.registerInfo.comfortableHigh = 72; // C5
                        instrument.registerInfo.optimalRange = 60; // C4
                        instrument.registerInfo.registerType = "baroque";
                        instrument.registerInfo.clef = "treble";
                    }
                    break;

                default:
                    // Default settings for other instruments
                    instrument.registerInfo.lowestNote = 48; // C3
                    instrument.registerInfo.highestNote = 72; // C5
                    instrument.registerInfo.comfortableLow = 55; // G3
                    instrument.registerInfo.comfortableHigh = 65; // F4
                    instrument.registerInfo.optimalRange = 60; // C4
                    instrument.registerInfo.registerType = "standard";
                    instrument.registerInfo.clef = "treble";
                    break;
            }
        }

        /** Setup playing techniques for instrument family */
        void setupInstrumentTechniques(Instrument& instrument, InstrumentFamily family)
        {
            switch (family)
            {
                case InstrumentFamily::Strings:
                    instrument.availableTechniques.addArray({
                        PlayingTechnique::Legato, PlayingTechnique::Staccato,
                        PlayingTechnique::Pizzicato, PlayingTechnique::Arco,
                        PlayingTechnique::Tremolo, PlayingTechnique::Vibrato,
                        PlayingTechnique::Harmonics, PlayingTechnique::Glissando,
                        PlayingTechnique::SulTasto, PlayingTechnique::SulPonticello
                    });
                    break;

                case InstrumentFamily::Woodwinds:
                    instrument.availableTechniques.addArray({
                        PlayingTechnique::Legato, PlayingTechnique::Staccato,
                        PlayingTechnique::Tremolo, PlayingTechnique::Vibrato,
                        PlayingTechnique::Trill, PlayingTechnique::FlutterTongue,
                        PlayingTechnique::Harmonics, PlayingTechnique::Multiphonics,
                        PlayingTechnique::Glissando
                    });
                    break;

                case InstrumentFamily::Brass:
                    instrument.availableTechniques.addArray({
                        PlayingTechnique::Legato, PlayingTechnique::Staccato,
                        PlayingTechnique::Tremolo, PlayingTechnique::Vibrato,
                        PlayingTechnique::Trill, PlayingTechnique::Glissando,
                        PlayingTechnique::Mute, PlayingTechnique::Portamento
                    });
                    break;

                case InstrumentFamily::Keyboard:
                    instrument.availableTechniques.addArray({
                        PlayingTechnique::Legato, PlayingTechnique::Staccato,
                        PlayingTechnique::Arpeggio, PlayingTechnique::Glissando,
                        PlayingTechnique::Tremolo
                    });
                    break;

                case InstrumentFamily::Percussion:
                    instrument.availableTechniques.addArray({
                        PlayingTechnique::Staccato, PlayingTechnique::Tremolo,
                        PlayingTechnique::Roll
                    });
                    break;

                default:
                    instrument.availableTechniques.addArray({
                        PlayingTechnique::Legato, PlayingTechnique::Staccato
                    });
                    break;
            }
        }

        /** Calculate blend factor for instrument family */
        double calculateBlendFactor(InstrumentFamily family)
        {
            switch (family)
            {
                case InstrumentFamily::Strings: return 0.8;    // Excellent blend capability
                case InstrumentFamily::Woodwinds: return 0.7;  // Good blend
                case InstrumentFamily::Keyboard: return 0.6; // Moderate blend
                case InstrumentFamily::Brass: return 0.5;     // Moderate blend
                case InstrumentFamily::Percussion: return 0.4;   // Limited melodic blend
                default: return 0.5;
            }
        }

        /** Calculate presence factor for instrument family */
        double calculatePresence(InstrumentFamily family)
        {
            switch (family)
            {
                case InstrumentFamily::Brass: return 1.0;       // High presence
                case InstrumentFamily::Percussion: return 0.9; // High presence
                case InstrumentFamily::Woodwinds: return 0.7; // Moderate presence
                case InstrumentFamily::Strings: return 0.8;    // Good presence
                case InstrumentFamily::Keyboard: return 0.7;   // Variable presence
                default: return 0.6;
            }
        }

        /** Check if instrument family is generally solo-capable */
        bool isGenerallySoloCapable(InstrumentFamily family)
        {
            switch (family)
            {
                case InstrumentFamily::Strings:
                case InstrumentFamily::Woodwinds:
                case InstrumentFamily::Brass:
                case InstrumentFamily::Keyboard:
                    return true;
                default:
                    return false;
            }
        }

        /** Add instrument to database */
        void addInstrument(const Instrument& instrument)
        {
            instrumentDatabase.add(instrument);
        }

        /** Calculate orchestral density */
        double calculateDensity(const juce::Array<Instrument>& ensemble)
        {
            if (ensemble.isEmpty())
                return 0.0;

            double totalWeight = 0.0;
            double maxDensity = 5.0;

            for (const auto& instrument : ensemble)
            {
                switch (instrument.family)
                {
                    case InstrumentFamily::Strings: totalWeight += 1.5; break;
                    case InstrumentFamily::Woodwinds: totalWeight += 1.2; break;
                    case InstrumentFamily::Brass: totalWeight += 1.3; break;
                    case InstrumentFamily::Keyboard: totalWeight += 2.0; break;
                    case InstrumentFamily::Percussion: totalWeight += 0.8; break;
                    default: totalWeight += 1.0; break;
                }
            }

            return juce::jlimit(0.0, maxDensity, totalWeight / ensemble.size());
        }

        /** Calculate overall texture complexity */
        double calculateTextureComplexity(const juce::Array<Instrument>& ensemble)
        {
            if (ensemble.isEmpty())
                return 0.0;

            double complexity = 0.0;
            double maxComplexity = 5.0;

            for (const auto& instrument : ensemble)
            {
                // Base complexity by family
                switch (instrument.family)
                {
                    case InstrumentFamily::Strings:
                        complexity += 1.2;
                        if (instrument.availableTechniques.size() > 6)
                            complexity += 0.5; // Bonus for extended techniques
                        break;
                    case InstrumentFamily::Woodwinds:
                        complexity += 1.0;
                        if (instrument.availableTechniques.size() > 4)
                            complexity += 0.3;
                        break;
                    case InstrumentFamily::Brass:
                        complexity += 0.9;
                        break;
                    case InstrumentFamily::Keyboard:
                        complexity += 1.5;
                        break;
                    case InstrumentFamily::Percussion:
                        complexity += 0.6;
                        break;
                    default:
                        complexity += 0.7;
                        break;
                }

                // Add dynamic range complexity
                complexity += instrument.dynamicRange.dynamicRange * 0.3;
            }

            return juce::jlimit(0.0, maxComplexity, complexity / ensemble.size());
        }
    };

    //==============================================================================
    // OrchestrationAPI implementation
    OrchestrationAPI::OrchestrationAPI()
        : pimpl(std::make_unique<Impl>())
    {
    }

    OrchestrationAPI::~OrchestrationAPI() = default;

    //==============================================================================
    void OrchestrationAPI::loadInstrumentDatabase(AsyncCallback<bool> callback)
    {
        bool success = loadInstrumentDatabaseSync();
        callback(juce::Result::ok(), success);
    }

    juce::Result OrchestrationAPI::loadInstrumentDatabaseSync()
    {
        // Database is already loaded in constructor
        return juce::Result::ok();
    }

    Instrument OrchestrationAPI::getInstrumentById(int id) const
    {
        for (const auto& instrument : pimpl->instrumentDatabase)
        {
            if (instrument.id == id)
                return instrument;
        }
        return Instrument{}; // Return empty instrument if not found
    }

    juce::Array<Instrument> OrchestrationAPI::searchInstruments(const juce::String& nameFilter,
                                                                 InstrumentFamily familyFilter,
                                                                 const juce::String& techniqueFilter) const
    {
        juce::Array<Instrument> results;

        for (const auto& instrument : pimpl->instrumentDatabase)
        {
            bool matches = true;

            // Filter by name
            if (!nameFilter.isEmpty() && !instrument.name.containsIgnoreCase(nameFilter))
                matches = false;

            // Filter by family
            if (familyFilter != InstrumentFamily::Strings && instrument.family != familyFilter)
                matches = false;

            // Filter by technique
            if (!techniqueFilter.isEmpty())
            {
                bool hasTechnique = false;
                for (auto technique : instrument.availableTechniques)
                {
                    if (getTechniqueName(technique).containsIgnoreCase(techniqueFilter))
                    {
                        hasTechnique = true;
                        break;
                    }
                }
                if (!hasTechnique)
                    matches = false;
            }

            if (matches)
                results.add(instrument);
        }

        return results;
    }

    juce::Array<Instrument> OrchestrationAPI::getInstrumentsByFamily(InstrumentFamily family) const
    {
        juce::Array<Instrument> results;
        for (const const auto& instrument : pimpl->instrumentDatabase)
        {
            if (instrument.family == family)
                results.add(instrument);
        }
        return results;
    }

    bool OrchestrationAPI::addInstrument(const Instrument& instrument)
    {
        auto validation = validateInstrument(instrument);
        if (!validation.wasOk())
            return false;

        pimpl->addInstrument(instrument);
        return true;
    }

    //==============================================================================
    void OrchestrationAPI::analyzeTexture(const juce::Array<Instrument>& ensemble,
                                             AsyncCallback<TextureAnalysis> callback)
    {
        TextureAnalysis analysis;
        auto result = analyzeTextureSync(ensemble, analysis);
        callback(result, analysis);
    }

    juce::Result OrchestrationAPI::analyzeTextureSync(const juce::Array<Instrument>& ensemble,
                                                     TextureAnalysis& analysis)
    {
        if (ensemble.isEmpty())
            return juce::Result::fail("Ensemble cannot be empty");

        analysis.calculateMetrics(ensemble);
        analysis.density = pimpl->calculateDensity(ensemble);
        analysis.complexity = pimpl->calculateTextureComplexity(ensemble);

        // Determine texture type based on ensemble characteristics
        if (ensemble.size() == 1)
        {
            analysis.textureType = "monophonic";
        }
        else if (ensemble.size() == 2)
        {
            analysis.textureType = "heterophonic";
        }
        else if (ensemble.size() <= 4)
        {
            // Check if instruments have similar rhythmic patterns
            analysis.textureType = "polyphonic";
        }
        else
        {
            analysis.textureType = "complex_polyphonic";
        }

        // Calculate transparency based on instrument density
        if (analysis.density > 3.0)
            analysis.transparency = 0.3; // Dense texture
        else if (analysis.density > 1.5)
            analysis.transparency = 0.6; // Moderate texture
        else
            analysis.transparency = 0.9; // Sparse texture

        return juce::Result::ok();
    }

    juce::var OrchestrationAPI::suggestTextureImprovements(const TextureAnalysis& currentTexture,
                                                              const juce::String& targetTexture)
    {
        auto suggestions = juce::DynamicObject();
        suggestions.setProperty("currentTexture", currentTexture.textureType);
        suggestions.setProperty("targetTexture", targetTexture);

        juce::Array<juce::var> improvements;

        if (targetTexture == "more_transparent" && currentTexture.transparency < 0.7)
        {
            auto improvement = juce::DynamicObject();
            improvement.setProperty("suggestion", "Reduce ensemble density or use sparser scoring");
            improvement.setProperty("method", "reduce_density");
            improvements.add(juce::var(&improvement));
        }
        else if (targetTexture == "more_dense" && currentTexture.transparency > 0.5)
        {
            auto improvement = juce::DynamicObject();
            improvement.setProperty("suggestion", "Add more instruments or use denser rhythmic patterns");
            improvement.setProperty("method", "increase_density");
            improvements.add(juce::var(&improvement));
        }

        if (targetTexture == "warmer" && currentTexture.balance == "bright_treble")
        {
            auto improvement = juce::DynamicObject();
            improvement.setProperty("suggestion", "Add lower register instruments like cellos or bassoons");
            improvement.setProperty("method", "add_low_register");
            improvements.add(juce::var(&improvement));
        }

        suggestions.setProperty("improvements", juce::var(improvements));
        return juce::var(&suggestions);
    }

    juce::Array<Instrument> OrchestrationAPI::generateTextureFromParameters(const juce::var& schillingerParams)
    {
        juce::Array<Instrument> texture;

        // Extract Schillinger parameters (simplified example)
        double density = schillingerParams.getProperty("density", 1.0);
        double complexity = schillingerParams.getProperty("complexity", 1.0);
        juce::String balance = schillingerParams.getProperty("balance", "balanced");

        int targetInstrumentCount = static_cast<int>(density * 8.0); // Max 8 instruments for density

        // Select instruments based on desired characteristics
        if (balance == "heavy_bass")
        {
            texture.add(getInstrumentById(5)); // Double Bass
            texture.add(getInstrumentById(9)); // Bassoon
            texture.add(getInstrumentById(13)); // Tuba
        }
        else if (balance == "bright_treble")
        {
            texture.add(getInstrumentById(1)); // Violin I
            texture.add(getInstrumentById(6)); // Flute
            texture.add(getInstrumentById(10)); // Trumpet
        }
        else // balanced
        {
            texture.add(getInstrumentById(1)); // Violin
            texture.add(getInstrumentById(8)); // Cello
            texture.add(getInstrumentById(6)); // Flute
            texture.add(getInstrumentById(10)); // Trumpet
        }

        // Add instruments until reaching target count
        while (texture.size() < targetInstrumentCount)
        {
            texture.add(getInstrumentById((texture.size() % pimpl->instrumentDatabase.size()) + 1));
        }

        return texture;
    }

    //==============================================================================
    void OrchestrationAPI::createRegisterField(const juce::Array<Instrument>& ensemble,
                                                AsyncCallback<RegisterField> callback)
    {
        RegisterField field;
        auto result = createRegisterFieldSync(ensemble, field);
        callback(result, field);
    }

    juce::Result OrchestrationAPI::createRegisterFieldSync(const juce::Array<Instrument>& ensemble,
                                                     RegisterField& field)
    {
        field.instruments.clear();

        // Create register fields
        juce::Array<RegisterField> allFields;

        // Sub-bass (20-60 Hz)
        RegisterField subBass;
        subBass.frequencyStart = 20.0;
        subBass.frequencyEnd = 60.0;
        subBass.registerName = "sub_bass";
        subBass.weight = 2.0;
        subBass.interactionType = "foundation";

        // Bass (60-250 Hz)
        RegisterField bass;
        bass.frequencyStart = 60.0;
        bass.frequencyEnd = 250.0;
        bass.registerName = "bass";
        bass.weight = 2.5;
        bass.interactionType = "supportive";

        // Baritone (250-500 Hz)
        RegisterField baritone;
        baritone.frequencyStart = 250.0;
        baritone.frequencyEnd = 500.0;
        baritone.registerName = "baritone";
        baritone.weight = 2.0;
        baritone.interactionType = "supportive";

        // Tenor (500-2000 Hz)
        RegisterField tenor;
        tenor.frequencyStart = 500.0;
        tenor.frequencyEnd = 2000.0;
        tenor.registerName = "tenor";
        tenor.weight = 1.5;
        tenor.interactionType = "melodic";

        // Alto (2000-4000 Hz)
        RegisterField alto;
        alto.frequencyStart = 2000.0;
        alto.frequencyEnd = 4000.0;
        alto.registerName = "alto";
        alto.weight = 1.2;
        alto.interactionType = "melodic";

        // Soprano (4000-8000 Hz)
        RegisterField soprano;
        soprano.frequencyStart = 4000.0;
        soprano.frequencyEnd = 8000.0;
        soprano.registerName = "soprano";
        soprano.weight = 1.0;
        soprano.interactionType = "soloistic";

        // Extreme Soprano (8000-20000 Hz)
        RegisterField extremeSoprano;
        extremeSoprano.frequencyStart = 8000.0;
        extremeSoprano.frequencyEnd = 20000.0;
        extremeSoprano.registerName = "extreme_soprano";
        extremeSoprano.weight = 0.5;
        extremeSoprano.interactionType = "color";

        allFields.add(subBass);
        allFields.add(bass);
        allFields.add(baritone);
        allFields.add(tenor);
        allFields.add(alto);
        allFields.add(soprano);
        allFields.add(extremeSoprano);

        // Distribute instruments among registers
        for (const auto& instrument : ensemble)
        {
            for (auto& registerField : allFields)
            {
                registerField.addInstrumentIfInRange(instrument);
            }
        }

        // Calculate saturation and find best matching field
        double bestFitScore = -1.0;
        for (const auto& regField : allFields)
        {
            regField.calculateSaturation();
            if (regField.instruments.size() > 0)
            {
                double score = regField.saturationLevel * regField.weight;
                if (score > bestFitScore)
                {
                    bestFitScore = score;
                    field = regField;
                }
            }
        }

        return juce::Result::ok();
    }

    juce::var OrchestrationAPI::analyzeRegisterBalance(const juce::Array<RegisterField>& fields)
    {
        auto analysis = juce::DynamicObject();
        analysis.setProperty("fieldCount", fields.size());

        juce::Array<juce::var> fieldAnalyses;
        double totalWeight = 0.0;
        double occupiedWeight = 0.0;

        for (const auto& field : fields)
        {
            auto fieldAnalysis = juce::DynamicObject();
            fieldAnalysis.setProperty("registerName", field.registerName);
            fieldAnalysis.setProperty("instrumentCount", field.instruments.size());
            fieldAnalysis.setProperty("saturationLevel", field.saturationLevel);
            fieldAnalysis.setProperty("weight", field.weight);
            fieldAnalysis.setProperty("interactionType", field.interactionType);

            double weightContribution = field.saturationLevel * field.weight;
            totalWeight += field.weight;
            occupiedWeight += weightContribution;

            fieldAnalyses.add(juce::var(&fieldAnalysis));
        }

        analysis.setProperty("fieldAnalyses", juce::var(fieldAnalyses));
        analysis.setProperty("totalWeight", totalWeight);
        analysis.setProperty("occupiedWeight", occupiedWeight);
        analysis.setProperty("balanceRatio", totalWeight > 0 ? occupiedWeight / totalWeight : 0.0);

        if (analysis.getProperty("balanceRatio") > 0.8)
            analysis.setProperty("balanceAssessment", "well_balanced");
        else if (analysis.getProperty("balanceRatio") > 0.6)
            analysis.setProperty("balanceAssessment", "moderately_balanced");
        else
            analysis.setProperty("balanceAssessment", "poorly_balanced");

        return juce::var(&analysis);
    }

    juce::Array<Instrument> OrchestrationAPI::optimizeRegisterDistribution(const juce::Array<Instrument>& availableInstruments,
                                                                      int targetDensity)
    {
        juce::Array<Instrument> optimized;

        // Sort instruments by register (using their optimal range)
        juce::Array<Instrument> sorted = availableInstruments;
        sorted.sort([](const Instrument& a, const Instrument& b)
        {
            return a.registerInfo.optimalRange < b.registerInfo.optimalRange;
        });

        // Target instruments per register based on density
        int instrumentsPerRegister = juce::jmax(1, targetDensity);

        // Distribute instruments across registers
        int currentRegister = 0;
        int instrumentsInCurrentRegister = 0;

        for (const auto& instrument : sorted)
        {
            optimized.add(instrument);
            instrumentsInCurrentRegister++;

            if (instrumentsInCurrentRegister >= instrumentsPerRegister && currentRegister < 6)
            {
                currentRegister++;
                instrumentsInCurrentRegister = 0;
            }
        }

        return optimized;
    }

    juce::var OrchestrationAPI::checkRegisterConflicts(const juce::Array<Instrument>& instruments)
    {
        auto conflicts = juce::DynamicObject();
        conflicts.setProperty("instrumentCount", instruments.size());

        juce::Array<juce::var> conflictList;

        // Check for register overlap conflicts
        for (int i = 0; i < instruments.size(); ++i)
        {
            for (int j = i + 1; j < instruments.size(); ++j)
            {
                const auto& inst1 = instruments[i];
                const auto& inst2 = instruments[j];

                // Check if ranges overlap significantly
                double overlap = calculateRegisterOverlap(inst1, inst2);
                if (overlap > 0.7) // 70% or more overlap
                {
                    auto conflict = juce::DynamicObject();
                    conflict.setProperty("instrument1", inst1.name);
                    conflict.setProperty("instrument2", inst2.name);
                    conflict.setProperty("overlapPercentage", overlap);
                    conflictList.add(juce::var(&conflict));
                }
            }
        }

        conflicts.setProperty("conflicts", juce::var(conflictList));
        conflicts.setProperty("hasConflicts", conflictList.size() > 0);

        return juce::var(&conflicts);
    }

    //==============================================================================
    juce::Array<Instrument> OrchestrationAPI::suggestInstrumentation(const juce::String& musicalStyle,
                                                             const juce::String& ensembleSize,
                                                             const juce::String& period)
    {
        juce::Array<Instrument> suggestion;

        // Determine target ensemble size
        int targetSize;
        if (ensembleSize == "small")
            targetSize = 8;
        else if (ensembleSize == "medium")
            targetSize = 25;
        else if (ensembleSize == "large")
            targetSize = 50;
        else
            targetSize = 25; // Default

        // Suggest based on musical style and period
        if (musicalStyle.contains("classical"))
        {
            if (period == "baroque")
            {
                // Baroque orchestra: strings + woodwinds + continuo
                suggestion.add(getInstrumentById(1)); // Violin I
                suggestion.add(getInstrumentById(2)); // Violin II
                suggestion.add(getInstrumentById(3)); // Viola
                suggestion.add(getInstrumentById(4)); // Cello
                suggestion.add(getInstrumentById(5)); // Double Bass
                suggestion.add(getInstrumentById(6)); // Flute
                suggestion.add(getInstrumentById(7)); // Oboe
                suggestion.add(getInstrumentById(8)); // Bassoon
                suggestion.add(getInstrumentById(14)); // Harpsichord
            }
            else if (period.contains("classical"))
            {
                // Classical orchestra: balanced strings, woodwinds, brass
                int stringsCount = targetSize / 3;
                int woodwindsCount = targetSize / 4;
                int brassCount = targetSize / 6;
                int percussionCount = targetSize / 12;

                // Strings
                for (int i = 0; i < stringsCount && i < 20; ++i)
                {
                    suggestion.add(getInstrumentById((i % 5) + 1)); // Cycle through string instruments
                }

                // Woodwinds
                for (int i = 0; i < woodwindsCount && i < 8; ++i)
                {
                    suggestion.add(getInstrumentById((i % 4) + 6)); // Cycle through woodwinds
                }

                // Brass
                for (int i = 0; i < brassCount && i < 8; ++i)
                {
                    suggestion.add(getInstrumentById((i % 4) + 10)); // Cycle through brass
                }

                // Percussion
                suggestion.add(getInstrumentById(16)); // Timpani
            }
        }
        else if (musicalStyle.contains("jazz"))
        {
            // Jazz ensemble: rhythm section + soloists
            suggestion.add(getInstrumentById(1)); // Trumpet
            suggestion.add(getInstrumentById(1)); // Trumpet
            suggestion.add(getInstrumentById(11)); // Trombone
            suggestion.add(getInstrumentById(11)); // Trombone
            suggestion.add(getInstrumentById(2)); // Alto Sax
            suggestion.add(getInstrumentById(10)); // Trumpet (could be soprano sax)
            suggestion.add(getInstrumentById(15)); // Piano
            suggestion.add(getInstrumentById(17)); // Drums
        }
        }
        else if (musicalStyle.contains("electronic"))
        {
            // Electronic ensemble
            suggestion.add(getInstrumentById(15)); // Piano
            suggestion.add(getInstrumentById(14)); // Keyboard/synthesizer
            suggestion.add(getInstrumentById(17)); // Electronic drums
        }

        // Ensure we don't exceed target size
        while (suggestion.size() > targetSize)
        {
            suggestion.removeLast();
        }

        return suggestion;
    }

    Instrument OrchestrationAPI::suggestSoloInstrument(const ChordProgression& harmony,
                                                     const juce::String& style,
                                                     double targetTension)
    {
        // For now, suggest based on style and tension
        if (style.contains("classical"))
        {
            if (targetTension > 0.7)
                return getInstrumentById(7); // Oboe - high tension
            else if (targetTension > 0.5)
                return getInstrumentById(6); // Flute - medium-high tension
            else
                return getInstrumentById(1); // Violin - versatile
        }
        else if (style.contains("jazz"))
        {
            if (targetTension > 0.6)
                return getInstrumentById(2); // Alto Sax
            else
                return getInstrumentById(6); // Flute
        }

        return getInstrumentById(1); // Default to violin
    }

    juce::Array<Instrument> OrchestrationAPI::suggestAccompaniment(const Instrument& soloInstrument,
                                                               const ChordProgression& harmony)
    {
        juce::Array<Instrument> accompaniment;

        // Suggest complementary instruments
        if (soloInstrument.family == InstrumentFamily::Strings)
        {
            // Accompany strings with different registers
            accompaniment.add(getInstrumentById(4)); // Cello for lower register
            accompaniment.add(getInstrumentById(3)); // Viola for inner harmony
        }
        else if (soloInstrument.family == InstrumentFamily::Woodwinds)
        {
            // Accompany woodwinds with strings
            accompaniment.add(getInstrumentById(1)); // Violin
            accompaniment.add(getInstrumentById(4)); // Cello
        }
        else if (soloInstrument.family == InstrumentFamily::Brass)
        {
            // Accompany brass with lower strings
            accompaniment.add(getInstrumentById(4)); // Cello
            accompaniment.add(getInstrumentById(5)); // Double Bass
        }

        // Add harmonic foundation
        accompaniment.add(getInstrumentById(4)); // Cello for foundation
        accompaniment.add(getInstrumentById(15)); // Piano for harmonic support

        return accompaniment;
    }

    //==============================================================================
    juce::var OrchestrationAPI::applySchillingerTechnique(const juce::juce_Array<Instrument>& ensemble,
                                                          const juce::String& technique)
    {
        auto result = juce::DynamicObject();
        result.setProperty("technique", technique);
        result.setProperty("instrumentCount", ensemble.size());

        juce::Array<juce::var> applications;

        if (technique == "interference_orchestration")
        {
            // Apply interference principles to orchestration
            auto application = juce::DynamicObject();
            application.setProperty("description", "Create orchestral interference using instrument pairs");
            application.setProperty("method", "pair_instruments_generators");
            applications.add(juce::var(&application));
        }
        else if (technique == "register_manipulation")
        {
            // Apply register field manipulation
            auto application = juce::DynamicObject();
            application.setProperty("description", "Manipulate register fields for dynamic contrast");
            application.setProperty("method", "contrasting_register_fields");
            applications.add(juce::var(&application));
        }
        else if (technique == "symmetric_orchestration")
        {
            // Apply symmetric orchestration patterns
            auto application = juce::DynamicObject();
            application.setProperty("description", "Create symmetric instrument groupings");
            application.setProperty("method", "mirror_instrument_sections");
            applications.add(juce::var(&application));
        }

        result.setProperty("applications", juce::var(applications));
        return juce::var(&result);
    }

    juce::var OrchestrationAPI::generateOrchestrationPlan(const juce::String& title,
                                                           const juce::String& duration,
                                                           const juce::juce_String& mood,
                                                           const juce::String& style)
    {
        auto plan = juce::DynamicObject();
        plan.setProperty("title", title);
        plan.setProperty("duration", duration);
        plan.setProperty("mood", mood);
        plan.setProperty("style", style);

        // Generate orchestration based on parameters
        juce::String ensembleSize = duration.contains("large") ? "large" : "medium";
        auto instruments = suggestInstrumentation(style, ensembleSize, "classical");

        auto instrumentationArray = juce::Array<juce::var>();
        for (const auto& instrument : instruments)
            instrumentationArray.add(instrument.toJson());
        plan.setProperty("instrumentation", juce::var(instrumentationArray));

        // Add orchestration notes
        auto notes = juce::DynamicObject();
        notes.setProperty("balance", "Balanced orchestration suitable for " + style + " music");
        notes.setProperty("dynamics", "Dynamic range from piano (pp) to fortissimo (ff)");
        notes.setProperty("texture", "Primarily " + (mood.contains("bright") ? "bright" : "warm") + " orchestral texture");

        plan.setProperty("notes", juce::var(&notes));
        return juce::var(&plan);
    }

    juce::juce_Array<Instrument> OrchestrationAPI::createInstrumentalContrast(const juce::Array<Instrument>& baseEnsemble,
                                                               const juce::String& contrastType)
    {
        juce::Array<Instrument> contrast;

        if (contrastType == "timbral")
        {
            // Create timbral contrast using different instrument families
            juce::Array<InstrumentFamily> contrastFamilies = {
                InstrumentFamily::Woodwinds, InstrumentFamily::Brass, InstrumentFamily::Percussion
            };

            for (auto family : contrastFamilies)
            {
                auto familyInstruments = getInstrumentsByFamily(family);
                if (!familyInstruments.isEmpty())
                {
                    contrast.add(familyInstruments[0]);
                }
            }
        }
        else if (contrastType == "register")
        {
            // Create register contrast
            for (const auto& instrument : baseEnsemble)
            {
                if (instrument.registerInfo.registerType == "soprano")
                {
                    // Add low register instrument
                    contrast.add(getInstrumentById(4)); // Cello
                }
                else if (instrument.registerInfo.registerType == "bass")
                {
                    // Add high register instrument
                    contrast.add(getInstrumentById(6)); // Flute
                }
            }
        }
        else if (contrastType == "dynamics")
        {
            // Add instruments with different dynamic ranges
            contrast.add(getInstrumentById(10)); // Trumpet - strong presence
            contrast.add(getInstrumentById(17)); // Snare Drum - rhythmic presence
        }

        return contrast;
    }

    //==============================================================================
    double OrchestrationAPI::calculateBlendQuality(const Instrument& instrument1,
                                                    const Instrument& instrument2)
    {
        double baseBlend = (instrument1.blendFactor + instrument2.blendFactor) / 2.0;

        // Adjust based on family compatibility
        if (instrument1.family == instrument2.family)
            baseBlend += 0.2; // Same family blends well
        else if ((instrument1.family == InstrumentFamily::Strings && instrument2.family == InstrumentFamily::Woodwinds) ||
                 (instrument1.family == InstrumentFamily::Woodwinds && instrument2.family == InstrumentFamily::Strings))
            baseBlend += 0.1; // Strings and woodwinds blend well

        // Adjust based on register compatibility
        double registerOverlap = calculateRegisterOverlap(instrument1, instrument2);
        if (registerOverlap < 0.3 || registerOverlap > 0.8)
            baseBlend += 0.1; // Good register separation or good register overlap

        return juce::jlimit(0.0, 1.0, baseBlend);
    }

    juce::var OrchestrationAPI::analyzeBalance(const juce::Array<Instrument>& ensemble)
    {
        auto analysis = juce::DynamicObject();
        analysis.setProperty("instrumentCount", ensemble.size());

        double totalPresence = 0.0;
        juce::Array<juce::var> instrumentAnalyses;

        for (const auto& instrument : ensemble)
        {
            auto instrumentAnalysis = juce::DynamicObject();
            instrumentAnalysis.setProperty("name", instrument.name);
            instrumentAnalysis.setProperty("family", static_cast<int>(instrument.family));
            instrumentAnalysis.setProperty("presence", instrument.presence);
            instrumentAnalysis.setProperty("soloCapable", instrument.isSoloCapable);
            instrumentAnalysis.setProperty("ensembleCapable", instrument.isEnsembleCapable);

            totalPresence += instrument.presence;

            instrumentAnalyses.add(juce::var(&instrumentAnalysis));
        }

        analysis.setProperty("instrumentAnalyses", juce::var(instrumentAnalyses));
        analysis.setProperty("totalPresence", totalPresence);
        analysis.setProperty("averagePresence", ensemble.size() > 0 ? totalPresence / ensemble.size() : 0.0);

        // Determine balance assessment
        double presenceVariance = 0.0;
        for (const auto& instrument : ensemble)
        {
            double deviation = instrument.presence - analysis.getProperty("averagePresence");
            presenceVariance += deviation * deviation;
        }

        if (ensemble.size() > 1)
            presenceVariance /= (ensemble.size() - 1);

        analysis.setProperty("presenceVariance", presenceVariance);

        if (presenceVariance < 0.1)
            analysis.setProperty("balanceAssessment", "well_balanced");
        else if (presenceVariance < 0.2)
            analysis.setProperty("balanceAssessment", "moderately_balanced");
        else
            analysis.setProperty("balanceAssessment", "unbalanced");

        return juce::var(&analysis);
    }

    juce::var OrchestrationAPI::suggestBalanceImprovements(const juce::juce_Array<Instrument>& ensemble,
                                                              const juce::var& targetBalance)
    {
        auto suggestions = juce::DynamicObject();
        suggestions.setProperty("currentBalance", analyzeBalance(ensemble));

        juce::Array<juce::var> improvements;

        // Check for various balance issues and suggest improvements
        auto currentBalance = analyzeBalance(ensemble);

        if (currentBalance.getProperty("balanceAssessment") == "unbalanced")
        {
            auto improvement = juce::DynamicObject();
            improvement.setProperty("suggestion", "Consider reducing dynamic range between sections or adding balancing instruments");
            improvement.setProperty("method", "equalize_presence");
            improvements.add(juce::var(&improvement));
        }

        if (currentBalance.getProperty("presenceVariance") > 0.2)
        {
            auto improvement = juce::Improvement
            ;
            improvement.setProperty("suggestion", "Balance instrument presence across registers and families");
            improvement.setProperty("method", "distribute_presence_evenly");
            improvements.add(juce::var(&improvement));
        }

        suggestions.setProperty("improvements", juce::var(improvements));
        return juce::var(&suggestions);
    }

    //==============================================================================
    int OrchestrationAPI::frequencyToMidiNote(double frequency)
    {
        return static_cast<int>(round(69.0 + 12.0 * std::log2(frequency / 440.0)));
    }

    double OrchestrationAPI::midiNoteToFrequency(int midiNote)
    {
        return 440.0 * std::pow(2.0, (midiNote - 69.0) / 12.0);
    }

    juce::String OrchestrationAPI::getFamilyName(InstrumentFamily family)
    {
        switch (family)
        {
            case InstrumentFamily::Strings: return "Strings";
            case InstrumentFamily::Woodwinds: return "Woodwinds";
            case InstrumentFamily::Brass: return "Brass";
            case InstrumentFamily::Percussion: return "Percussion";
            case InstrumentFamily::Keyboard: return "Keyboard";
            case InstrumentFamily::Harp: return "Harp";
            case InstrumentFamily::Vocal: return "Vocal";
            case InstrumentFamily::Electronic: return "Electronic";
            case InstrumentFamily::World: return "World";
            case InstrumentFamily::Guitar: return "Guitar";
            case InstrumentFamily::BassGuitar: return "Bass Guitar";
            default: return "Unknown";
        }
    }

    juce::Result OrchestrationAPI::validateInstrument(const Instrument& instrument)
    {
        if (instrument.name.isEmpty())
            return juce::Result::fail("Instrument name cannot be empty");

        if (instrument.id <= 0)
            return juce::Result::fail("Instrument ID must be positive");

        if (instrument.availableTechniques.isEmpty())
            return juce::Result::fail("Instrument must have at least one technique");

        // Validate register information
        if (instrument.registerInfo.lowestNote < 0 || instrument.registerInfo.highestNote > 127)
            return juce::Result::fail("Invalid MIDI note range");

        if (instrument.registerInfo.lowestNote >= instrument.registerInfo.highestNote)
            return juce::Result::fail("Lowest note must be lower than highest note");

        return juce::Result::ok();
    }

    double OrchestrationAPI::calculateOrchestralDensity(const juce::Array<Instrument>& ensemble)
    {
        return pimpl->calculateDensity(ensemble);
    }

    //==============================================================================
    // Private helper method
    double OrchestrationAPI::calculateRegisterOverlap(const Instrument& instrument1, const Instrument& instrument2)
    {
        // Calculate overlap between instrument optimal ranges
        double center1 = instrument1.registerInfo.optimalRange;
        double center2 = instrument2.registerInfo.optimalRange;

        double range1 = instrument1.registerInfo.getRangeSpan();
        double range2 = instrument2.registerInfo.getRangeSpan();
        double overlapStart = juce::jmax(center1 - range1/2, center2 - range2/2);
        double overlapEnd = juce::jmin(center1 + range1/2, center2 + range2/2);
        double overlapRange = juce::jmax(0.0, overlapEnd - overlapStart);

        // Normalize to maximum possible overlap
        double maxPossibleOverlap = juce::jmin(range1, range2);
        return maxPossibleOverlap > 0 ? overlapRange / maxPossibleOverlap : 0.0;
    }

} // namespace Schillinger