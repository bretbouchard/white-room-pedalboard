/*
  ==============================================================================

    CompositionAPI.h
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
    /** Parameters for composition creation */
    struct CompositionParams
    {
        juce::String name;
        juce::String key = "C";
        juce::String scale = "major";
        int tempo = 120;
        std::pair<int, int> timeSignature {4, 4};
        juce::String style;
        int targetLength = 32;
        juce::var constraints;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Validate parameters */
        juce::Result validate() const;
    };

    //==============================================================================
    /** Section types for compositions */
    enum class SectionType
    {
        Intro,
        Verse,
        Chorus,
        Bridge,
        Outro,
        Development,
        Transition,
        Custom
    };

    //==============================================================================
    /** Parameters for section generation */
    struct SectionParams
    {
        SectionType type = SectionType::Verse;
        int length = 8;
        juce::String key;
        juce::String scale;
        RhythmPattern rhythmTemplate;
        ChordProgression harmonyTemplate;
        juce::var melodicConstraints;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Validate parameters */
        juce::Result validate() const;
    };

    //==============================================================================
    /** Arrangement template */
    struct ArrangementTemplate
    {
        juce::String name;
        juce::Array<SectionType> sectionOrder;
        juce::var sectionLengths;
        juce::var transitionRules;
        juce::var instrumentationRules;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static ArrangementTemplate fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Arrangement result */
    struct Arrangement
    {
        juce::String id;
        juce::String name;
        juce::var sections;
        juce::var instrumentation;
        juce::var metadata;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static Arrangement fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Variation parameters */
    struct VariationParams
    {
        juce::String variationType = "rhythmic";
        double intensity = 0.5;
        juce::StringArray targetSections;
        juce::var constraints;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Validate parameters */
        juce::Result validate() const;
    };

    //==============================================================================
    /** Composition analysis results */
    struct CompositionAnalysis
    {
        juce::var structuralAnalysis;
        juce::var harmonicAnalysis;
        juce::var rhythmicAnalysis;
        juce::var melodicAnalysis;
        double complexity = 0.0;
        juce::StringArray suggestions;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static CompositionAnalysis fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Structure inference results */
    struct StructureInference
    {
        juce::var inferredStructure;
        juce::Array<double> confidenceScores;
        juce::StringArray possibleForms;
        juce::var schillingerParameters;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static StructureInference fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Schillinger composition encoding */
    struct SchillingerCompositionEncoding
    {
        juce::var compositionParameters;
        juce::var rhythmicEncoding;
        juce::var harmonicEncoding;
        juce::var melodicEncoding;
        double confidence = 0.0;
        
        /** Convert to JSON */
        juce::var toJson() const;
        
        /** Create from JSON */
        static SchillingerCompositionEncoding fromJson(const juce::var& json);
    };

    //==============================================================================
    /**
        Composition API providing access to Schillinger composition tools.
        
        This class handles complete composition creation, section generation,
        arrangement, and reverse analysis of musical structures.
    */
    class CompositionAPI
    {
    public:
        //==============================================================================
        /** Constructor */
        explicit CompositionAPI(SchillingerSDK* sdk);
        
        /** Destructor */
        ~CompositionAPI();

        //==============================================================================
        /** Create a new composition */
        void create(const CompositionParams& params,
                   AsyncCallback<Composition> callback);
        
        /** Generate a section for a composition */
        void generateSection(SectionType type,
                            const SectionParams& params,
                            AsyncCallback<juce::var> callback);
        
        /** Generate an arrangement from template */
        void generateArrangement(const ArrangementTemplate& template_,
                                AsyncCallback<Arrangement> callback);
        
        /** Apply variation to a composition */
        void applyVariation(const Composition& composition,
                           const VariationParams& variation,
                           AsyncCallback<Composition> callback);

        //==============================================================================
        /** Analyze a composition structure */
        void analyzeComposition(const Composition& composition,
                               AsyncCallback<CompositionAnalysis> callback);
        
        /** Infer structure from musical input */
        void inferStructure(const juce::Array<int>& melody,
                           const juce::Array<int>& rhythm,
                           AsyncCallback<StructureInference> callback);
        
        /** Encode user input into Schillinger parameters */
        void encodeUserInput(const juce::Array<int>& melody,
                            const juce::Array<int>& rhythm,
                            const juce::StringArray& harmony,
                            AsyncCallback<SchillingerCompositionEncoding> callback);

        //==============================================================================
        /** Synchronous versions for offline-capable operations */
        
        /** Validate composition structure synchronously */
        juce::Result validateComposition(const Composition& composition,
                                        juce::var& validation);
        
        /** Generate basic section synchronously */
        juce::Result generateBasicSection(SectionType type,
                                         int length,
                                         juce::var& section);

        //==============================================================================
        /** Utility methods */
        
        /** Convert section type to string */
        static juce::String sectionTypeToString(SectionType type);
        
        /** Convert string to section type */
        static SectionType stringToSectionType(const juce::String& str);
        
        /** Get default arrangement templates */
        static juce::Array<ArrangementTemplate> getDefaultTemplates();
        
        /** Merge compositions */
        static juce::Result mergeCompositions(const juce::Array<Composition>& compositions,
                                             Composition& result);

    private:
        //==============================================================================
        struct Impl;
        std::unique_ptr<Impl> pimpl;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(CompositionAPI)
    };

} // namespace Schillinger