/*
  ==============================================================================

    RhythmAPI_Enhanced.cpp
    Created: 2 Dec 2025
    Author:  Schillinger System

    Enhanced Rhythm API implementation with Schillinger interference patterns,
    rhythmic fields, and educational features.

  ==============================================================================
*/

#include "../include/RhythmAPI_Enhanced.h"
#include <juce_dsp/juce_dsp.h>
#include <cmath>
#include <algorithm>

namespace Schillinger
{
    //==============================================================================
    // RhythmAPI_Enhanced::Impl
    struct RhythmAPI_Enhanced::Impl
    {
        InterferenceType currentInterferenceType = InterferenceType::Beat;
        RhythmicField currentField;
        SchillingerSDK* sdk;

        explicit Impl(SchillingerSDK* sdkPtr) : sdk(sdkPtr)
        {
            // Initialize with default 2D rhythmic field
            currentField.is3D = false;
            currentField.dimensions = 2;
            currentField.resolution = 16;
        }

        /** Calculate interference pattern using mathematical algorithms */
        juce::Result calculateInterference(int generatorA, int generatorB,
                                         InterferenceType type,
                                         InterferencePattern& result)
        {
            // Validate input parameters
            if (generatorA <= 0 || generatorB <= 0)
                return juce::Result::fail("Generators must be positive integers");

            if (generatorA > 32 || generatorB > 32)
                return juce::Result::fail("Generators must be 32 or less for practical use");

            result.type = type;
            result.generators = {generatorA, generatorB};
            result.rhythmPattern.clear();

            switch (type)
            {
                case InterferenceType::Beat:
                    return calculateBeatInterference(generatorA, generatorB, result);

                case InterferenceType::Swing:
                    return calculateSwingInterference(generatorA, generatorB, result);

                case InterferenceType::Polyrhythmic:
                    return calculatePolyrhythmicInterference(generatorA, generatorB, result);

                case InterferenceType::Canonic:
                    return calculateCanonicInterference(generatorA, generatorB, result);

                case InterferenceType::Custom:
                    return calculateCustomInterference(generatorA, generatorB, result);

                default:
                    return juce::Result::fail("Unknown interference type");
            }
        }

        /** Calculate basic beat interference (Schillinger Book I, Chapter 3) */
        juce::Result calculateBeatInterference(int generatorA, int generatorB,
                                              InterferencePattern& result)
        {
            // Beat interference uses Euclidean algorithm to find common ground
            int lcm = std::lcm(generatorA, generatorB);
            juce::Array<int> pattern;

            // Create interference pattern by aligning generators
            for (int i = 0; i < lcm; ++i)
            {
                bool generatorAActive = (i % generatorA == 0);
                bool generatorBActive = (i % generatorB == 0);

                if (generatorAActive && generatorBActive)
                    pattern.add(1);  // Both generators hit - accent
                else if (generatorAActive || generatorBActive)
                    pattern.add(1);  // Single generator hits
                else
                    pattern.add(0);  // Rest
            }

            // Optimize pattern by grouping consecutive hits and rests
            result.rhythmPattern = optimizePattern(pattern);
            result.confidence = calculateConfidence(result.rhythmPattern, generatorA, generatorB);

            return juce::Result::ok();
        }

        /** Calculate swing interference (2:1 or 3:1 ratios) */
        juce::Result calculateSwingInterference(int generatorA, int generatorB,
                                               InterferencePattern& result)
        {
            // Swing interference typically uses ratios like 2:1 or 3:1
            if (generatorA % generatorB != 0 && generatorB % generatorA != 0)
            {
                // Adjust to nearest swing ratio
                if (generatorA > generatorB)
                    generatorA = (generatorA / generatorB) * generatorB;
                else
                    generatorB = (generatorB / generatorA) * generatorA;
            }

            juce::Array<int> pattern;
            int totalPulses = generatorA + generatorB;

            for (int i = 0; i < totalPulses; ++i)
            {
                // Create swing feel through alternating short and long durations
                if (i % 2 == 0)
                    pattern.add((i < generatorA) ? 2 : 1);  // Long pulse
                else
                    pattern.add((i < generatorA) ? 1 : 0);  // Short pulse or rest
            }

            result.rhythmPattern = optimizePattern(pattern);
            result.generators = {generatorA, generatorB};
            result.confidence = calculateConfidence(result.rhythmPattern, generatorA, generatorB);

            return juce::Result::ok();
        }

