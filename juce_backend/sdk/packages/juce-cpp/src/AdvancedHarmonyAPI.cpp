/*
  ==============================================================================

    AdvancedHarmonyAPI.cpp
    Created: 2 Dec 2025
    Author:  Schillinger System

    Implementation of advanced harmony and form tools using Schillinger's
    mathematical approach to music theory and composition.

  ==============================================================================
*/

#include "../include/AdvancedHarmonyAPI.h"
#include <juce_dsp/juce_dsp.h>
#include <cmath>
#include <algorithm>
#include <random>

namespace Schillinger
{
    //==============================================================================
    // AdvancedHarmonyAPI::Impl
    struct AdvancedHarmonyAPI::Impl
    {
        std::mt19937 randomEngine;

        Impl()
        {
            randomEngine.seed(static_cast<unsigned>(std::chrono::system_clock::now().time_since_epoch().count()));
        }

        /** Generate interference pattern for chord creation */
        juce::Array<int> generateInterferencePattern(int generatorA, int generatorB)
        {
            juce::Array<int> pattern;
            int lcm = std::lcm(generatorA, generatorB);

            for (int i = 0; i < lcm; ++i)
            {
                bool hit = false;
                int intensity = 0;

                if (i % generatorA == 0)
                {
                    hit = true;
                    intensity++;
                }

                if (i % generatorB == 0)
                {
                    hit = true;
                    intensity++;
                }

                if (hit && i < 12) // Limit to one octave (12 semitones)
                {
                    pattern.add(intensity); // Store intensity level
                }
            }

            // Ensure we have at least a basic triad pattern
            if (pattern.size() < 3)
            {
                pattern.clear();
                pattern.addArray({1, 0, 1, 1, 0}); // Basic interference pattern
            }

            return pattern;
        }

        /** Convert interference pattern to chord intervals */
        juce::Array<int> interferencePatternToIntervals(const juce::Array<int>& pattern)
        {
            juce::Array<int> intervals;

            // Find positions where pattern has hits
            for (int i = 0; i < pattern.size(); ++i)
            {
                if (pattern[i] > 0)
                {
                    intervals.add(i); // Use position as interval from root
                }
            }

            // Ensure we have root (0)
            if (!intervals.contains(0))
                intervals.insert(0, 0);

            // Sort and remove duplicates
            intervals.sort();
            for (int i = intervals.size() - 1; i > 0; --i)
            {
                if (intervals[i] == intervals[i - 1])
                    intervals.remove(i);
            }

            return intervals;
        }

        /** Determine chord type from intervals */
        ChordType determineChordTypeFromIntervals(const juce::Array<int>& intervals)
        {
            if (intervals.size() < 3)
                return ChordType::MajorTriad; // Default

            // Check for common chord types
            if (intervals.size() == 3)
            {
                // Major triad: 0, 4, 7
                if (intervals[0] == 0 && intervals[1] == 4 && intervals[2] == 7)
                    return ChordType::MajorTriad;

                // Minor triad: 0, 3, 7
                if (intervals[0] == 0 && intervals[1] == 3 && intervals[2] == 7)
                    return ChordType::MinorTriad;

                // Diminished triad: 0, 3, 6
                if (intervals[0] == 0 && intervals[1] == 3 && intervals[2] == 6)
                    return ChordType::DiminishedTriad;

                // Augmented triad: 0, 4, 8
                if (intervals[0] == 0 && intervals[1] == 4 && intervals[2] == 8)
                    return ChordType::AugmentedTriad;
            }
            else if (intervals.size() == 4)
            {
                // Check seventh chords
                if (intervals.contains(7) && intervals.contains(10))
                {
                    if (intervals.contains(4))
                        return ChordType::Dominant7th;
                    else if (intervals.contains(3))
                        return ChordType::Minor7th;
                }

                if (intervals.contains(7) && intervals.contains(11))
                {
                    if (intervals.contains(4))
                        return ChordType::Major7th;
                }
            }

            // If no standard pattern matches, classify as interference chord
            return ChordType::InterferenceChord;
        }

