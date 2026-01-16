/*
  ==============================================================================

    RhythmAPI_Enhanced.h
    Created: 2 Dec 2025
    Author:  Schillinger System

    Enhanced Rhythm API with missing core functions for interference patterns,
    rhythmic fields, and advanced Schillinger rhythm operations.

  ==============================================================================
*/

#pragma once

#include "RhythmAPI.h"
#include <juce_core/juce_core.h>
#include <juce_dsp/juce_dsp.h>

namespace Schillinger
{
    //==============================================================================
    /** Interference pattern types for Schillinger rhythm generation */
    enum class InterferenceType : uint8_t
    {
        Beat = 0,           // Simple beat interference (1:1 ratio)
        Swing = 1,          // Swing interference (2:1 or 3:1 ratio)
        Polyrhythmic = 2,   // Complex polyrhythmic interference
        Canonic = 3,        // Canonic imitation interference
        Custom = 4          // User-defined interference pattern
    };

    //==============================================================================
    /** 2D Rhythmic Field coordinates for spatial rhythm representation */
    struct RhythmicFieldPoint2D
    {
        float x = 0.0f;     // Horizontal position (0.0-1.0)
        float y = 0.0f;     // Vertical position (0.0-1.0)
        float intensity = 1.0f; // Intensity at this point
        int subdivision = 8;    // Subdivision resolution

        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("x", x);
            json->setProperty("y", y);
            json->setProperty("intensity", intensity);
            json->setProperty("subdivision", subdivision);
            return juce::var(json);
        }