        /** Calculate polyrhythmic interference (Book II, Chapter 1) */
        juce::Result calculatePolyrhythmicInterference(int generatorA, int generatorB,
                                                       InterferencePattern& result)
        {
            // Polyrhythmic interference creates complex overlapping patterns
            int lcm = std::lcm(generatorA, generatorB);
            juce::Array<int> pattern;

            for (int i = 0; i < lcm; ++i)
            {
                int generatorAPhase = (i % generatorA);
                int generatorBPhase = (i % generatorB);

                // Calculate interference intensity at this point
                double intensity = 0.0;

                if (generatorAPhase == 0) intensity += 1.0;
                if (generatorBPhase == 0) intensity += 1.0;

                // Add phase-based modulation for polyrhythmic complexity
                double phaseModulation = std::sin(2.0 * juce::MathConstants<double>::pi *
                                                 generatorAPhase / generatorA) *
                                        std::cos(2.0 * juce::MathConstants<double>::pi *
                                                 generatorBPhase / generatorB);

                intensity += 0.3 * phaseModulation;

                // Convert intensity to rhythm value
                int rhythmValue = static_cast<int>(std::round(intensity));
                rhythmValue = juce::jlimit(0, 3, rhythmValue); // Limit to 0-3
                pattern.add(rhythmValue);
            }

            result.rhythmPattern = optimizePattern(pattern);
            result.confidence = calculateConfidence(result.rhythmPattern, generatorA, generatorB);

            return juce::Result::ok();
        }

        /** Calculate canonic interference (Book IV, Chapter 2) */
        juce::Result calculateCanonicInterference(int generatorA, int generatorB,
                                                 InterferencePattern& result)
        {
            // Canonic interference creates imitation patterns
            juce::Array<int> pattern;
            int patternLength = generatorA * 2; // Double the generator for canon

            for (int i = 0; i < patternLength; ++i)
            {
                int generatorAPhase = i % generatorA;
                int generatorBPhase = (i + generatorA/2) % generatorB; // Offset for imitation

                bool generatorAActive = (generatorAPhase == 0);
                bool generatorBActive = (generatorBPhase == 0);

                if (generatorAActive && generatorBActive)
                    pattern.add(2);  // Canon hits - strong accent
                else if (generatorAActive)
                    pattern.add(1);  // Leader hits
                else if (generatorBActive)
                    pattern.add(1);  // Follower hits
                else
                    pattern.add(0);  // Rest
            }

            result.rhythmPattern = optimizePattern(pattern);
            result.confidence = calculateConfidence(result.rhythmPattern, generatorA, generatorB);

            return juce::Result::ok();
        }

        /** Calculate custom interference with user-defined parameters */
        juce::Result calculateCustomInterference(int generatorA, int generatorB,
                                                InterferencePattern& result)
        {
            // Custom interference uses current field parameters
            juce::Array<int> pattern;
            int totalSteps = std::lcm(generatorA, generatorB);

            for (int i = 0; i < totalSteps; ++i)
            {
                double phaseA = 2.0 * juce::MathConstants<double>::pi * i / generatorA;
                double phaseB = 2.0 * juce::MathConstants<double>::pi * i / generatorB;

                // Apply field modulation
                double waveA = std::sin(phaseA + currentField.phaseOffset);
                double waveB = std::sin(phaseB);

                // Calculate interference with frequency ratio
                double interference = waveA * waveB * currentField.frequencyRatio;
                interference += currentField.modulationDepth * std::sin(phaseA + phaseB);

                // Convert to rhythm value
                int rhythmValue = static_cast<int>(std::round(interference + 1.0));
                rhythmValue = juce::jlimit(0, 2, rhythmValue);
                pattern.add(rhythmValue);
            }

            result.rhythmPattern = optimizePattern(pattern);
            result.confidence = calculateConfidence(result.rhythmPattern, generatorA, generatorB);

            return juce::Result::ok();
        }