        /** Expand chord using Schillinger techniques */
        juce::Array<ChordQuality> expandChordInternally(const ChordQuality& baseChord,
                                                         const juce::String& expansionType)
        {
            juce::Array<ChordQuality> expanded;

            if (expansionType == "tertian")
            {
                // Standard tertian expansion (stacking thirds)
                expanded = baseChord;
                ChordQuality extended = baseChord;

                // Add 7th if not present
                if (!baseChord.intervals.contains(10))
                {
                    extended.intervals.add(10);
                    extended.type = ChordType::Dominant7th;
                    extended.calculateIntervals();
                }

                // Add 9th
                if (!baseChord.intervals.contains(14))
                {
                    extended.intervals.add(14);
                    extended.type = ChordType::Ninth;
                    extended.calculateIntervals();
                }

                expanded.add(extended);
            }
            else if (expansionType == "quartal")
            {
                // Quartal harmony (stacking fourths)
                ChordQuality quartalChord = baseChord;
                quartalChord.intervals.clear();
                quartalChord.intervals.addArray({0, 5, 10, 15}); // Stack of perfect fourths
                quartalChord.type = ChordType::InterferenceChord;
                quartalChord.calculateIntervals();
                expanded.add(quartalChord);
            }
            else if (expansionType == "cluster")
            {
                // Tone cluster expansion
                ChordQuality clusterChord = baseChord;
                clusterChord.intervals.clear();

                // Create cluster around root
                int rootInterval = baseChord.intervals[0]; // Assuming root is first
                for (int i = -2; i <= 2; ++i)
                {
                    int interval = rootInterval + (i * 2); // Semitone clusters
                    if (interval >= 0 && interval < 12)
                        clusterChord.intervals.add(interval);
                }

                clusterChord.type = ChordType::InterferenceChord;
                clusterChord.calculateIntervals();
                expanded.add(clusterChord);
            }
            else if (expansionType == "polychord")
            {
                // Polychord: two separate triads
                ChordQuality upperTriad = baseChord;
                ChordQuality lowerTriad = baseChord;

                // Upper triad transposed up a tritone
                for (int& interval : upperTriad.intervals)
                {
                    interval = (interval + 6) % 12;
                }

                upperTriad.type = ChordType::InterferenceChord;
                upperTriad.calculateIntervals();

                expanded.add(lowerTriad);
                expanded.add(upperTriad);
            }

            return expanded;
        }

        /** Generate harmonic progression based on Schillinger principles */
        ChordProgression generateProgressionInternally(const juce::String& key,
                                                       const juce::String& scale,
                                                       const juce::String& progressionType,
                                                       int length)
        {
            ChordProgression progression;
            progression.key = key;
            progression.scale = scale;
            progression.timeSignatureNumerator = 4;
            progression.timeSignatureDenominator = 4;

            if (progressionType == "functional")
            {
                // Generate functional harmony progression
                juce::Array<juce::String> functions;
                if (scale == "major")
                {
                    functions.addArray({"I", "IV", "V", "I"}); // I-IV-V-I
                }
                else
                {
                    functions.addArray({"i", "iv", "V", "i"}); // i-iv-V-i
                }

                // Extend for longer progressions
                while (functions.size() < length)
                {
                    functions.add("V"); // Add dominants for extension
                }

                for (int i = 0; i < length && i < functions.size(); ++i)
                {
                    ChordQuality chord = createChordFromFunction(functions[i], key, scale);
                    progression.chords.add(chord);
                    progression.durations.add(4); // 4 beats per chord
                }
            }
            else if (progressionType == "interference")
            {
                // Generate progression using interference patterns
                for (int i = 0; i < length; ++i)
                {
                    int genA = 3 + (i % 4); // Vary generators
                    int genB = 2 + (i % 3);
                    ChordQuality chord;
                    generateInterferenceChordSync(genA, genB, chord);
                    chord.root = key;
                    chord.key = key;
                    chord.scale = scale;
                    progression.chords.add(chord);
                    progression.durations.add(2 + (i % 3)); // Vary durations
                }
            }
            else if (progressionType == "descending_fifths")
            {
                // Generate progression using circle of fifths descending
                juce::Array<juce::String> circleOfFifths;
                if (scale == "major")
                {
                    circleOfFifths.addArray({"I", "IV", "VII", "III", "VI", "II", "V"});
                }
                else
                {
                    circleOfFifths.addArray({"i", "iv", "VII", "III", "VI", "II", "v"});
                }

                for (int i = 0; i < length; ++i)
                {
                    juce::String function = circleOfFifths[i % circleOfFifths.size()];
                    ChordQuality chord = createChordFromFunction(function, key, scale);
                    progression.chords.add(chord);
                    progression.durations.add(4);
                }
            }
            else if (progressionType == "chromatic")
            {
                // Generate chromatic progression
                juce::String chromaticRoots[] = {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};
                int startIndex = getRootIndex(key, chromaticRoots, 12);

                for (int i = 0; i < length; ++i)
                {
                    juce::String root = chromaticRoots[(startIndex + i) % 12];
                    ChordQuality chord;
                    chord.root = root;
                    chord.key = key;
                    chord.scale = scale;
                    chord.type = ChordType::MajorTriad;
                    chord.calculateIntervals();
                    progression.chords.add(chord);
                    progression.durations.add(2);
                }
            }

            progression.analyzeProgression();
            return progression;
        }

