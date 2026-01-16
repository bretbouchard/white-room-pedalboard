/*
  ==============================================================================

    AdvancedHarmonyAPI.h
    Created: 2 Dec 2025
    Author:  Schillinger System

    Advanced harmony and form tools implementing Schillinger's mathematical
    approach to chord expansion, form manipulation, and structural analysis.

  ==============================================================================
*/

#pragma once

#include "SchillingerSDK.h"
#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>
#include <memory>
#include <functional>

namespace Schillinger
{
    //==============================================================================
    /** Advanced chord types based on Schillinger harmony theory */
    enum class ChordType : uint8_t
    {
        // Basic triads
        MajorTriad = 0,
        MinorTriad = 1,
        DiminishedTriad = 2,
        AugmentedTriad = 3,

        // Seventh chords
        Major7th = 10,
        Dominant7th = 11,
        Minor7th = 12,
        HalfDiminished7th = 13,
        FullyDiminished7th = 14,
        Augmented7th = 15,

        // Extended chords
        Major9th = 20,
        Dominant9th = 21,
        Minor9th = 22,
        Eleventh = 30,
        Thirteenth = 31,

        // Schillinger-specific chords
        InterferenceChord = 40,
        ResultantChord = 41,
        HarmonicFieldChord = 42,
        PolynomialChord = 43,

        // Suspended and altered chords
        Suspended2 = 50,
        Suspended4 = 51,
        AlteredDominant = 52,
        Neapolitan = 53
    };

    //==============================================================================
    /** Musical form types for structural analysis */
    enum class FormType : uint8_t
    {
        Binary = 0,           // A-B form
        Ternary = 1,          // A-B-A form
        Rondo = 2,            // A-B-A-C-A form
        Sonata = 3,           // Exposition-Development-Recapitulation
        ThemeAndVariations = 4,
        Fugue = 5,            // Contrapuntal form
        Scherzo = 6,          // A-B-A with trio
        Minuet = 7,           // A-B-A courtly dance
        ThroughComposed = 8,  // Continuous development
        Strophic = 9,         // Verse-chorus repetition
        Cyclical = 10,        // Multi-movement connection
        SchillingerCustom = 11 // Custom Schillinger-based form
    };

    //==============================================================================
    /** Chord quality characteristics for analysis */
    struct ChordQuality
    {
        ChordType type = ChordType::MajorTriad;
        juce::String root = "C";      // Root note
        juce::String key = "C";       // Current key context
        juce::String scale = "major";  // Scale type (major, minor, etc.)
        juce::Array<int> intervals;   // Interval pattern from root
        double tension = 0.0;         // Tension level (0.0-1.0)
        double stability = 1.0;       // Stability level (0.0-1.0)
        juce::StringArray functions;  // Functional roles (tonic, dominant, etc.)
        juce::var analysisData;       // Additional analysis information

        /** Calculate chord intervals based on type */
        void calculateIntervals()
        {
            intervals.clear();

            switch (type)
            {
                case ChordType::MajorTriad:
                    intervals.addArray({0, 4, 7}); // Root, Major 3rd, Perfect 5th
                    break;
                case ChordType::MinorTriad:
                    intervals.addArray({0, 3, 7}); // Root, Minor 3rd, Perfect 5th
                    break;
                case ChordType::DiminishedTriad:
                    intervals.addArray({0, 3, 6}); // Root, Minor 3rd, Tritone
                    break;
                case ChordType::AugmentedTriad:
                    intervals.addArray({0, 4, 8}); // Root, Major 3rd, Augmented 5th
                    break;
                case ChordType::Dominant7th:
                    intervals.addArray({0, 4, 7, 10}); // Root, M3, P5, Minor 7th
                    break;
                case ChordType::Major7th:
                    intervals.addArray({0, 4, 7, 11}); // Root, M3, P5, Major 7th
                    break;
                case ChordType::Minor7th:
                    intervals.addArray({0, 3, 7, 10}); // Root, m3, P5, Minor 7th
                    break;
                case ChordType::InterferenceChord:
                    // Calculate based on interference pattern
                    intervals = calculateInterferenceIntervals();
                    break;
                default:
                    intervals.addArray({0, 4, 7}); // Default to major triad
                    break;
            }

            // Update tension based on intervals
            updateTensionAndStability();
        }