        /** Create 2D rhythmic field from generators */
        void createRhythmicField2D(int generatorA, int generatorB, int resolution,
                                   RhythmicField& field)
        {
            field.is3D = false;
            field.dimensions = 2;
            field.resolution = resolution;
            field.points2D.clear();

            for (int x = 0; x < resolution; ++x)
            {
                for (int y = 0; y < resolution; ++y)
                {
                    float xNorm = static_cast<float>(x) / (resolution - 1);
                    float yNorm = static_cast<float>(y) / (resolution - 1);

                    // Calculate field intensity using generator interference
                    double phaseX = 2.0 * juce::MathConstants<double>::pi * xNorm * generatorA;
                    double phaseY = 2.0 * juce::MathConstants<double>::pi * yNorm * generatorB;

                    double intensity = std::sin(phaseX) * std::cos(phaseY);
                    intensity = (intensity + 1.0) / 2.0; // Normalize to 0-1

                    RhythmicFieldPoint2D point;
                    point.x = xNorm;
                    point.y = yNorm;
                    point.intensity = static_cast<float>(intensity);
                    point.subdivision = resolution;

                    field.points2D.add(point);
                }
            }
        }

        /** Create 3D rhythmic field with harmonic content */
        void createRhythmicField3D(int generatorA, int generatorB, int resolution,
                                   RhythmicField& field)
        {
            field.is3D = true;
            field.dimensions = 3;
            field.resolution = resolution;
            field.points3D.clear();

            for (int x = 0; x < resolution; ++x)
            {
                for (int y = 0; y < resolution; ++y)
                {
                    for (int z = 0; z < resolution; ++z)
                    {
                        float xNorm = static_cast<float>(x) / (resolution - 1);
                        float yNorm = static_cast<float>(y) / (resolution - 1);
                        float zNorm = static_cast<float>(z) / (resolution - 1);

                        // Calculate 3D interference with harmonic content
                        double phaseX = 2.0 * juce::MathConstants<double>::pi * xNorm * generatorA;
                        double phaseY = 2.0 * juce::MathConstants<double>::pi * yNorm * generatorB;
                        double phaseZ = 2.0 * juce::MathConstants<double>::pi * zNorm *
                                      std::sqrt(generatorA * generatorB); // Harmonic relation

                        double intensity = std::sin(phaseX) * std::cos(phaseY) * std::sin(phaseZ);
                        intensity = (intensity + 1.0) / 2.0; // Normalize to 0-1

                        RhythmicFieldPoint3D point;
                        point.x = xNorm;
                        point.y = yNorm;
                        point.z = zNorm; // Represents harmonic content
                        point.intensity = static_cast<float>(intensity);
                        point.subdivision = resolution;

                        field.points3D.add(point);
                    }
                }
            }
        }

        /** Calculate confidence score for pattern validation */
        double calculateConfidence(const juce::Array<int>& pattern, int generatorA, int generatorB)
        {
            if (pattern.isEmpty())
                return 0.0;

            // Calculate mathematical confidence based on generator alignment
            int hits = 0;
            int total = pattern.size();

            for (int value : pattern)
                if (value > 0) hits++;

            double hitRatio = static_cast<double>(hits) / total;

            // Check if pattern aligns with generators
            int generatorAlignment = 0;
            int lcm = std::lcm(generatorA, generatorB);

            for (int i = 0; i < juce::jmin(total, lcm); ++i)
            {
                if ((i % generatorA == 0 || i % generatorB == 0) &&
                    (i < pattern.size() && pattern[i] > 0))
                    generatorAlignment++;
            }

            double alignmentRatio = static_cast<double>(generatorAlignment) /
                                   std::min(lcm, total);

            return (hitRatio + alignmentRatio) / 2.0;
        }