        /** Create chord from harmonic function */
        ChordQuality createChordFromFunction(const juce::String& function,
                                             const juce::String& key,
                                             const juce::String& scale)
        {
            ChordQuality chord;
            chord.key = key;
            chord.scale = scale;
            chord.root = key; // Default to key as root

            if (scale == "major")
            {
                if (function == "I" || function == "i")
                {
                    chord.type = ChordType::MajorTriad;
                    chord.functions.add("tonic");
                }
                else if (function == "ii")
                {
                    chord.type = ChordType::MinorTriad;
                    chord.root = getNoteFromInterval(key, 2); // Whole step up
                    chord.functions.add("subdominant");
                }
                else if (function == "iii")
                {
                    chord.type = ChordType::MinorTriad;
                    chord.root = getNoteFromInterval(key, 4); // Major third up
                    chord.functions.add("mediant");
                }
                else if (function == "IV")
                {
                    chord.type = ChordType::MajorTriad;
                    chord.root = getNoteFromInterval(key, 5); // Perfect fourth up
                    chord.functions.add("subdominant");
                }
                else if (function == "V")
                {
                    chord.type = ChordType::Dominant7th;
                    chord.root = getNoteFromInterval(key, 7); // Perfect fifth up
                    chord.functions.add("dominant");
                }
                else if (function == "vi")
                {
                    chord.type = ChordType::MinorTriad;
                    chord.root = getNoteFromInterval(key, 9); // Major sixth up
                    chord.functions.add("submediant");
                }
                else if (function == "VII")
                {
                    chord.type = ChordType::DiminishedTriad;
                    chord.root = getNoteFromInterval(key, 11); // Major seventh up
                    chord.functions.add("leading_tone");
                }
            }
            else // minor scale
            {
                if (function == "i")
                {
                    chord.type = ChordType::MinorTriad;
                    chord.functions.add("tonic");
                }
                else if (function == "ii°")
                {
                    chord.type = ChordType::DiminishedTriad;
                    chord.root = getNoteFromInterval(key, 2);
                    chord.functions.add("subdominant");
                }
                else if (function == "III")
                {
                    chord.type = ChordType::MajorTriad;
                    chord.root = getNoteFromInterval(key, 3);
                    chord.functions.add("mediant");
                }
                else if (function == "iv")
                {
                    chord.type = ChordType::MinorTriad;
                    chord.root = getNoteFromInterval(key, 5);
                    chord.functions.add("subdominant");
                }
                else if (function == "v")
                {
                    chord.type = ChordType::MinorTriad;
                    chord.root = getNoteFromInterval(key, 7);
                    chord.functions.add("dominant");
                }
                else if (function == "VI")
                {
                    chord.type = ChordType::MajorTriad;
                    chord.root = getNoteFromInterval(key, 8);
                    chord.functions.add("submediant");
                }
                else if (function == "VII")
                {
                    chord.type = ChordType::MajorTriad;
                    chord.root = getNoteFromInterval(key, 10);
                    chord.functions.add("subtonic");
                }
            }

            chord.calculateIntervals();
            return chord;
        }

        /** Get note from interval relative to key */
        juce::String getNoteFromInterval(const juce::String& key, int interval)
        {
            juce::String chromaticNotes[] = {"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"};
            int keyIndex = getRootIndex(key, chromaticNotes, 12);
            return chromaticNotes[(keyIndex + interval) % 12];
        }

        /** Get index of root note in chromatic scale */
        int getRootIndex(const juce::String& root, const juce::String notes[], int size)
        {
            for (int i = 0; i < size; ++i)
            {
                if (notes[i].equalsIgnoreCase(root))
                    return i;
            }
            return 0; // Default to C if not found
        }

