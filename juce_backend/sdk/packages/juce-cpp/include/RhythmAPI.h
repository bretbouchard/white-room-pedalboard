/*
  ==============================================================================

    RhythmAPI.h
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#pragma once

#include "SchillingerSDK.h"
#include <juce_core/juce_core.h>

namespace Schillinger
{
    //==============================================================================
    /** Parameters for rhythm generation */
    struct RhythmGenerationParams
    {
        int generatorA = 3;
        int generatorB = 2;
        juce::String variationType = "basic";
        int length = 8;
        juce::var options;
        
        /** Validate parameters */
        juce::Result validate() const;
        
        /** Convert to JSON */
        juce::var toJson() const;
    };

    //==============================================================================
    /** Results from generator inference */
    struct GeneratorInference
    {
        juce::Array<std::pair<int, int>> possibleGenerators;
        juce::Array<double> confidenceScores;
        juce::String bestMatch;
        juce::var metadata;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static GeneratorInference fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Schillinger encoding results */
    struct SchillingerEncoding
    {
        juce::var parameters;
        double confidence = 0.0;
        juce::StringArray alternatives;
        juce::var metadata;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static SchillingerEncoding fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Pattern matching results */
    struct SchillingerMatch
    {
        RhythmPattern pattern;
        double similarity = 0.0;
        juce::String matchType;
        juce::var parameters;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static SchillingerMatch fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Options for pattern fitting */
    struct FitOptions
    {
        double toleranceThreshold = 0.8;
        int maxResults = 10;
        bool includeVariations = true;
        juce::StringArray allowedVariationTypes;
        
        /** Convert to JSON */
        juce::var toJson() const;
    };

    //==============================================================================
    /**
        Rhythm API providing access to Schillinger rhythm generation and analysis.
        
        This class provides both forward generation (creating patterns from generators)
        and reverse analysis (inferring generators from existing patterns).
    */
    class RhythmAPI
    {
    public:
        //==============================================================================
        /** Constructor */
        explicit RhythmAPI(SchillingerSDK* sdk);
        
        /** Destructor */
        ~RhythmAPI();

        //==============================================================================
        /** Generate a rhythmic resultant from two generators */
        void generateResultant(int generatorA, int generatorB, 
                              AsyncCallback<RhythmPattern> callback);
        
        /** Generate a variation of an existing pattern */
        void generateVariation(const RhythmPattern& pattern, 
                              const juce::String& variationType,
                              AsyncCallback<RhythmPattern> callback);
        
        /** Generate complex rhythm patterns */
        void generateComplex(const RhythmGenerationParams& params,
                            AsyncCallback<RhythmPattern> callback);
        
        /** Analyze a rhythm pattern */
        void analyzePattern(const RhythmPattern& pattern,
                           AsyncCallback<RhythmAnalysis> callback);

        //==============================================================================
        /** Infer possible generators from a rhythm pattern */
        void inferGenerators(const RhythmPattern& pattern,
                            AsyncCallback<GeneratorInference> callback);
        
        /** Encode a rhythm pattern into Schillinger parameters */
        void encodePattern(const RhythmPattern& pattern,
                          AsyncCallback<SchillingerEncoding> callback);
        
        /** Find best fitting Schillinger patterns for a target */
        void findBestFit(const RhythmPattern& targetPattern,
                        const FitOptions& options,
                        AsyncCallback<juce::Array<SchillingerMatch>> callback);

        //==============================================================================
        /** Synchronous versions for offline-capable operations */
        
        /** Generate resultant synchronously (offline-capable) */
        juce::Result generateResultantSync(int generatorA, int generatorB, 
                                          RhythmPattern& result);
        
        /** Analyze pattern synchronously (offline-capable) */
        juce::Result analyzePatternSync(const RhythmPattern& pattern,
                                       RhythmAnalysis& result);

        //==============================================================================
        /** Validate rhythm pattern data */
        static juce::Result validatePattern(const RhythmPattern& pattern);
        
        /** Convert between different rhythm representations */
        static juce::Result convertPattern(const RhythmPattern& input,
                                          const juce::String& targetFormat,
                                          juce::var& output);

    private:
        //==============================================================================
        struct Impl;
        std::unique_ptr<Impl> pimpl;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RhythmAPI)
    };

} // namespace Schillinger