        /** Optimize pattern by grouping consecutive values */
        juce::Array<int> optimizePattern(const juce::Array<int>& rawPattern)
        {
            juce::Array<int> optimized;
            if (rawPattern.isEmpty())
                return optimized;

            int currentValue = rawPattern[0];
            int count = 1;

            for (int i = 1; i < rawPattern.size(); ++i)
            {
                if (rawPattern[i] == currentValue && count < 16) // Limit grouping
                {
                    count++;
                }
                else
                {
                    optimized.add(currentValue * count);
                    currentValue = rawPattern[i];
                    count = 1;
                }
            }
            optimized.add(currentValue * count);

            return optimized;
        }
    };

    //==============================================================================
    // RhythmAPI_Enhanced implementation
    RhythmAPI_Enhanced::RhythmAPI_Enhanced(SchillingerSDK* sdk)
        : RhythmAPI(sdk), pimpl(std::make_unique<Impl>(sdk))
    {
    }

    RhythmAPI_Enhanced::~RhythmAPI_Enhanced() = default;

    //==============================================================================
    void RhythmAPI_Enhanced::setInterferenceType(InterferenceType type,
                                                 AsyncCallback<juce::Result> callback)
    {
        auto result = setInterferenceTypeSync(type);
        callback(result, juce::Result::ok());
    }

    juce::Result RhythmAPI_Enhanced::setInterferenceTypeSync(InterferenceType type)
    {
        pimpl->currentInterferenceType = type;
        return juce::Result::ok();
    }

    //==============================================================================
    void RhythmAPI_Enhanced::setRhythmicField(const RhythmicField& field,
                                             AsyncCallback<RhythmPattern> callback)
    {
        RhythmPattern result;
        auto validationResult = setRhythmicFieldSync(field, result);
        callback(validationResult, result);
    }

    juce::Result RhythmAPI_Enhanced::setRhythmicFieldSync(const RhythmicField& field,
                                                         RhythmPattern& result)
    {
        auto validationResult = field.validate();
        if (!validationResult.wasOk())
            return validationResult;

        pimpl->currentField = field;

        // Generate pattern from field
        InterferencePattern interference;
        auto calculationResult = pimpl->calculateInterference(
            3, 2, // Default generators
            field.is3D ? InterferenceType::Polyrhythmic : InterferenceType::Beat,
            interference
        );

        if (!calculationResult.wasOk())
            return calculationResult;

        result = interferenceToRhythmPattern(interference);
        return juce::Result::ok();
    }

    //==============================================================================
    void RhythmAPI_Enhanced::generateInterferencePattern(int generatorA, int generatorB,
                                                       InterferenceType type,
                                                       AsyncCallback<InterferencePattern> callback)
    {
        InterferencePattern result;
        auto calculationResult = generateInterferencePatternSync(generatorA, generatorB, type, result);
        callback(calculationResult, result);
    }

    juce::Result RhythmAPI_Enhanced::generateInterferencePatternSync(int generatorA, int generatorB,
                                                                     InterferenceType type,
                                                                     InterferencePattern& result)
    {
        return pimpl->calculateInterference(generatorA, generatorB, type, result);
    }

    //==============================================================================
    void RhythmAPI_Enhanced::createRhythmicField2D(int generatorA, int generatorB,
                                                  int resolution,
                                                  AsyncCallback<RhythmicField> callback)
    {
        RhythmicField result;
        auto creationResult = createRhythmicField2DSync(generatorA, generatorB, resolution, result);
        callback(creationResult, result);
    }

    juce::Result RhythmAPI_Enhanced::createRhythmicField2DSync(int generatorA, int generatorB,
                                                               int resolution,
                                                               RhythmicField& result)
    {
        if (resolution <= 0 || resolution > 256)
            return juce::Result::fail("Resolution must be between 1 and 256");

        pimpl->createRhythmicField2D(generatorA, generatorB, resolution, result);
        return juce::Result::ok();
    }

    //==============================================================================
    void RhythmAPI_Enhanced::createRhythmicField3D(int generatorA, int generatorB,
                                                  int resolution,
                                                  AsyncCallback<RhythmicField> callback)
    {
        RhythmicField result;
        auto creationResult = createRhythmicField3DSync(generatorA, generatorB, resolution, result);
        callback(creationResult, result);
    }