        /** Generate musical form structure */
        MusicalForm generateFormInternally(FormType type,
                                           const juce::String& key,
                                           const juce::String& scale,
                                           int totalLength)
        {
            MusicalForm form;
            form.type = type;
            form.key = key;
            form.scale = scale;

            switch (type)
            {
                case FormType::Binary:
                    form.name = "Binary Form";
                    form.sections.addArray({"A", "B"});
                    form.sectionLengths.addArray({totalLength / 2, totalLength / 2});
                    break;

                case FormType::Ternary:
                    form.name = "Ternary Form";
                    form.sections.addArray({"A", "B", "A"});
                    if (totalLength >= 32)
                    {
                        form.sectionLengths.addArray({8, 16, 8}); // Standard ABA
                    }
                    else
                    {
                        int aLength = totalLength / 4;
                        int bLength = totalLength / 2;
                        form.sectionLengths.addArray({aLength, bLength, aLength});
                    }
                    break;

                case FormType::Rondo:
                    form.name = "Rondo Form";
                    form.sections.addArray({"A", "B", "A", "C", "A"});
                    int sectionLength = totalLength / 5;
                    form.sectionLengths.addArray({sectionLength, sectionLength, sectionLength, sectionLength, sectionLength});
                    break;

                case FormType::Sonata:
                    form.name = "Sonata Form";
                    form.sections.addArray({"Exposition", "Development", "Recapitulation"});
                    if (totalLength >= 64)
                    {
                        form.sectionLengths.addArray({24, 16, 24}); // Standard sonata proportions
                    }
                    else
                    {
                        form.sectionLengths.addArray({totalLength / 3, totalLength / 6, totalLength / 3});
                    }
                    break;

                case FormType::ThemeAndVariations:
                    form.name = "Theme and Variations";
                    int themeLength = 8;
                    int variationsCount = juce::jmax(1, (totalLength - themeLength) / 8);
                    form.sections.add("Theme");
                    for (int i = 1; i <= variationsCount; ++i)
                        form.sections.add("Variation " + juce::String(i));
                    form.sectionLengths.add(themeLength);
                    for (int i = 0; i < variationsCount; ++i)
                        form.sectionLengths.add(themeLength);
                    break;

                case FormType::Fugue:
                    form.name = "Fugue";
                    form.sections.addArray({"Exposition", "Development", "Entry"});
                    form.sectionLengths.addArray({16, totalLength - 32, 16});
                    break;

                case FormType::SchillingerCustom:
                    form.name = "Schillinger Custom Form";
                    // Generate form based on interference patterns
                    generateSchillingerForm(form, totalLength);
                    break;

                default:
                    form.name = "Simple Form";
                    form.sections.add("A");
                    form.sectionLengths.add(totalLength);
                    break;
            }

            // Add thematic material tracking
            for (int i = 0; i < form.sections.size(); ++i)
            {
                if (i == 0)
                {
                    form.thematicMaterial.add("Primary Theme");
                }
                else if (form.sections[i] == "A" && i > 0)
                {
                    form.thematicMaterial.add("Primary Theme Return");
                }
                else
                {
                    form.thematicMaterial.add("Secondary Material " + juce::String(i));
                }
            }

            form.calculateMetrics();
            return form;
        }

        /** Generate Schillinger-based custom form */
        void generateSchillingerForm(MusicalForm& form, int totalLength)
        {
            // Use interference pattern for section determination
            auto pattern = generateInterferencePattern(3, 2);
            int sectionCount = juce::jmin(5, juce::jmax(3, pattern.size() / 2));

            form.sections.clear();
            form.sectionLengths.clear();

            int remainingLength = totalLength;
            for (int i = 0; i < sectionCount; ++i)
            {
                form.sections.add("Section " + juce::String(char('A' + i)));
                int sectionLength = remainingLength / (sectionCount - i);
                form.sectionLengths.add(sectionLength);
                remainingLength -= sectionLength;
            }

            // Create relationships based on interference
            auto relationships = juce::DynamicObject();
            relationships.setProperty("generators", juce::Array<juce::var>{juce::var(3), juce::var(2)});
            relationships.setProperty("pattern", juce::var(createStringArray(juce::StringArray{"x_x", "_xx"})));
            form.relationships = juce::var(&relationships);
        }

        juce::Array<juce::var> createStringArray(const juce::StringArray& strings)
        {
            juce::Array<juce::var> result;
            for (const auto& str : strings)
                result.add(juce::var(str));
            return result;
        }
    };

    //==============================================================================
    // AdvancedHarmonyAPI implementation
    AdvancedHarmonyAPI::AdvancedHarmonyAPI()
        : pimpl(std::make_unique<Impl>())
    {
    }

    AdvancedHarmonyAPI::~AdvancedHarmonyAPI() = default;

    //==============================================================================
    void AdvancedHarmonyAPI::generateInterferenceChord(int generatorA, int generatorB,
                                                       AsyncCallback<ChordQuality> callback)
    {
        ChordQuality chord;
        auto result = generateInterferenceChordSync(generatorA, generatorB, chord);
        callback(result, chord);
    }

    juce::Result AdvancedHarmonyAPI::generateInterferenceChordSync(int generatorA, int generatorB,
                                                                    ChordQuality& chord)
    {
        if (generatorA <= 0 || generatorB <= 0)
            return juce::Result::fail("Generators must be positive integers");

        auto pattern = pimpl->generateInterferencePattern(generatorA, generatorB);
        auto intervals = pimpl->interferencePatternToIntervals(pattern);
        chord.type = pimpl->determineChordTypeFromIntervals(intervals);
        chord.intervals = intervals;
        chord.root = "C"; // Default root
        chord.key = "C";
        chord.scale = "major";
        chord.calculateIntervals();

        // Add Schillinger-specific metadata
        auto metadata = juce::DynamicObject();
        metadata.setProperty("generators", juce::Array<juce::var>{juce::var(generatorA), juce::var(generatorB)});
        metadata.setProperty("interferencePattern", juce::var(pimpl->createStringArray(
            juce::StringArray::fromTokens(juce::String(intervals.size(), 'x')))));
        chord.analysisData = juce::var(&metadata);

        return juce::Result::ok();
    }

