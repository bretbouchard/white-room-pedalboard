/*
  ==============================================================================

    HarmonyAPI.h
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
    /** Harmonic context for chord analysis */
    struct HarmonicContext
    {
        juce::String key = "C";
        juce::String scale = "major";
        juce::String previousChord;
        juce::String nextChord;
        int position = 0;
        juce::var metadata;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static HarmonicContext fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Chord resolution information */
    struct ChordResolution
    {
        juce::StringArray possibleResolutions;
        juce::Array<double> resolutionStrengths;
        juce::String recommendedResolution;
        juce::var voiceLeading;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static ChordResolution fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Harmonic inference results */
    struct HarmonicInference
    {
        juce::var harmonicStructure;
        juce::Array<double> confidenceScores;
        juce::StringArray functionalAnalysis;
        juce::var schillingerParameters;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static HarmonicInference fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Schillinger harmony encoding */
    struct SchillingerHarmonyEncoding
    {
        juce::var harmonicParameters;
        double confidence = 0.0;
        juce::StringArray alternatives;
        juce::var progressionAnalysis;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static SchillingerHarmonyEncoding fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Harmonic pattern matches */
    struct HarmonicMatch
    {
        ChordProgression progression;
        double similarity = 0.0;
        juce::String matchType;
        juce::var harmonicAnalysis;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static HarmonicMatch fromJson(const juce::var& json);
    };

    //==============================================================================
    /**
        Harmony API providing access to Schillinger harmonic generation and analysis.
        
        This class handles chord progressions, harmonic analysis, and reverse
        engineering of harmonic structures using Schillinger principles.
    */
    class HarmonyAPI
    {
    public:
        //==============================================================================
        /** Constructor */
        explicit HarmonyAPI(SchillingerSDK* sdk);
        
        /** Destructor */
        ~HarmonyAPI();

        //==============================================================================
        /** Generate a chord progression */
        void generateProgression(const juce::String& key,
                                const juce::String& scale,
                                int length,
                                AsyncCallback<ChordProgression> callback);
        
        /** Analyze a chord progression */
        void analyzeProgression(const juce::StringArray& chords,
                               AsyncCallback<HarmonicAnalysis> callback);
        
        /** Generate variations of a progression */
        void generateVariations(const ChordProgression& progression,
                               AsyncCallback<juce::Array<ChordProgression>> callback);
        
        /** Resolve a chord in context */
        void resolveChord(const juce::String& chord,
                         const HarmonicContext& context,
                         AsyncCallback<ChordResolution> callback);

        //==============================================================================
        /** Infer harmonic structure from chord progression */
        void inferHarmonicStructure(const juce::StringArray& chords,
                                   AsyncCallback<HarmonicInference> callback);
        
        /** Encode progression into Schillinger parameters */
        void encodeProgression(const ChordProgression& progression,
                              AsyncCallback<SchillingerHarmonyEncoding> callback);
        
        /** Find harmonic matches for target progression */
        void findHarmonicMatches(const ChordProgression& targetProgression,
                                AsyncCallback<juce::Array<HarmonicMatch>> callback);

        //==============================================================================
        /** Synchronous versions for offline-capable operations */
        
        /** Analyze chord relationships synchronously */
        juce::Result analyzeChordRelationships(const juce::StringArray& chords,
                                              juce::var& analysis);
        
        /** Validate chord progression */
        juce::Result validateProgression(const ChordProgression& progression,
                                        juce::var& validation);

        //==============================================================================
        /** Utility methods */
        
        /** Parse chord symbol into components */
        static juce::Result parseChord(const juce::String& chordSymbol,
                                      juce::var& chordData);
        
        /** Get chord intervals */
        static juce::Result getChordIntervals(const juce::String& chordSymbol,
                                             juce::Array<int>& intervals);
        
        /** Transpose chord progression */
        static juce::Result transposeProgression(const ChordProgression& progression,
                                                int semitones,
                                                ChordProgression& result);

    private:
        //==============================================================================
        struct Impl;
        std::unique_ptr<Impl> pimpl;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(HarmonyAPI)
    };

} // namespace Schillinger