    juce::Result RhythmAPI_Enhanced::createRhythmicField3DSync(int generatorA, int generatorB,
                                                               int resolution,
                                                               RhythmicField& result)
    {
        if (resolution <= 0 || resolution > 64) // Lower limit for 3D due to memory
            return juce::Result::fail("Resolution must be between 1 and 64 for 3D fields");

        pimpl->createRhythmicField3D(generatorA, generatorB, resolution, result);
        return juce::Result::ok();
    }

    //==============================================================================
    void RhythmAPI_Enhanced::calculateFieldInterference(const RhythmicField& field,
                                                       AsyncCallback<InterferencePattern> callback)
    {
        InterferencePattern result;
        auto calculationResult = calculateFieldInterferenceSync(field, result);
        callback(calculationResult, result);
    }

    juce::Result RhythmAPI_Enhanced::calculateFieldInterferenceSync(const RhythmicField& field,
                                                                    InterferencePattern& result)
    {
        auto validationResult = field.validate();
        if (!validationResult.wasOk())
            return validationResult;

        // Use field parameters for custom interference calculation
        pimpl->currentField = field;
        return pimpl->calculateInterference(
            static_cast<int>(field.frequencyRatio * 3), // Derive generators from field
            static_cast<int>(field.frequencyRatio * 2),
            InterferenceType::Custom,
            result
        );
    }

    //==============================================================================
    void RhythmAPI_Enhanced::getInterferenceExplanation(InterferenceType type,
                                                       AsyncCallback<juce::String> callback)
    {
        juce::String explanation;
        auto result = getInterferenceExplanationSync(type, explanation);
        callback(result, explanation);
    }

    juce::Result RhythmAPI_Enhanced::getInterferenceExplanationSync(InterferenceType type,
                                                                  juce::String& explanation)
    {
        switch (type)
        {
            case InterferenceType::Beat:
                explanation = "Beat interference creates patterns through the alignment of two "
                             "basic rhythmic generators. Based on Schillinger Book I, Chapter 3, "
                             "it uses the Euclidean algorithm to find common ground between "
                             "generators, resulting in fundamental rhythmic structures that form "
                             "the foundation of most musical patterns.";
                break;

            case InterferenceType::Swing:
                explanation = "Swing interference creates the characteristic swing feel through "
                             "asymmetric ratios (typically 2:1 or 3:1). Derived from Schillinger's "
                             "rhythm balance theory, it generates alternating short and long "
                             "durations that create forward momentum and danceable grooves.";
                break;

            case InterferenceType::Polyrhythmic:
                explanation = "Polyrhythmic interference combines different time divisions to "
                             "create complex, overlapping patterns. Following Schillinger Book II, "
                             "Chapter 1, it uses mathematical interference between generator "
                             "phases to produce sophisticated rhythmic textures common in "
                             "African and Latin American music.";
                break;

            case InterferenceType::Canonic:
                explanation = "Canonic interference implements imitation patterns where one "
                             "rhythmic generator follows another at a fixed interval. Based on "
                             "Schillinger Book IV, Chapter 2, it creates canon-like structures "
                             "that provide compositional development through rhythmic dialogue.";
                break;

            case InterferenceType::Custom:
                explanation = "Custom interference allows user-defined parameters to create "
                             "unique rhythmic patterns. Using the rhythmic field system, it "
                             "applies frequency ratios, phase offsets, and modulation depth "
                             "to generate personalized interference patterns for creative "
                             "composition.";
                break;

            default:
                return juce::Result::fail("Unknown interference type");
        }

        return juce::Result::ok();
    }

    //==============================================================================
    void RhythmAPI_Enhanced::generateInterferenceExample(InterferenceType type,
                                                        int generatorA, int generatorB,
                                                        AsyncCallback<juce::var> callback)
    {
        juce::var example;
        auto result = generateInterferenceExampleSync(type, generatorA, generatorB, example);
        callback(result, example);
    }