    void AdvancedHarmonyAPI::expandChord(const ChordQuality& baseChord,
                                        const juce::String& expansionType,
                                        AsyncCallback<juce::Array<ChordQuality>> callback)
    {
        juce::Array<ChordQuality> expanded;
        auto result = expandChordSync(baseChord, expansionType, expanded);
        callback(result, expanded);
    }

    juce::Result AdvancedHarmonyAPI::expandChordSync(const ChordQuality& baseChord,
                                                      const juce::String& expansionType,
                                                      juce::Array<ChordQuality>& expanded)
    {
        if (expansionType.isEmpty())
            return juce::Result::fail("Expansion type must be specified");

        expanded = pimpl->expandChordInternally(baseChord, expansionType);
        return juce::Result::ok();
    }

    void AdvancedHarmonyAPI::generateResultantChord(const juce::Array<ChordQuality>& inputChords,
                                                    AsyncCallback<ChordQuality> callback)
    {
        ChordQuality resultant;
        auto result = generateResultantChordSync(inputChords, resultant);
        callback(result, resultant);
    }

    juce::Result AdvancedHarmonyAPI::generateResultantChordSync(const juce::Array<ChordQuality>& inputChords,
                                                                 ChordQuality& resultant)
    {
        if (inputChords.isEmpty())
            return juce::Result::fail("At least one input chord required");

        // Create resultant from interference of input chord intervals
        juce::Array<int> allIntervals;
        for (const auto& chord : inputChords)
        {
            for (int interval : chord.intervals)
            {
                if (!allIntervals.contains(interval))
                    allIntervals.add(interval);
            }
        }

        // Sort intervals
        allIntervals.sort();

        // Determine chord type from combined intervals
        resultant.intervals = allIntervals;
        resultant.type = pimpl->determineChordTypeFromIntervals(allIntervals);
        resultant.root = inputChords[0].root; // Use root of first chord
        resultant.key = inputChords[0].key;
        resultant.scale = inputChords[0].scale;
        resultant.calculateIntervals();

        return juce::Result::ok();
    }

    //==============================================================================
    void AdvancedHarmonyAPI::analyzeProgression(const ChordProgression& progression,
                                                AsyncCallback<juce::var> callback)
    {
        juce::var analysis;
        auto result = analyzeProgressionSync(progression, analysis);
        callback(result, analysis);
    }

    juce::Result AdvancedHarmonyAPI::analyzeProgressionSync(const ChordProgression& progression,
                                                             juce::var& analysis)
    {
        auto analysisObj = juce::DynamicObject();
        analysisObj.setProperty("key", progression.key);
        analysisObj.setProperty("scale", progression.scale);
        analysisObj.setProperty("overallTension", progression.overallTension);
        analysisObj.setProperty("functionalFlow", progression.functionalFlow);
        analysisObj.setProperty("chordCount", progression.chords.size());

        // Analyze chord functions
        juce::Array<juce::String> functionSequence;
        for (const auto& chord : progression.chords)
        {
            for (const auto& func : chord.functions)
                functionSequence.add(func);
        }
        analysisObj.setProperty("functionSequence", juce::var(pimpl->createStringArray(functionSequence)));

        // Generate tension curve
        auto tensionCurve = generateTensionCurve(progression);
        analysisObj.setProperty("tensionCurve", juce::var(pimpl->createStringArray(
            juce::StringArray::fromTokens(juce::String(tensionCurve.size(), 'x')))));

        // Calculate harmonic distances
        juce::Array<juce::var> harmonicDistances;
        for (int i = 1; i < progression.chords.size(); ++i)
        {
            double distance = calculateHarmonicDistance(progression.chords[i-1], progression.chords[i]);
            harmonicDistances.add(juce::var(distance));
        }
        analysisObj.setProperty("harmonicDistances", juce::var(harmonicDistances));

        // Structural analysis
        analysisObj.setProperty("structuralAnalysis", progression.structuralAnalysis);

        analysis = juce::var(&analysisObj);
        return juce::Result::ok();
    }