        static RhythmicFieldPoint2D fromJson(const juce::var& json)
        {
            RhythmicFieldPoint2D point;
            point.x = static_cast<float>(json.getProperty("x", 0.0));
            point.y = static_cast<float>(json.getProperty("y", 0.0));
            point.intensity = static_cast<float>(json.getProperty("intensity", 1.0));
            point.subdivision = static_cast<int>(json.getProperty("subdivision", 8));
            return point;
        }
    };

    //==============================================================================
    /** 3D Rhythmic Field coordinates with depth axis for complex patterns */
    struct RhythmicFieldPoint3D
    {
        float x = 0.0f;     // Horizontal position (0.0-1.0)
        float y = 0.0f;     // Vertical position (0.0-1.0)
        float z = 0.0f;     // Depth position (0.0-1.0) - represents harmonic content
        float intensity = 1.0f; // Intensity at this point
        int subdivision = 8;    // Subdivision resolution

        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("x", x);
            json->setProperty("y", y);
            json->setProperty("z", z);
            json->setProperty("intensity", intensity);
            json->setProperty("subdivision", subdivision);
            return juce::var(json);
        }

        static RhythmicFieldPoint3D fromJson(const juce::var& json)
        {
            RhythmicFieldPoint3D point;
            point.x = static_cast<float>(json.getProperty("x", 0.0));
            point.y = static_cast<float>(json.getProperty("y", 0.0));
            point.z = static_cast<float>(json.getProperty("z", 0.0));
            point.intensity = static_cast<float>(json.getProperty("intensity", 1.0));
            point.subdivision = static_cast<int>(json.getProperty("subdivision", 8));
            return point;
        }
    };

    //==============================================================================
    /** Rhythmic Field class for advanced spatial rhythm generation */
    struct RhythmicField
    {
        bool is3D = false;  // Whether this is a 3D field
        int dimensions = 2; // Field dimensions (2 or 3)
        int resolution = 16; // Grid resolution for the field
        juce::Array<RhythmicFieldPoint2D> points2D;  // 2D field points
        juce::Array<RhythmicFieldPoint3D> points3D;  // 3D field points

        // Field parameters for interference calculation
        double frequencyRatio = 1.5;  // Frequency ratio for interference
        double phaseOffset = 0.0;     // Phase offset for patterns
        double modulationDepth = 0.5; // Modulation depth

        /** Convert to JSON representation */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();
            json->setProperty("is3D", is3D);
            json->setProperty("dimensions", dimensions);
            json->setProperty("resolution", resolution);
            json->setProperty("frequencyRatio", frequencyRatio);
            json->setProperty("phaseOffset", phaseOffset);
            json->setProperty("modulationDepth", modulationDepth);

            // Convert points
            auto points2DArray = new juce::Array<juce::var>();
            for (const auto& point : points2D)
                points2DArray->add(point.toJson());
            json->setProperty("points2D", juce::var(points2DArray));

            auto points3DArray = new juce::Array<juce::var>();
            for (const auto& point : points3D)
                points3DArray->add(point.toJson());
            json->setProperty("points3D", juce::var(points3DArray));

            return juce::var(json);
        }

        /** Create from JSON representation */
        static RhythmicField fromJson(const juce::var& json)
        {
            RhythmicField field;
            field.is3D = json.getProperty("is3D", false);
            field.dimensions = json.getProperty("dimensions", 2);
            field.resolution = json.getProperty("resolution", 16);
            field.frequencyRatio = json.getProperty("frequencyRatio", 1.5);
            field.phaseOffset = json.getProperty("phaseOffset", 0.0);
            field.modulationDepth = json.getProperty("modulationDepth", 0.5);

            // Parse 2D points
            if (json.hasProperty("points2D"))
            {
                auto points2DArray = json["points2D"].getArray();
                if (points2DArray != nullptr)
                {
                    for (const auto& pointJson : *points2DArray)
                        field.points2D.add(RhythmicFieldPoint2D::fromJson(pointJson));
                }
            }

            // Parse 3D points
            if (json.hasProperty("points3D"))
            {
                auto points3DArray = json["points3D"].getArray();
                if (points3DArray != nullptr)
                {
                    for (const auto& pointJson : *points3DArray)
                        field.points3D.add(RhythmicFieldPoint3D::fromJson(pointJson));
                }
            }

            return field;
        }

        /** Validate the rhythmic field data */
        juce::Result validate() const
        {
            if (resolution <= 0 || resolution > 256)
                return juce::Result::fail("Resolution must be between 1 and 256");

            if (frequencyRatio <= 0.0 || frequencyRatio > 100.0)
                return juce::Result::fail("Frequency ratio must be between 0.0 and 100.0");

            if (phaseOffset < 0.0 || phaseOffset > juce::MathConstants<double>::twoPi)
                return juce::Result::fail("Phase offset must be between 0.0 and 2π");

            if (modulationDepth < 0.0 || modulationDepth > 1.0)
                return juce::Result::fail("Modulation depth must be between 0.0 and 1.0");

            if (is3D && points3D.isEmpty())
                return juce::Result::fail("3D field must have at least one 3D point");

            if (!is3D && points2D.isEmpty())
                return juce::Result::fail("2D field must have at least one 2D point");

            return juce::Result::ok();
        }
    };

    //==============================================================================
    /** Resultant pattern from interference calculation */
    struct InterferencePattern
    {
        juce::Array<int> rhythmPattern;    // Resulting rhythm durations
        InterferenceType type = InterferenceType::Beat;
        std::pair<int, int> generators {3, 2}; // Generator ratios
        double confidence = 1.0;         // Pattern confidence score
        juce::var metadata;              // Additional pattern data

        /** Convert to JSON representation */
        juce::var toJson() const
        {
            auto json = new juce::DynamicObject();

            auto rhythmArray = new juce::Array<juce::var>();
            for (int duration : rhythmPattern)
                rhythmArray->add(duration);
            json->setProperty("rhythmPattern", juce::var(rhythmArray));

            json->setProperty("type", static_cast<int>(type));
            json->setProperty("generators", juce::var(juce::Array<juce::var>{
                juce::var(generators.first),
                juce::var(generators.second)
            }));
            json->setProperty("confidence", confidence);
            json->setProperty("metadata", metadata);

            return juce::var(json);
        }

        /** Create from JSON representation */
        static InterferencePattern fromJson(const juce::var& json)
        {
            InterferencePattern pattern;

            if (json.hasProperty("rhythmPattern"))
            {
                auto rhythmArray = json["rhythmPattern"].getArray();
                if (rhythmArray != nullptr)
                {
                    for (const auto& duration : *rhythmArray)
                        pattern.rhythmPattern.add(static_cast<int>(duration));
                }
            }

            pattern.type = static_cast<InterferenceType>(
                static_cast<int>(json.getProperty("type", 0))
            );

            if (json.hasProperty("generators"))
            {
                auto genArray = json["generators"].getArray();
                if (genArray != nullptr && genArray->size() >= 2)
                {
                    pattern.generators.first = static_cast<int>((*genArray)[0]);
                    pattern.generators.second = static_cast<int>((*genArray)[1]);
                }
            }

            pattern.confidence = json.getProperty("confidence", 1.0);
            pattern.metadata = json.getProperty("metadata", juce::var());

            return pattern;
        }
    };

    //==============================================================================
    /**
        Enhanced Rhythm API extending the base RhythmAPI with advanced Schillinger
        interference patterns, rhythmic fields, and educational features.
    */
    class RhythmAPI_Enhanced : public RhythmAPI
    {
    public:
        //==============================================================================
        /** Constructor */
        explicit RhythmAPI_Enhanced(SchillingerSDK* sdk);

        /** Destructor */
        ~RhythmAPI_Enhanced();

        //==============================================================================
        // PHASE 1.1: CORE RHYTHM FUNCTIONS

        /** Set interference type for rhythm generation */
        void setInterferenceType(InterferenceType type,
                                AsyncCallback<juce::Result> callback);

        /** Synchronous version of setInterferenceType */
        juce::Result setInterferenceTypeSync(InterferenceType type);

        /** Set rhythmic field for advanced rhythm generation */
        void setRhythmicField(const RhythmicField& field,
                             AsyncCallback<RhythmPattern> callback);

        /** Synchronous version of setRhythmicField */
        juce::Result setRhythmicFieldSync(const RhythmicField& field,
                                         RhythmPattern& result);

        /** Generate interference pattern from generators */
        void generateInterferencePattern(int generatorA, int generatorB,
                                       InterferenceType type,
                                       AsyncCallback<InterferencePattern> callback);

        /** Synchronous version of generateInterferencePattern */
        juce::Result generateInterferencePatternSync(int generatorA, int generatorB,
                                                     InterferenceType type,
                                                     InterferencePattern& result);

        //==============================================================================
        // PHASE 1.2: RHYTHMIC FIELD OPERATIONS

        /** Create 2D rhythmic field from generators */
        void createRhythmicField2D(int generatorA, int generatorB,
                                  int resolution,
                                  AsyncCallback<RhythmicField> callback);

        /** Synchronous version of createRhythmicField2D */
        juce::Result createRhythmicField2DSync(int generatorA, int generatorB,
                                               int resolution,
                                               RhythmicField& result);

        /** Create 3D rhythmic field with harmonic content */
        void createRhythmicField3D(int generatorA, int generatorB,
                                  int resolution,
                                  AsyncCallback<RhythmicField> callback);

        /** Synchronous version of createRhythmicField3D */
        juce::Result createRhythmicField3DSync(int generatorA, int generatorB,
                                               int resolution,
                                               RhythmicField& result);

        /** Calculate interference from rhythmic field */
        void calculateFieldInterference(const RhythmicField& field,
                                      AsyncCallback<InterferencePattern> callback);

        /** Synchronous version of calculateFieldInterference */
        juce::Result calculateFieldInterferenceSync(const RhythmicField& field,
                                                    InterferencePattern& result);

        //==============================================================================
        // PHASE 1.3: EDUCATIONAL INTEGRATION

        /** Get educational explanation for interference type */
        void getInterferenceExplanation(InterferenceType type,
                                      AsyncCallback<juce::String> callback);

        /** Synchronous version of getInterferenceExplanation */
        juce::Result getInterferenceExplanationSync(InterferenceType type,
                                                   juce::String& explanation);

        /** Generate interactive example for interference pattern */
        void generateInterferenceExample(InterferenceType type,
                                        int generatorA, int generatorB,
                                        AsyncCallback<juce::var> callback);

        /** Synchronous version of generateInterferenceExample */
        juce::Result generateInterferenceExampleSync(InterferenceType type,
                                                     int generatorA, int generatorB,
                                                     juce::var& example);

        //==============================================================================
        // PHASE 1.4: VALIDATION AND ANALYSIS

        /** Validate interference pattern parameters */
        static juce::Result validateInterferenceParams(int generatorA, int generatorB,
                                                      InterferenceType type);

        /** Analyze rhythmic field properties */
        void analyzeRhythmicField(const RhythmicField& field,
                                 AsyncCallback<juce::var> callback);

        /** Synchronous version of analyzeRhythmicField */
        juce::Result analyzeRhythmicFieldSync(const RhythmicField& field,
                                              juce::var& analysis);

        /** Convert interference pattern to standard RhythmPattern */
        static RhythmPattern interferenceToRhythmPattern(const InterferencePattern& pattern);

    private:
        //==============================================================================
        struct Impl;
        std::unique_ptr<Impl> pimpl;

        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RhythmAPI_Enhanced)
    };

} // namespace Schillinger