    juce::Result RhythmAPI_Enhanced::generateInterferenceExampleSync(InterferenceType type,
                                                                     int generatorA, int generatorB,
                                                                     juce::var& example)
    {
        InterferencePattern pattern;
        auto calculationResult = generateInterferencePatternSync(generatorA, generatorB, type, pattern);
        if (!calculationResult.wasOk())
            return calculationResult;

        auto exampleJson = new juce::DynamicObject();
        exampleJson->setProperty("generators", juce::var(juce::Array<juce::var>{
            juce::var(generatorA),
            juce::var(generatorB)
        }));
        exampleJson->setProperty("interferenceType", static_cast<int>(type));
        exampleJson->setProperty("pattern", pattern.toJson());

        // Add visualization data
        auto visualizationJson = new juce::DynamicObject();
        visualizationJson->setProperty("type", "bar_chart");
        visualizationJson->setProperty("data", juce::var(pattern.rhythmPattern));
        exampleJson->setProperty("visualization", juce::var(visualizationJson));

        example = juce::var(exampleJson);
        return juce::Result::ok();
    }

    //==============================================================================
    juce::Result RhythmAPI_Enhanced::validateInterferenceParams(int generatorA, int generatorB,
                                                               InterferenceType type)
    {
        if (generatorA <= 0 || generatorB <= 0)
            return juce::Result::fail("Generators must be positive integers");

        if (generatorA > 32 || generatorB > 32)
            return juce::Result::fail("Generators must be 32 or less for practical use");

        if (type == InterferenceType::Swing)
        {
            // Swing works best with simple ratios
            if (generatorA % generatorB != 0 && generatorB % generatorA != 0)
                return juce::Result::fail("Swing interference works best with integer ratios");
        }

        return juce::Result::ok();
    }

    //==============================================================================
    void RhythmAPI_Enhanced::analyzeRhythmicField(const RhythmicField& field,
                                                 AsyncCallback<juce::var> callback)
    {
        juce::var analysis;
        auto result = analyzeRhythmicFieldSync(field, analysis);
        callback(result, analysis);
    }

    juce::Result RhythmAPI_Enhanced::analyzeRhythmicFieldSync(const RhythmicField& field,
                                                              juce::var& analysis)
    {
        auto validationResult = field.validate();
        if (!validationResult.wasOk())
            return validationResult;

        auto analysisJson = new juce::DynamicObject();

        // Calculate field statistics
        int totalPoints = field.is3D ? field.points3D.size() : field.points2D.size();
        double totalIntensity = 0.0;
        double maxIntensity = 0.0;
        double minIntensity = 1.0;

        if (field.is3D)
        {
            for (const auto& point : field.points3D)
            {
                totalIntensity += point.intensity;
                maxIntensity = juce::jmax(maxIntensity, static_cast<double>(point.intensity));
                minIntensity = juce::jmin(minIntensity, static_cast<double>(point.intensity));
            }
        }
        else
        {
            for (const auto& point : field.points2D)
            {
                totalIntensity += point.intensity;
                maxIntensity = juce::jmax(maxIntensity, static_cast<double>(point.intensity));
                minIntensity = juce::jmin(minIntensity, static_cast<double>(point.intensity));
            }
        }

        analysisJson->setProperty("totalPoints", totalPoints);
        analysisJson->setProperty("averageIntensity", totalIntensity / totalPoints);
        analysisJson->setProperty("maxIntensity", maxIntensity);
        analysisJson->setProperty("minIntensity", minIntensity);
        analysisJson->setProperty("fieldType", field.is3D ? "3D" : "2D");
        analysisJson->setProperty("resolution", field.resolution);

        analysis = juce::var(analysisJson);
        return juce::Result::ok();
    }

    //==============================================================================
    RhythmPattern RhythmAPI_Enhanced::interferenceToRhythmPattern(const InterferencePattern& pattern)
    {
        RhythmPattern rhythmResult;

        // Convert interference pattern to standard rhythm pattern
        for (int value : pattern.rhythmPattern)
        {
            if (value > 0)
                rhythmResult.durations.add(value);
        }

        // Set default parameters
        rhythmResult.timeSignature = {4, 4};
        rhythmResult.tempo = 120;
        rhythmResult.swing = 0.0;

        return rhythmResult;
    }

} // namespace Schillinger