    void AdvancedHarmonyAPI::generateProgression(const juce::String& key,
                                                const juce::String& scale,
                                                const juce::String& progressionType,
                                                int length,
                                                AsyncCallback<ChordProgression> callback)
    {
        ChordProgression progression;
        auto result = generateProgressionSync(key, scale, progressionType, length, progression);
        callback(result, progression);
    }

    juce::Result AdvancedHarmonyAPI::generateProgressionSync(const juce::String& key,
                                                             const juce::String& scale,
                                                             const juce::String& progressionType,
                                                             int length,
                                                             ChordProgression& progression)
    {
        if (key.isEmpty() || scale.isEmpty() || progressionType.isEmpty() || length <= 0)
            return juce::Result::fail("Invalid parameters for progression generation");

        progression = pimpl->generateProgressionInternally(key, scale, progressionType, length);
        return juce::Result::ok();
    }

    void AdvancedHarmonyAPI::optimizeProgression(ChordProgression& progression,
                                                 double targetTension,
                                                 double targetFlow)
    {
        // Simple optimization by adjusting chord types
        for (auto& chord : progression.chords)
        {
            if (progression.overallTension > targetTension)
            {
                // Reduce tension by using more stable chords
                if (chord.tension > 0.6)
                {
                    chord.type = ChordType::MajorTriad;
                    chord.calculateIntervals();
                }
            }
            else if (progression.overallTension < targetTension)
            {
                // Increase tension by using more complex chords
                if (chord.type == ChordType::MajorTriad)
                {
                    chord.type = ChordType::Dominant7th;
                    chord.calculateIntervals();
                }
            }
        }

        // Re-analyze progression
        progression.analyzeProgression();
    }

    //==============================================================================
    void AdvancedHarmonyAPI::analyzeForm(const MusicalForm& form,
                                         AsyncCallback<juce::var> callback)
    {
        juce::var analysis;
        auto result = analyzeFormSync(form, analysis);
        callback(result, analysis);
    }

    juce::Result AdvancedHarmonyAPI::analyzeFormSync(const MusicalForm& form,
                                                      juce::var& analysis)
    {
        auto validation = form.validate();
        if (!validation.wasOk())
            return validation;

        auto analysisObj = juce::DynamicObject();
        analysisObj.setProperty("formType", static_cast<int>(form.type));
        analysisObj.setProperty("formName", form.name);
        analysisObj.setProperty("key", form.key);
        analysisObj.setProperty("scale", form.scale);
        analysisObj.setProperty("sectionCount", form.sections.size());
        analysisObj.setProperty("totalMeasures", form.sectionLengths.size() > 0 ?
            juce::Array<int>(form.sectionLengths.begin(), form.sectionLengths.end()).sum() : 0);

        // Calculate section proportions
        juce::Array<juce::var> sectionProportions;
        int totalMeasures = juce::Array<int>(form.sectionLengths.begin(), form.sectionLengths.end()).sum();
        for (int length : form.sectionLengths)
        {
            double proportion = static_cast<double>(length) / totalMeasures;
            sectionProportions.add(juce::var(proportion));
        }
        analysisObj.setProperty("sectionProportions", juce::var(sectionProportions));

        analysisObj.setProperty("structuralComplexity", form.structuralComplexity);
        analysisObj.setProperty("thematicMaterialCount", form.thematicMaterial.size());

        // Add form-specific analysis
        if (form.type == FormType::Sonata)
        {
            analysisObj.setProperty("sonataAnalysis", analyzeSonataForm(form));
        }
        else if (form.type == FormType::Fugue)
        {
            analysisObj.setProperty("fugueAnalysis", analyzeFugueForm(form));
        }

        analysisObj.setProperty("formAnalysis", form.analysis);

        analysis = juce::var(&analysisObj);
        return juce::Result::ok();
    }

    void AdvancedHarmonyAPI::generateForm(FormType type,
                                         const juce::String& key,
                                         const juce::String& scale,
                                         int totalLength,
                                         AsyncCallback<MusicalForm> callback)
    {
        MusicalForm form;
        auto result = generateFormSync(type, key, scale, totalLength, form);
        callback(result, form);
    }

    juce::Result AdvancedHarmonyAPI::generateFormSync(FormType type,
                                                       const juce::String& key,
                                                       const juce::String& scale,
                                                       int totalLength,
                                                       MusicalForm& form)
    {
        if (totalLength <= 0)
            return juce::Result::fail("Total length must be positive");

        form = pimpl->generateFormInternally(type, key, scale, totalLength);
        return juce::Result::ok();
    }