        /** Convert to JSON representation */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("type", static_cast<int>(type));
            json->setProperty("root", root);
            json->setProperty("key", key);
            json->setProperty("scale", scale);
            json->setProperty("tension", tension);
            json->setProperty("stability", stability);

            auto intervalsArray = new juce::Array<juce::var>();
            for (int interval : intervals)
                intervalsArray->add(juce::var(interval));
            json->setProperty("intervals", juce::var(intervalsArray));

            auto functionsArray = new juce::Array<juce::var>();
            for (const auto& func : functions)
                functionsArray->add(juce::var(func));
            json->setProperty("functions", juce::var(functionsArray));

            json->setProperty("analysisData", analysisData);

            return juce::var(json);
        }

        /** Create from JSON representation */
        static ChordQuality fromJson(const juce::var& json)
        {
            ChordQuality chord;
            chord.type = static_cast<ChordType>(json.getProperty("type", 0));
            chord.root = json.getProperty("root", "C");
            chord.key = json.getProperty("key", "C");
            chord.scale = json.getProperty("scale", "major");
            chord.tension = json.getProperty("tension", 0.0);
            chord.stability = json.getProperty("stability", 1.0);

            if (json.hasProperty("intervals"))
            {
                auto intervalsArray = json["intervals"].getArray();
                if (intervalsArray != nullptr)
                {
                    for (const auto& interval : *intervalsArray)
                        chord.intervals.add(static_cast<int>(interval));
                }
            }

            if (json.hasProperty("functions"))
            {
                auto functionsArray = json["functions"].getArray();
                if (functionsArray != nullptr)
                {
                    for (const auto& func : *functionsArray)
                        chord.functions.add(func.toString());
                }
            }

            chord.analysisData = json.getProperty("analysisData", juce::var());
            return chord;
        }

    private:
        juce::Array<int> calculateInterferenceIntervals()
        {
            // Generate interference-based intervals using mathematical patterns
            juce::Array<int> interferenceIntervals;
            std::vector<int> generators = {3, 2}; // Example generators

            // Create interference pattern
            int lcm = std::lcm(generators[0], generators[1]);
            for (int i = 0; i < lcm; ++i)
            {
                bool hit = false;
                for (int gen : generators)
                {
                    if (i % gen == 0)
                    {
                        hit = true;
                        break;
                    }
                }
                if (hit && i < 12) // Limit to one octave
                {
                    interferenceIntervals.add(i);
                }
            }

            // Ensure we have at least a triad
            if (interferenceIntervals.size() < 3)
            {
                interferenceIntervals.addArray({0, 4, 7});
            }

            return interferenceIntervals;
        }

