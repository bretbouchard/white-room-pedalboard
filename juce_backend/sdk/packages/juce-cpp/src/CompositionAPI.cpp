/*
  ==============================================================================

    CompositionAPI.cpp
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#include "../include/CompositionAPI.h"
#include "../include/SchillingerSDK.h"
#include "ErrorHandling.h"
#include <juce_core/juce_core.h>

namespace Schillinger
{
    //==============================================================================
    // CompositionParams implementation
    juce::var CompositionParams::toJson() const
    {
        auto json = new juce::DynamicObject();
        json->setProperty("name", name);
        json->setProperty("key", key);
        json->setProperty("scale", scale);
        json->setProperty("tempo", tempo);
        
        auto timeSignatureArray = new juce::Array<juce::var>();
        timeSignatureArray->add(timeSignature.first);
        timeSignatureArray->add(timeSignature.second);
        json->setProperty("timeSignature", juce::var(timeSignatureArray));
        
        json->setProperty("style", style);
        json->setProperty("targetLength", targetLength);
        json->setProperty("constraints", constraints);
        
        return juce::var(json);
    }

    juce::Result CompositionParams::validate() const
    {
        if (name.isEmpty())
            return SCHILLINGER_VALIDATION_ERROR("Empty composition name", "Composition name cannot be empty");
        
        if (key.isEmpty())
            return SCHILLINGER_VALIDATION_ERROR("Empty key", "Key must be specified");
        
        if (scale.isEmpty())
            return SCHILLINGER_VALIDATION_ERROR("Empty scale", "Scale must be specified");
        
        if (tempo <= 0 || tempo > 300)
            return SCHILLINGER_VALIDATION_ERROR("Invalid tempo", "Tempo must be between 1 and 300 BPM");
        
        if (targetLength <= 0 || targetLength > 512)
            return SCHILLINGER_VALIDATION_ERROR("Invalid target length", "Target length must be between 1 and 512");
        
        return juce::Result::ok();
    }

    //==============================================================================
    // SectionParams implementation
    juce::var SectionParams::toJson() const
    {
        auto json = new juce::DynamicObject();
        json->setProperty("type", static_cast<int>(type));
        json->setProperty("length", length);
        json->setProperty("key", key);
        json->setProperty("scale", scale);
        json->setProperty("rhythmTemplate", rhythmTemplate.toJson());
        json->setProperty("harmonyTemplate", harmonyTemplate.toJson());
        json->setProperty("melodicConstraints", melodicConstraints);
        return juce::var(json);
    }

    juce::Result SectionParams::validate() const
    {
        if (length <= 0 || length > 128)
            return SCHILLINGER_VALIDATION_ERROR("Invalid section length", "Section length must be between 1 and 128");
        
        auto rhythmValidation = rhythmTemplate.validate();
        if (!rhythmValidation.wasOk())
            return rhythmValidation;
        
        auto harmonyValidation = harmonyTemplate.validate();
        if (!harmonyValidation.wasOk())
            return harmonyValidation;
        
        return juce::Result::ok();
    }

    //==============================================================================
    // ArrangementTemplate implementation
    juce::var ArrangementTemplate::toJson() const
    {
        auto json = new juce::DynamicObject();
        json->setProperty("name", name);
        
        auto sectionOrderArray = new juce::Array<juce::var>();
        for (auto sectionType : sectionOrder)
            sectionOrderArray->add(static_cast<int>(sectionType));
        json->setProperty("sectionOrder", juce::var(sectionOrderArray));
        
        json->setProperty("sectionLengths", sectionLengths);
        json->setProperty("transitionRules", transitionRules);
        json->setProperty("instrumentationRules", instrumentationRules);
        
        return juce::var(json);
    }

    ArrangementTemplate ArrangementTemplate::fromJson(const juce::var& json)
    {
        ArrangementTemplate template_;
        
        if (json.hasProperty("name"))
            template_.name = json["name"].toString();
        
        if (json.hasProperty("sectionOrder"))
        {
            auto orderArray = json["sectionOrder"].getArray();
            if (orderArray != nullptr)
            {
                for (const auto& item : *orderArray)
                {
                    int typeInt = static_cast<int>(item);
                    template_.sectionOrder.add(static_cast<SectionType>(typeInt));
                }
            }
        }
        
        if (json.hasProperty("sectionLengths"))
            template_.sectionLengths = json["sectionLengths"];
        
        if (json.hasProperty("transitionRules"))
            template_.transitionRules = json["transitionRules"];
        
        if (json.hasProperty("instrumentationRules"))
            template_.instrumentationRules = json["instrumentationRules"];
        
        return template_;
    }

    //==============================================================================
    // CompositionAPI::Impl
    struct CompositionAPI::Impl
    {
        SchillingerSDK* sdk;
        
        explicit Impl(SchillingerSDK* s) : sdk(s) {}
    };

    //==============================================================================
    // CompositionAPI implementation
    CompositionAPI::CompositionAPI(SchillingerSDK* sdk)
        : pimpl(std::make_unique<Impl>(sdk))
    {
    }

    CompositionAPI::~CompositionAPI() = default;

    void CompositionAPI::create(const CompositionParams& params,
                               AsyncCallback<Composition> callback)
    {
        auto validationResult = params.validate();
        if (!validationResult.wasOk())
        {
            callback(validationResult, {});
            return;
        }
        
        // Create basic composition
        Composition composition;
        composition.id = juce::Uuid().toString();
        composition.name = params.name;
        composition.key = params.key;
        composition.scale = params.scale;
        composition.tempo = params.tempo;
        composition.timeSignature = params.timeSignature;
        
        // Add basic metadata
        auto metadata = new juce::DynamicObject();
        metadata->setProperty("style", params.style);
        metadata->setProperty("targetLength", params.targetLength);
        metadata->setProperty("created", juce::Time::getCurrentTime().toISO8601(true));
        composition.metadata = juce::var(metadata);
        
        callback(juce::Result::ok(), composition);
    }

    void CompositionAPI::generateSection(SectionType type,
                                        const SectionParams& params,
                                        AsyncCallback<juce::var> callback)
    {
        auto validationResult = params.validate();
        if (!validationResult.wasOk())
        {
            callback(validationResult, {});
            return;
        }
        
        // Generate basic section
        auto section = new juce::DynamicObject();
        section->setProperty("id", juce::Uuid().toString());
        section->setProperty("type", sectionTypeToString(type));
        section->setProperty("length", params.length);
        section->setProperty("rhythm", params.rhythmTemplate.toJson());
        section->setProperty("harmony", params.harmonyTemplate.toJson());
        
        callback(juce::Result::ok(), juce::var(section));
    }

    void CompositionAPI::generateArrangement(const ArrangementTemplate& template_,
                                            AsyncCallback<Arrangement> callback)
    {
        Arrangement arrangement;
        arrangement.id = juce::Uuid().toString();
        arrangement.name = template_.name;
        
        // Generate basic arrangement structure
        auto sections = new juce::Array<juce::var>();
        for (auto sectionType : template_.sectionOrder)
        {
            auto section = new juce::DynamicObject();
            section->setProperty("type", sectionTypeToString(sectionType));
            section->setProperty("length", 8); // Default length
            sections->add(juce::var(section));
        }
        arrangement.sections = juce::var(sections);
        
        callback(juce::Result::ok(), arrangement);
    }

    void CompositionAPI::applyVariation(const Composition& composition,
                                       const VariationParams& variation,
                                       AsyncCallback<Composition> callback)
    {
        auto validationResult = composition.validate();
        if (!validationResult.wasOk())
        {
            callback(validationResult, {});
            return;
        }
        
        auto variationValidation = variation.validate();
        if (!variationValidation.wasOk())
        {
            callback(variationValidation, {});
            return;
        }
        
        // Create varied composition (placeholder)
        Composition varied = composition;
        varied.id = juce::Uuid().toString();
        varied.name += " (Variation)";
        
        callback(juce::Result::ok(), varied);
    }

    void CompositionAPI::analyzeComposition(const Composition& composition,
                                           AsyncCallback<CompositionAnalysis> callback)
    {
        auto validationResult = composition.validate();
        if (!validationResult.wasOk())
        {
            callback(validationResult, {});
            return;
        }
        
        CompositionAnalysis analysis;
        analysis.complexity = 0.6; // Placeholder
        analysis.suggestions.add("Consider adding more harmonic variety");
        
        callback(juce::Result::ok(), analysis);
    }

    void CompositionAPI::inferStructure(const juce::Array<int>& melody,
                                       const juce::Array<int>& rhythm,
                                       AsyncCallback<StructureInference> callback)
    {
        if (melody.isEmpty() && rhythm.isEmpty())
        {
            callback(SCHILLINGER_VALIDATION_ERROR("Empty input", "Both melody and rhythm cannot be empty"), {});
            return;
        }
        
        StructureInference inference;
        inference.confidenceScores.add(0.7);
        inference.possibleForms.add("ABA");
        inference.possibleForms.add("ABAC");
        
        callback(juce::Result::ok(), inference);
    }

    void CompositionAPI::encodeUserInput(const juce::Array<int>& melody,
                                        const juce::Array<int>& rhythm,
                                        const juce::StringArray& harmony,
                                        AsyncCallback<SchillingerCompositionEncoding> callback)
    {
        SchillingerCompositionEncoding encoding;
        encoding.confidence = 0.75;
        
        // Basic encoding (placeholder)
        auto params = new juce::DynamicObject();
        params->setProperty("melodyLength", melody.size());
        params->setProperty("rhythmLength", rhythm.size());
        params->setProperty("harmonyLength", harmony.size());
        encoding.compositionParameters = juce::var(params);
        
        callback(juce::Result::ok(), encoding);
    }

    juce::Result CompositionAPI::validateComposition(const Composition& composition,
                                                    juce::var& validation)
    {
        auto validationResult = composition.validate();
        if (!validationResult.wasOk())
            return validationResult;
        
        auto result = new juce::DynamicObject();
        result->setProperty("valid", true);
        result->setProperty("name", composition.name);
        result->setProperty("key", composition.key);
        result->setProperty("scale", composition.scale);
        validation = juce::var(result);
        
        return juce::Result::ok();
    }

    juce::Result CompositionAPI::generateBasicSection(SectionType type,
                                                     int length,
                                                     juce::var& section)
    {
        if (length <= 0 || length > 128)
            return SCHILLINGER_VALIDATION_ERROR("Invalid length", "Section length must be between 1 and 128");
        
        auto sectionObj = new juce::DynamicObject();
        sectionObj->setProperty("id", juce::Uuid().toString());
        sectionObj->setProperty("type", sectionTypeToString(type));
        sectionObj->setProperty("length", length);
        sectionObj->setProperty("generated_offline", true);
        
        section = juce::var(sectionObj);
        return juce::Result::ok();
    }

    juce::String CompositionAPI::sectionTypeToString(SectionType type)
    {
        switch (type)
        {
            case SectionType::Intro:        return "Intro";
            case SectionType::Verse:        return "Verse";
            case SectionType::Chorus:       return "Chorus";
            case SectionType::Bridge:       return "Bridge";
            case SectionType::Outro:        return "Outro";
            case SectionType::Development:  return "Development";
            case SectionType::Transition:   return "Transition";
            case SectionType::Custom:       return "Custom";
            default:                        return "Unknown";
        }
    }

    SectionType CompositionAPI::stringToSectionType(const juce::String& str)
    {
        if (str == "Intro") return SectionType::Intro;
        if (str == "Verse") return SectionType::Verse;
        if (str == "Chorus") return SectionType::Chorus;
        if (str == "Bridge") return SectionType::Bridge;
        if (str == "Outro") return SectionType::Outro;
        if (str == "Development") return SectionType::Development;
        if (str == "Transition") return SectionType::Transition;
        if (str == "Custom") return SectionType::Custom;
        return SectionType::Custom;
    }

    juce::Array<ArrangementTemplate> CompositionAPI::getDefaultTemplates()
    {
        juce::Array<ArrangementTemplate> templates;
        
        // Pop song template
        ArrangementTemplate popTemplate;
        popTemplate.name = "Pop Song";
        popTemplate.sectionOrder = {
            SectionType::Intro,
            SectionType::Verse,
            SectionType::Chorus,
            SectionType::Verse,
            SectionType::Chorus,
            SectionType::Bridge,
            SectionType::Chorus,
            SectionType::Outro
        };
        templates.add(popTemplate);
        
        // Classical ABA template
        ArrangementTemplate abaTemplate;
        abaTemplate.name = "ABA Form";
        abaTemplate.sectionOrder = {
            SectionType::Intro,
            SectionType::Development,
            SectionType::Intro,
            SectionType::Outro
        };
        templates.add(abaTemplate);
        
        return templates;
    }

    juce::Result CompositionAPI::mergeCompositions(const juce::Array<Composition>& compositions,
                                                  Composition& result)
    {
        if (compositions.isEmpty())
            return SCHILLINGER_VALIDATION_ERROR("Empty compositions array", "At least one composition is required");
        
        // Use first composition as base
        result = compositions[0];
        result.id = juce::Uuid().toString();
        result.name = "Merged Composition";
        
        // Add metadata about merge
        auto metadata = new juce::DynamicObject();
        metadata->setProperty("merged", true);
        metadata->setProperty("sourceCount", compositions.size());
        metadata->setProperty("mergedAt", juce::Time::getCurrentTime().toISO8601(true));
        result.metadata = juce::var(metadata);
        
        return juce::Result::ok();
    }

} // namespace Schillinger