    MusicalForm AdvancedHarmonyAPI::manipulateForm(const MusicalForm& form,
                                                    const juce::String& manipulationType)
    {
        MusicalForm manipulated = form;

        if (manipulationType == "retrograde")
        {
            // Reverse the form
            std::reverse(manipulated.sections.begin(), manipulated.sections.end());
            std::reverse(manipulated.sectionLengths.begin(), manipulated.sectionLengths.end());
            std::reverse(manipulated.thematicMaterial.begin(), manipulated.thematicMaterial.end());
            manipulated.name += " (Retrograde)";
        }
        else if (manipulationType == "invert")
        {
            // Mirror the sections around center
            juce::Array<juce::String> invertedSections;
            juce::Array<int> invertedLengths;
            juce::Array<juce::String> invertedThemes;

            for (int i = manipulated.sections.size() - 1; i >= 0; --i)
            {
                invertedSections.add(manipulated.sections[i]);
                invertedLengths.add(manipulated.sectionLengths[i]);
                invertedThemes.add(manipulated.thematicMaterial[i]);
            }

            manipulated.sections = invertedSections;
            manipulated.sectionLengths = invertedLengths;
            manipulated.thematicMaterial = invertedThemes;
            manipulated.name += " (Inverted)";
        }
        else if (manipulationType == "expand")
        {
            // Double the length of each section
            juce::Array<int> expandedLengths;
            for (int length : manipulated.sectionLengths)
                expandedLengths.add(length * 2);
            manipulated.sectionLengths = expandedLengths;
            manipulated.name += " (Expanded)";
        }
        else if (manipulationType == "compress")
        {
            // Halve the length of each section (minimum 1)
            juce::Array<int> compressedLengths;
            for (int length : manipulated.sectionLengths)
                compressedLengths.add(juce::jmax(1, length / 2));
            manipulated.sectionLengths = compressedLengths;
            manipulated.name += " (Compressed)";
        }

        manipulated.calculateMetrics();
        return manipulated;
    }

    //==============================================================================
    void AdvancedHarmonyAPI::analyzeHarmonicField(const ChordProgression& progression,
                                                    AsyncCallback<juce::var> callback)
    {
        juce::var analysis;
        // For simplicity, call the synchronous version
        auto result = juce::Result::ok(); // Placeholder
        callback(result, calculateHarmonicInterference(progression.chords));
    }

    juce::var AdvancedHarmonyAPI::calculateHarmonicInterference(const juce::Array<ChordQuality>& chords)
    {
        auto interference = juce::DynamicObject();
        interference.setProperty("chordCount", chords.size());

        // Calculate overall interference pattern
        juce::Array<int> combinedPattern;
        for (int i = 0; i < 12; ++i)
        {
            combinedPattern.add(0);
        }

        for (const auto& chord : chords)
        {
            for (int interval : chord.intervals)
            {
                if (interval < 12)
                {
                    combinedPattern.set(interval, combinedPattern[interval] + 1);
                }
            }
        }

        interference.setProperty("interferencePattern", juce::var(pimpl->createStringArray(
            juce::StringArray::fromTokens(juce::String(combinedPattern.size(), 'x')))));

        // Calculate interference intensity
        double totalIntensity = 0;
        for (int intensity : combinedPattern)
            totalIntensity += intensity;
        interference.setProperty("interferenceIntensity", totalIntensity);

        return juce::var(&interference);
    }

    juce::Array<double> AdvancedHarmonyAPI::generateTensionCurve(const ChordProgression& progression)
    {
        juce::Array<double> tensionCurve;
        for (const auto& chord : progression.chords)
        {
            tensionCurve.add(chord.tension);
        }
        return tensionCurve;
    }

    juce::var AdvancedHarmonyAPI::analyzeVoiceLeading(const ChordProgression& progression)
    {
        auto analysis = juce::DynamicObject();
        analysis.setProperty("chordCount", progression.chords.size());

        // Calculate voice leading smoothness
        juce::Array<juce::var> voiceLeadingScores;
        for (int i = 1; i < progression.chords.size(); ++i)
        {
            const auto& chord1 = progression.chords[i-1];
            const auto& chord2 = progression.chords[i];

            double score = calculateHarmonicDistance(chord1, chord2);
            voiceLeadingScores.add(juce::var(1.0 - score)); // Inverse: lower distance = better voice leading
        }

        analysis.setProperty("voiceLeadingScores", juce::var(voiceLeadingScores));

        // Calculate overall voice leading quality
        double totalScore = 0;
        for (const auto& score : voiceLeadingScores)
        {
            totalScore += static_cast<double>(score);
        }
        analysis.setProperty("overallVoiceLeadingQuality",
                            voiceLeadingScores.size() > 0 ? totalScore / voiceLeadingScores.size() : 1.0);

        return juce::var(&analysis);
    }