        void updateTensionAndStability()
        {
            // Calculate tension based on interval complexity
            tension = 0.0;
            stability = 1.0;

            for (int interval : intervals)
            {
                // Perfect intervals (unison, 4th, 5th, octave) are stable
                if (interval % 12 == 0 || interval % 12 == 5 || interval % 12 == 7)
                {
                    stability += 0.2;
                }
                // Thirds add mild tension
                else if (interval % 12 == 3 || interval % 12 == 4)
                {
                    tension += 0.1;
                    stability += 0.1;
                }
                // Tritone adds high tension
                else if (interval % 12 == 6)
                {
                    tension += 0.3;
                    stability -= 0.2;
                }
                // Sevenths add moderate tension
                else if (interval % 12 == 10 || interval % 12 == 11)
                {
                    tension += 0.2;
                }
            }

            // Normalize values
            tension = juce::jlimit(0.0, 1.0, tension);
            stability = juce::jlimit(0.0, 1.0, stability);
        }
    };

    //==============================================================================
    /** Chord progression with Schillinger analysis */
    struct ChordProgression
    {
        juce::Array<ChordQuality> chords;
        juce::String key = "C";
        juce::String scale = "major";
        int timeSignatureNumerator = 4;
        int timeSignatureDenominator = 4;
        juce::Array<int> durations;     // Duration of each chord in beats
        double overallTension = 0.0;    // Average tension across progression
        double functionalFlow = 1.0;    // How well progression follows functional harmony
        juce::var structuralAnalysis;   // Schillinger structural analysis
        juce::StringArray functions;    // Overall functional roles

        /** Calculate overall metrics for the progression */
        void analyzeProgression()
        {
            if (chords.isEmpty())
                return;

            // Calculate average tension
            double totalTension = 0.0;
            for (const auto& chord : chords)
            {
                totalTension += chord.tension;
            }
            overallTension = totalTension / chords.size();

            // Analyze functional flow
            analyzeFunctionalFlow();

            // Generate structural analysis
            generateStructuralAnalysis();
        }

        /** Convert to JSON representation */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("key", key);
            json->setProperty("scale", scale);
            json->setProperty("timeSignature", juce::Array<juce::var>{
                juce::var(timeSignatureNumerator),
                juce::var(timeSignatureDenominator)
            });
            json->setProperty("overallTension", overallTension);
            json->setProperty("functionalFlow", functionalFlow);
            json->setProperty("structuralAnalysis", structuralAnalysis);

            auto chordsArray = new juce::Array<juce::var>();
            for (const auto& chord : chords)
                chordsArray->add(chord.toJson());
            json->setProperty("chords", juce::var(chordsArray));

            auto durationsArray = new juce::Array<juce::var>();
            for (int duration : durations)
                durationsArray->add(juce::var(duration));
            json->setProperty("durations", juce::var(durationsArray));

            auto functionsArray = new juce::Array<juce::var>();
            for (const auto& func : functions)
                functionsArray->add(juce::var(func));
            json->setProperty("functions", juce::var(functionsArray));

            return juce::var(json);
        }

        /** Create from JSON representation */
        static ChordProgression fromJson(const juce::var& json)
        {
            ChordProgression progression;
            progression.key = json.getProperty("key", "C");
            progression.scale = json.getProperty("scale", "major");
            progression.overallTension = json.getProperty("overallTension", 0.0);
            progression.functionalFlow = json.getProperty("functionalFlow", 1.0);

            if (json.hasProperty("timeSignature"))
            {
                auto tsArray = json["timeSignature"].getArray();
                if (tsArray != nullptr && tsArray->size() >= 2)
                {
                    progression.timeSignatureNumerator = static_cast<int>((*tsArray)[0]);
                    progression.timeSignatureDenominator = static_cast<int>((*tsArray)[1]);
                }
            }

            if (json.hasProperty("chords"))
            {
                auto chordsArray = json["chords"].getArray();
                if (chordsArray != nullptr)
                {
                    for (const auto& chordJson : *chordsArray)
                        progression.chords.add(ChordQuality::fromJson(chordJson));
                }
            }

            if (json.hasProperty("durations"))
            {
                auto durationsArray = json["durations"].getArray();
                if (durationsArray != nullptr)
                {
                    for (const auto& duration : *durationsArray)
                        progression.durations.add(static_cast<int>(duration));
                }
            }

            if (json.hasProperty("functions"))
            {
                auto functionsArray = json["functions"].getArray();
                if (functionsArray != nullptr)
                {
                    for (const auto& func : *functionsArray)
                        progression.functions.add(func.toString());
                }
            }

            progression.structuralAnalysis = json.getProperty("structuralAnalysis", juce::var());
            return progression;
        }

    private:
        void analyzeFunctionalFlow()
        {
            // Analyze how well the progression follows traditional functional harmony
            functionalFlow = 1.0; // Default to perfect flow

            // Check for proper resolution patterns
            if (chords.size() > 1)
            {
                for (int i = 1; i < chords.size(); ++i)
                {
                    const auto& prevChord = chords[i-1];
                    const auto& currChord = chords[i];

                    // Deduct points for awkward transitions
                    if (prevChord.tension > 0.8 && currChord.tension > 0.8)
                    {
                        functionalFlow -= 0.1; // Two high-tension chords in sequence
                    }

                    // Bonus for proper resolution (tension to stability)
                    if (prevChord.tension > currChord.tension && currChord.stability > 0.7)
                    {
                        functionalFlow += 0.05;
                    }
                }
            }

            functionalFlow = juce::jlimit(0.0, 1.0, functionalFlow);
        }

        void generateStructuralAnalysis()
        {
            auto analysis = juce::DynamicObject();
            analysis.setProperty("chordCount", chords.size());
            analysis.setProperty("averageDuration", chords.size() > 0 ?
                juce::Array<double>(durations.begin(), durations.end()).getAverage() : 0.0);

            // Analyze tension curve
            juce::Array<double> tensionCurve;
            for (const auto& chord : chords)
                tensionCurve.add(chord.tension);
            analysis.setProperty("tensionCurve", juce::var(createDoubleArray(tensionCurve)));

            // Determine form characteristics
            analysis.setProperty("characteristics", determineFormCharacteristics());

            structuralAnalysis = juce::var(&analysis);
        }

        juce::String determineFormCharacteristics()
        {
            if (chords.size() == 0) return "Empty";
            if (chords.size() == 1) return "Single";
            if (chords.size() == 2) return "Binary";
            if (chords.size() == 3) return "Ternary";
            if (chords.size() == 4) return "Quaternary";
            return "Extended";
        }

        juce::Array<juce::var> createDoubleArray(const juce::Array<double>& values)
        {
            juce::Array<juce::var> result;
            for (double value : values)
                result.add(juce::var(value));
            return result;
        }
    };

    //==============================================================================
    /** Musical form structure with sections and relationships */
    struct MusicalForm
    {
        FormType type = FormType::Binary;
        juce::String name;             // e.g., "Sonata Form", "Binary Form"
        juce::Array<juce::String> sections; // Section names (A, B, C, etc.)
        juce::Array<int> sectionLengths; // Length of each section in measures
        juce::String key = "C";         // Main key
        juce::String scale = "major";   // Main scale
        juce::var relationships;        // Schillinger-based relationships between sections
        juce::StringArray thematicMaterial; // Thematic development tracking
        double structuralComplexity = 1.0;  // Overall complexity rating
        juce::var analysis;             // Detailed form analysis

        /** Validate form structure */
        juce::Result validate() const
        {
            if (sections.isEmpty())
                return juce::Result::fail("Form must have at least one section");

            if (sectionLengths.size() != sections.size())
                return juce::Result::fail("Section count must match length count");

            for (int length : sectionLengths)
            {
                if (length <= 0)
                    return juce::Result::fail("Section lengths must be positive");
            }

            return juce::Result::ok();
        }

        /** Calculate form metrics */
        void calculateMetrics()
        {
            if (sections.isEmpty())
                return;

            // Calculate total length
            int totalLength = 0;
            for (int length : sectionLengths)
                totalLength += length;

            // Calculate complexity based on section relationships
            calculateStructuralComplexity();

            // Generate analysis
            generateAnalysis();
        }

        /** Convert to JSON representation */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("type", static_cast<int>(type));
            json->setProperty("name", name);
            json->setProperty("key", key);
            json->setProperty("scale", scale);
            json->setProperty("structuralComplexity", structuralComplexity);
            json->setProperty("analysis", analysis);
            json->setProperty("relationships", relationships);

            auto sectionsArray = new juce::Array<juce::var>();
            for (const auto& section : sections)
                sectionsArray->add(juce::var(section));
            json->setProperty("sections", juce::var(sectionsArray));

            auto lengthsArray = new juce::Array<juce::var>();
            for (int length : sectionLengths)
                lengthsArray->add(juce::var(length));
            json->setProperty("sectionLengths", juce::var(lengthsArray));

            auto thematicArray = new juce::Array<juce::var>();
            for (const auto& material : thematicMaterial)
                thematicArray->add(juce::var(material));
            json->setProperty("thematicMaterial", juce::var(thematicArray));

            return juce::var(json);
        }

        /** Create from JSON representation */
        static MusicalForm fromJson(const juce::var& json)
        {
            MusicalForm form;
            form.type = static_cast<FormType>(json.getProperty("type", 0));
            form.name = json.getProperty("name", "");
            form.key = json.getProperty("key", "C");
            form.scale = json.getProperty("scale", "major");
            form.structuralComplexity = json.getProperty("structuralComplexity", 1.0);

            if (json.hasProperty("sections"))
            {
                auto sectionsArray = json["sections"].getArray();
                if (sectionsArray != nullptr)
                {
                    for (const auto& section : *sectionsArray)
                        form.sections.add(section.toString());
                }
            }

            if (json.hasProperty("sectionLengths"))
            {
                auto lengthsArray = json["sectionLengths"].getArray();
                if (lengthsArray != nullptr)
                {
                    for (const auto& length : *lengthsArray)
                        form.sectionLengths.add(static_cast<int>(length));
                }
            }

            if (json.hasProperty("thematicMaterial"))
            {
                auto thematicArray = json["thematicMaterial"].getArray();
                if (thematicArray != nullptr)
                {
                    for (const auto& material : *thematicArray)
                        form.thematicMaterial.add(material.toString());
                }
            }

            form.relationships = json.getProperty("relationships", juce::var());
            form.analysis = json.getProperty("analysis", juce::var());
            return form;
        }

    private:
        void calculateStructuralComplexity()
        {
            // Base complexity on form type and section count
            switch (type)
            {
                case FormType::Binary:
                    structuralComplexity = 1.0 + (sections.size() - 2) * 0.2;
                    break;
                case FormType::Ternary:
                    structuralComplexity = 1.5 + (sections.size() - 3) * 0.3;
                    break;
                case FormType::Rondo:
                    structuralComplexity = 2.0 + (sections.size() - 4) * 0.25;
                    break;
                case FormType::Sonata:
                    structuralComplexity = 3.0 + (sections.size() - 3) * 0.4;
                    break;
                case FormType::Fugue:
                    structuralComplexity = 4.0 + (sections.size() - 2) * 0.5;
                    break;
                case FormType::SchillingerCustom:
                    structuralComplexity = 2.5 + (sections.size() - 1) * 0.35;
                    break;
                default:
                    structuralComplexity = 1.0 + sections.size() * 0.2;
                    break;
            }
        }

        void generateAnalysis()
        {
            auto formAnalysis = juce::DynamicObject();
            formAnalysis.setProperty("totalMeasures", calculateTotalMeasures());
            formAnalysis.setProperty("sectionCount", sections.size());
            formAnalysis.setProperty("averageSectionLength", sections.size() > 0 ?
                static_cast<double>(calculateTotalMeasures()) / sections.size() : 0.0);
            formAnalysis.setProperty("repetitionPatterns", analyzeRepetitionPatterns());
            formAnalysis.setProperty("thematicDevelopment", analyzeThematicDevelopment());

            analysis = juce::var(&formAnalysis);
        }

        int calculateTotalMeasures() const
        {
            int total = 0;
            for (int length : sectionLengths)
                total += length;
            return total;
        }

        juce::String analyzeRepetitionPatterns() const
        {
            // Analyze which sections repeat
            juce::String patterns = "Sections: ";
            for (int i = 0; i < sections.size(); ++i)
            {
                patterns += sections[i];
                if (i < sections.size() - 1)
                    patterns += " -> ";
            }
            return patterns;
        }

        juce::String analyzeThematicDevelopment() const
        {
            if (thematicMaterial.isEmpty())
                return "No thematic material specified";

            juce::String development = "Thematic development: ";
            for (const auto& material : thematicMaterial)
            {
                development += material + ", ";
            }

            if (development.endsWith(", "))
                development = development.dropLastCharacters(2);

            return development;
        }
    };

    //==============================================================================
    /**
        Advanced Harmony API implementing Schillinger's mathematical approach
        to chord expansion, form manipulation, and structural analysis.
    */
    class AdvancedHarmonyAPI
    {
    public:
        //==============================================================================
        using AsyncCallback = std::function<void(juce::Result, juce::var)>;

        //==============================================================================
        /** Constructor */
        AdvancedHarmonyAPI();

        /** Destructor */
        ~AdvancedHarmonyAPI();

        //==============================================================================
        // Chord Generation and Expansion

        /** Generate chord based on Schillinger interference pattern */
        void generateInterferenceChord(int generatorA, int generatorB,
                                       AsyncCallback<ChordQuality> callback);

        /** Synchronous version of interference chord generation */
        juce::Result generateInterferenceChordSync(int generatorA, int generatorB,
                                                    ChordQuality& chord);

        /** Expand basic chord using Schillinger expansion techniques */
        void expandChord(const ChordQuality& baseChord,
                        const juce::String& expansionType,
                        AsyncCallback<juce::Array<ChordQuality>> callback);

        /** Synchronous version of chord expansion */
        juce::Result expandChordSync(const ChordQuality& baseChord,
                                      const juce::String& expansionType,
                                      juce::Array<ChordQuality>& expandedChords);

        /** Generate resultant chord from harmonic interference */
        void generateResultantChord(const juce::Array<ChordQuality>& inputChords,
                                   AsyncCallback<ChordQuality> callback);

        /** Synchronous version of resultant chord generation */
        juce::Result generateResultantChordSync(const juce::Array<ChordQuality>& inputChords,
                                                 ChordQuality& resultantChord);

        //==============================================================================
        // Chord Progression Analysis and Generation

        /** Analyze chord progression using Schillinger principles */
        void analyzeProgression(const ChordProgression& progression,
                               AsyncCallback<juce::var> callback);

        /** Synchronous version of progression analysis */
        juce::Result analyzeProgressionSync(const ChordProgression& progression,
                                            juce::var& analysis);

        /** Generate Schillinger-based chord progression */
        void generateProgression(const juce::String& key,
                                const juce::String& scale,
                                const juce::String& progressionType,
                                int length,
                                AsyncCallback<ChordProgression> callback);

        /** Synchronous version of progression generation */
        juce::Result generateProgressionSync(const juce::String& key,
                                             const juce::String& scale,
                                             const juce::String& progressionType,
                                             int length,
                                             ChordProgression& progression);

        /** Optimize progression for tension and flow */
        void optimizeProgression(ChordProgression& progression,
                                double targetTension = 0.5,
                                double targetFlow = 0.8);

        //==============================================================================
        // Musical Form Analysis and Generation

        /** Analyze musical form using Schillinger structural analysis */
        void analyzeForm(const MusicalForm& form,
                        AsyncCallback<juce::var> callback);

        /** Synchronous version of form analysis */
        juce::Result analyzeFormSync(const MusicalForm& form,
                                     juce::var& analysis);

        /** Generate Schillinger-based musical form */
        void generateForm(FormType type,
                         const juce::String& key,
                         const juce::String& scale,
                         int totalLength,
                         AsyncCallback<MusicalForm> callback);

        /** Synchronous version of form generation */
        juce::Result generateFormSync(FormType type,
                                      const juce::String& key,
                                      const juce::String& scale,
                                      int totalLength,
                                      MusicalForm& form);

        /** Manipulate form structure (invert, retrograde, etc.) */
        MusicalForm manipulateForm(const MusicalForm& form,
                                 const juce::String& manipulationType);

        //==============================================================================
        // Advanced Analysis Tools

        /** Analyze harmonic field of a composition */
        void analyzeHarmonicField(const ChordProgression& progression,
                                 AsyncCallback<juce::var> callback);

        /** Calculate harmonic interference patterns */
        juce::var calculateHarmonicInterference(const juce::Array<ChordQuality>& chords);

        /** Generate harmonic tension curve */
        juce::Array<double> generateTensionCurve(const ChordProgression& progression);

        /** Analyze voice leading possibilities */
        juce::var analyzeVoiceLeading(const ChordProgression& progression);

        //==============================================================================
        // Utility Methods

        /** Convert chord type to human-readable name */
        static juce::String getChordTypeName(ChordType type);

        /** Get functional role of chord in key context */
        static juce::StringArray getChordFunctions(const ChordQuality& chord,
                                                 const juce::String& key,
                                                 const juce::String& scale);

        /** Calculate harmonic distance between two chords */
        static double calculateHarmonicDistance(const ChordQuality& chord1,
                                               const ChordQuality& chord2);

        /** Validate chord quality data */
        static juce::Result validateChordQuality(const ChordQuality& chord);

    private:
        //==============================================================================
        struct Impl;
        std::unique_ptr<Impl> pimpl;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AdvancedHarmonyAPI)
    };

} // namespace Schillinger