    //==============================================================================
    juce::String AdvancedHarmonyAPI::getChordTypeName(ChordType type)
    {
        switch (type)
        {
            case ChordType::MajorTriad: return "Major Triad";
            case ChordType::MinorTriad: return "Minor Triad";
            case ChordType::DiminishedTriad: return "Diminished Triad";
            case ChordType::AugmentedTriad: return "Augmented Triad";
            case ChordType::Major7th: return "Major 7th";
            case ChordType::Dominant7th: return "Dominant 7th";
            case ChordType::Minor7th: return "Minor 7th";
            case ChordType::HalfDiminished7th: return "Half-Diminished 7th";
            case ChordType::FullyDiminished7th: return "Fully-Diminished 7th";
            case ChordType::Augmented7th: return "Augmented 7th";
            case ChordType::Major9th: return "Major 9th";
            case ChordType::Dominant9th: return "Dominant 9th";
            case ChordType::Minor9th: return "Minor 9th";
            case ChordType::Eleventh: return "Eleventh";
            case ChordType::Thirteenth: return "Thirteenth";
            case ChordType::InterferenceChord: return "Interference Chord";
            case ChordType::ResultantChord: return "Resultant Chord";
            case ChordType::HarmonicFieldChord: return "Harmonic Field Chord";
            case ChordType::PolynomialChord: return "Polynomial Chord";
            case ChordType::Suspended2: return "Suspended 2nd";
            case ChordType::Suspended4: return "Suspended 4th";
            case ChordType::AlteredDominant: return "Altered Dominant";
            case ChordType::Neapolitan: return "Neapolitan";
            default: return "Unknown Chord Type";
        }
    }

    juce::StringArray AdvancedHarmonyAPI::getChordFunctions(const ChordQuality& chord,
                                                           const juce::String& key,
                                                           const juce::String& scale)
    {
        juce::StringArray functions;

        // For now, return existing functions
        // In a full implementation, this would analyze the chord in key context
        functions.addArray(chord.functions);

        return functions;
    }

    double AdvancedHarmonyAPI::calculateHarmonicDistance(const ChordQuality& chord1,
                                                        const ChordQuality& chord2)
    {
        if (chord1.intervals.isEmpty() || chord2.intervals.isEmpty())
            return 1.0;

        // Calculate Euclidean distance between interval vectors
        double distance = 0.0;
        int maxSize = juce::jmax(chord1.intervals.size(), chord2.intervals.size());

        for (int i = 0; i < maxSize; ++i)
        {
            int interval1 = (i < chord1.intervals.size()) ? chord1.intervals[i] : 0;
            int interval2 = (i < chord2.intervals.size()) ? chord2.intervals[i] : 0;
            distance += std::pow(interval1 - interval2, 2);
        }

        distance = std::sqrt(distance) / maxSize;
        return juce::jlimit(0.0, 1.0, distance);
    }

    juce::Result AdvancedHarmonyAPI::validateChordQuality(const ChordQuality& chord)
    {
        if (chord.root.isEmpty())
            return juce::Result::fail("Chord root cannot be empty");

        if (chord.intervals.isEmpty())
            return juce::Result::fail("Chord must have at least one interval");

        if (chord.tension < 0.0 || chord.tension > 1.0)
            return juce::Result::fail("Tension must be between 0.0 and 1.0");

        if (chord.stability < 0.0 || chord.stability > 1.0)
            return juce::Result::fail("Stability must be between 0.0 and 1.0");

        // Check intervals are within reasonable range
        for (int interval : chord.intervals)
        {
            if (interval < 0 || interval > 24) // Allow two octaves
                return juce::Result::fail("Chord intervals must be between 0 and 24 semitones");
        }

        return juce::Result::ok();
    }

    //==============================================================================
    // Private helper methods
    juce::var AdvancedHarmonyAPI::analyzeSonataForm(const MusicalForm& form)
    {
        auto analysis = juce::DynamicObject();

        if (form.sections.size() >= 3)
        {
            analysis.setProperty("expositionLength", form.sectionLengths[0]);
            analysis.setProperty("developmentLength", form.sectionLengths[1]);
            analysis.setProperty("recapitulationLength", form.sectionLengths[2]);
            analysis.setProperty("sonataProportion", "24:16:24");
        }

        return juce::var(&analysis);
    }

    juce::var AdvancedHarmonyAPI::analyzeFugueForm(const MusicalForm& form)
    {
        auto analysis = juce::DynamicObject();

        if (form.sections.size() >= 3)
        {
            analysis.setProperty("expositionLength", form.sectionLengths[0]);
            analysis.setProperty("developmentLength", form.sectionLengths[1]);
            analysis.setProperty("entryLength", form.sectionLengths[2]);
        }

        analysis.setProperty("fugueStructure", "Subject-Countersubject-Episodes");

        return juce::var(&analysis);
    }

} // namespace Schillinger