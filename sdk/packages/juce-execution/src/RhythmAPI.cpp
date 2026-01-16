/*
  ==============================================================================

    RhythmAPI.cpp
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#include "../include/RhythmAPI.h"
#include "../include/SchillingerSDK.h"
#include "NetworkManager.h"
#include "ErrorHandling.h"
#include <juce_core/juce_core.h>

namespace Schillinger
{
    //==============================================================================
    // RhythmGenerationParams implementation
    juce::Result RhythmGenerationParams::validate() const
    {
        if (generatorA <= 0 || generatorB <= 0)
            return SCHILLINGER_VALIDATION_ERROR("Generators must be positive integers", 
                                               "Both generatorA and generatorB must be greater than 0");
        
        if (generatorA > 32 || generatorB > 32)
            return SCHILLINGER_VALIDATION_ERROR("Generators too large", 
                                               "Generators should typically be between 1 and 32 for practical results");
        
        if (length <= 0 || length > 128)
            return SCHILLINGER_VALIDATION_ERROR("Invalid length", 
                                               "Length must be between 1 and 128");
        
        return juce::Result::ok();
    }

    juce::var RhythmGenerationParams::toJson() const
    {
        auto json = new juce::DynamicObject();
        json->setProperty("generatorA", generatorA);
        json->setProperty("generatorB", generatorB);
        json->setProperty("variationType", variationType);
        json->setProperty("length", length);
        json->setProperty("options", options);
        return juce::var(json);
    }

    //==============================================================================
    // GeneratorInference implementation
    juce::var GeneratorInference::toJson() const
    {
        auto json = new juce::DynamicObject();
        
        auto generatorsArray = new juce::Array<juce::var>();
        for (const auto& pair : possibleGenerators)
        {
            auto pairObj = new juce::DynamicObject();
            pairObj->setProperty("a", pair.first);
            pairObj->setProperty("b", pair.second);
            generatorsArray->add(juce::var(pairObj));
        }
        json->setProperty("possibleGenerators", juce::var(generatorsArray));
        
        auto scoresArray = new juce::Array<juce::var>();
        for (double score : confidenceScores)
            scoresArray->add(score);
        json->setProperty("confidenceScores", juce::var(scoresArray));
        
        json->setProperty("bestMatch", bestMatch);
        json->setProperty("metadata", metadata);
        
        return juce::var(json);
    }

    GeneratorInference GeneratorInference::fromJson(const juce::var& json)
    {
        GeneratorInference inference;
        
        if (json.hasProperty("possibleGenerators"))
        {
            auto generatorsArray = json["possibleGenerators"].getArray();
            if (generatorsArray != nullptr)
            {
                for (const auto& item : *generatorsArray)
                {
                    if (item.hasProperty("a") && item.hasProperty("b"))
                    {
                        int a = static_cast<int>(item["a"]);
                        int b = static_cast<int>(item["b"]);
                        inference.possibleGenerators.add({a, b});
                    }
                }
            }
        }
        
        if (json.hasProperty("confidenceScores"))
        {
            auto scoresArray = json["confidenceScores"].getArray();
            if (scoresArray != nullptr)
            {
                for (const auto& score : *scoresArray)
                    inference.confidenceScores.add(static_cast<double>(score));
            }
        }
        
        if (json.hasProperty("bestMatch"))
            inference.bestMatch = json["bestMatch"].toString();
        
        if (json.hasProperty("metadata"))
            inference.metadata = json["metadata"];
        
        return inference;
    }

    //==============================================================================
    // SchillingerEncoding implementation
    juce::var SchillingerEncoding::toJson() const
    {
        auto json = new juce::DynamicObject();
        json->setProperty("parameters", parameters);
        json->setProperty("confidence", confidence);
        
        auto alternativesArray = new juce::Array<juce::var>();
        for (const auto& alt : alternatives)
            alternativesArray->add(alt);
        json->setProperty("alternatives", juce::var(alternativesArray));
        
        json->setProperty("metadata", metadata);
        return juce::var(json);
    }

    SchillingerEncoding SchillingerEncoding::fromJson(const juce::var& json)
    {
        SchillingerEncoding encoding;
        
        if (json.hasProperty("parameters"))
            encoding.parameters = json["parameters"];
        
        if (json.hasProperty("confidence"))
            encoding.confidence = static_cast<double>(json["confidence"]);
        
        if (json.hasProperty("alternatives"))
        {
            auto alternativesArray = json["alternatives"].getArray();
            if (alternativesArray != nullptr)
            {
                for (const auto& alt : *alternativesArray)
                    encoding.alternatives.add(alt.toString());
            }
        }
        
        if (json.hasProperty("metadata"))
            encoding.metadata = json["metadata"];
        
        return encoding;
    }

    //==============================================================================
    // SchillingerMatch implementation
    juce::var SchillingerMatch::toJson() const
    {
        auto json = new juce::DynamicObject();
        json->setProperty("pattern", pattern.toJson());
        json->setProperty("similarity", similarity);
        json->setProperty("matchType", matchType);
        json->setProperty("parameters", parameters);
        return juce::var(json);
    }

    SchillingerMatch SchillingerMatch::fromJson(const juce::var& json)
    {
        SchillingerMatch match;
        
        if (json.hasProperty("pattern"))
            match.pattern = RhythmPattern::fromJson(json["pattern"]);
        
        if (json.hasProperty("similarity"))
            match.similarity = static_cast<double>(json["similarity"]);
        
        if (json.hasProperty("matchType"))
            match.matchType = json["matchType"].toString();
        
        if (json.hasProperty("parameters"))
            match.parameters = json["parameters"];
        
        return match;
    }

    //==============================================================================
    // FitOptions implementation
    juce::var FitOptions::toJson() const
    {
        auto json = new juce::DynamicObject();
        json->setProperty("toleranceThreshold", toleranceThreshold);
        json->setProperty("maxResults", maxResults);
        json->setProperty("includeVariations", includeVariations);
        
        auto typesArray = new juce::Array<juce::var>();
        for (const auto& type : allowedVariationTypes)
            typesArray->add(type);
        json->setProperty("allowedVariationTypes", juce::var(typesArray));
        
        return juce::var(json);
    }

    //==============================================================================
    // RhythmAPI::Impl
    struct RhythmAPI::Impl
    {
        SchillingerSDK* sdk;
        
        explicit Impl(SchillingerSDK* s) : sdk(s) {}
        
        // Offline mathematical functions
        juce::Result generateResultantOffline(int generatorA, int generatorB, RhythmPattern& result)
        {
            if (generatorA <= 0 || generatorB <= 0)
                return SCHILLINGER_VALIDATION_ERROR("Invalid generators", "Both generators must be positive");
            
            // Calculate the Schillinger resultant pattern
            int lcm = (generatorA * generatorB) / std::__gcd(generatorA, generatorB);
            
            result.durations.clear();
            result.timeSignature = {4, 4};
            result.tempo = 120;
            result.swing = 0.0;
            
            // Generate the resultant pattern
            for (int i = 0; i < lcm; ++i)
            {
                bool aActive = (i % generatorA) == 0;
                bool bActive = (i % generatorB) == 0;
                
                if (aActive && bActive)
                    result.durations.add(3); // Both generators coincide - strongest accent
                else if (aActive)
                    result.durations.add(2); // Generator A only - medium accent
                else if (bActive)
                    result.durations.add(1); // Generator B only - weak accent
                else
                    result.durations.add(1); // Neither - rest or weak beat
            }
            
            // Add metadata
            auto metadata = new juce::DynamicObject();
            metadata->setProperty("generatorA", generatorA);
            metadata->setProperty("generatorB", generatorB);
            metadata->setProperty("lcm", lcm);
            metadata->setProperty("generated_offline", true);
            result.metadata = juce::var(metadata);
            
            return juce::Result::ok();
        }
        
        juce::Result analyzePatternOffline(const RhythmPattern& pattern, RhythmAnalysis& result)
        {
            auto validationResult = pattern.validate();
            if (!validationResult.wasOk())
                return validationResult;
            
            // Calculate basic metrics
            int totalDuration = 0;
            int maxDuration = 0;
            int accentCount = 0;
            
            for (int duration : pattern.durations)
            {
                totalDuration += duration;
                maxDuration = juce::jmax(maxDuration, duration);
                if (duration > 1)
                    accentCount++;
            }
            
            // Calculate complexity (0.0 to 1.0)
            result.complexity = static_cast<double>(accentCount) / pattern.durations.size();
            
            // Calculate density (average duration)
            result.density = static_cast<double>(totalDuration) / pattern.durations.size();
            
            // Simple syncopation calculation (variation in durations)
            double variance = 0.0;
            double mean = result.density;
            for (int duration : pattern.durations)
            {
                double diff = duration - mean;
                variance += diff * diff;
            }
            variance /= pattern.durations.size();
            result.syncopation = juce::jmin(1.0, variance / 4.0); // Normalize to 0-1
            
            // Add some basic suggestions
            if (result.complexity < 0.2)
                result.suggestions.add("Consider adding more accents for increased complexity");
            if (result.syncopation < 0.1)
                result.suggestions.add("Pattern is very regular - try adding syncopation");
            if (result.density > 3.0)
                result.suggestions.add("Pattern is quite dense - consider simplifying");
            
            return juce::Result::ok();
        }
    };

    //==============================================================================
    // RhythmAPI implementation
    RhythmAPI::RhythmAPI(SchillingerSDK* sdk)
        : pimpl(std::make_unique<Impl>(sdk))
    {
    }

    RhythmAPI::~RhythmAPI() = default;

    void RhythmAPI::generateResultant(int generatorA, int generatorB, 
                                     AsyncCallback<RhythmPattern> callback)
    {
        // Validate inputs
        if (generatorA <= 0 || generatorB <= 0)
        {
            callback(SCHILLINGER_VALIDATION_ERROR("Invalid generators", "Both generators must be positive"), {});
            return;
        }
        
        // For offline mode or simple cases, use offline calculation
        if (pimpl->sdk->isOfflineModeEnabled() || (generatorA <= 16 && generatorB <= 16))
        {
            RhythmPattern result;
            auto offlineResult = pimpl->generateResultantOffline(generatorA, generatorB, result);
            callback(offlineResult, result);
            return;
        }
        
        // Make network request for complex cases
        NetworkManager::RequestOptions options;
        options.method = NetworkManager::HttpMethod::POST;
        options.endpoint = "rhythm/generate-resultant";
        
        auto requestBody = new juce::DynamicObject();
        requestBody->setProperty("generatorA", generatorA);
        requestBody->setProperty("generatorB", generatorB);
        options.body = juce::var(requestBody);
        
        // This would need access to the network manager - simplified for now
        callback(juce::Result::ok(), RhythmPattern{});
    }

    void RhythmAPI::generateVariation(const RhythmPattern& pattern, 
                                     const juce::String& variationType,
                                     AsyncCallback<RhythmPattern> callback)
    {
        auto validationResult = pattern.validate();
        if (!validationResult.wasOk())
        {
            callback(validationResult, {});
            return;
        }
        
        // For now, implement basic variations offline
        RhythmPattern result = pattern;
        
        if (variationType == "retrograde")
        {
            // Reverse the pattern
            result.durations.clear();
            for (int i = pattern.durations.size() - 1; i >= 0; --i)
                result.durations.add(pattern.durations[i]);
        }
        else if (variationType == "augmentation")
        {
            // Double all durations
            for (int& duration : result.durations)
                duration *= 2;
        }
        else if (variationType == "diminution")
        {
            // Halve all durations (minimum 1)
            for (int& duration : result.durations)
                duration = juce::jmax(1, duration / 2);
        }
        
        callback(juce::Result::ok(), result);
    }

    void RhythmAPI::generateComplex(const RhythmGenerationParams& params,
                                   AsyncCallback<RhythmPattern> callback)
    {
        auto validationResult = params.validate();
        if (!validationResult.wasOk())
        {
            callback(validationResult, {});
            return;
        }
        
        // Start with basic resultant
        RhythmPattern result;
        auto generateResult = pimpl->generateResultantOffline(params.generatorA, params.generatorB, result);
        if (!generateResult.wasOk())
        {
            callback(generateResult, {});
            return;
        }
        
        // Apply variations based on parameters
        if (params.variationType != "basic")
        {
            generateVariation(result, params.variationType, callback);
        }
        else
        {
            callback(juce::Result::ok(), result);
        }
    }

    void RhythmAPI::analyzePattern(const RhythmPattern& pattern,
                                  AsyncCallback<RhythmAnalysis> callback)
    {
        RhythmAnalysis result;
        auto analysisResult = pimpl->analyzePatternOffline(pattern, result);
        callback(analysisResult, result);
    }

    void RhythmAPI::inferGenerators(const RhythmPattern& pattern,
                                   AsyncCallback<GeneratorInference> callback)
    {
        auto validationResult = pattern.validate();
        if (!validationResult.wasOk())
        {
            callback(validationResult, {});
            return;
        }
        
        GeneratorInference result;
        
        // Simple generator inference - try common generator pairs
        juce::Array<std::pair<int, int>> candidates = {{2, 3}, {3, 4}, {4, 5}, {3, 5}, {2, 5}};
        
        for (const auto& candidate : candidates)
        {
            RhythmPattern testPattern;
            auto generateResult = pimpl->generateResultantOffline(candidate.first, candidate.second, testPattern);
            
            if (generateResult.wasOk())
            {
                // Calculate similarity (simplified)
                double similarity = 0.0;
                int minSize = juce::jmin(pattern.durations.size(), testPattern.durations.size());
                int matches = 0;
                
                for (int i = 0; i < minSize; ++i)
                {
                    if (pattern.durations[i] == testPattern.durations[i])
                        matches++;
                }
                
                if (minSize > 0)
                    similarity = static_cast<double>(matches) / minSize;
                
                if (similarity > 0.5) // Threshold for inclusion
                {
                    result.possibleGenerators.add(candidate);
                    result.confidenceScores.add(similarity);
                }
            }
        }
        
        // Find best match
        if (!result.confidenceScores.isEmpty())
        {
            int bestIndex = 0;
            double bestScore = result.confidenceScores[0];
            
            for (int i = 1; i < result.confidenceScores.size(); ++i)
            {
                if (result.confidenceScores[i] > bestScore)
                {
                    bestScore = result.confidenceScores[i];
                    bestIndex = i;
                }
            }
            
            auto bestPair = result.possibleGenerators[bestIndex];
            result.bestMatch = juce::String(bestPair.first) + ":" + juce::String(bestPair.second);
        }
        
        callback(juce::Result::ok(), result);
    }

    void RhythmAPI::encodePattern(const RhythmPattern& pattern,
                                 AsyncCallback<SchillingerEncoding> callback)
    {
        // First infer generators
        inferGenerators(pattern, [callback](juce::Result result, GeneratorInference inference)
        {
            if (!result.wasOk())
            {
                callback(result, {});
                return;
            }
            
            SchillingerEncoding encoding;
            
            if (!inference.possibleGenerators.isEmpty())
            {
                auto bestPair = inference.possibleGenerators[0];
                double bestScore = inference.confidenceScores[0];
                
                auto params = new juce::DynamicObject();
                params->setProperty("generatorA", bestPair.first);
                params->setProperty("generatorB", bestPair.second);
                params->setProperty("method", "resultant");
                
                encoding.parameters = juce::var(params);
                encoding.confidence = bestScore;
                
                // Add alternatives
                for (int i = 1; i < juce::jmin(3, inference.possibleGenerators.size()); ++i)
                {
                    auto altPair = inference.possibleGenerators[i];
                    encoding.alternatives.add(juce::String(altPair.first) + ":" + juce::String(altPair.second));
                }
            }
            
            callback(juce::Result::ok(), encoding);
        });
    }

    void RhythmAPI::findBestFit(const RhythmPattern& targetPattern,
                               const FitOptions& options,
                               AsyncCallback<juce::Array<SchillingerMatch>> callback)
    {
        auto validationResult = targetPattern.validate();
        if (!validationResult.wasOk())
        {
            callback(validationResult, {});
            return;
        }
        
        juce::Array<SchillingerMatch> matches;
        
        // Try various generator combinations
        for (int a = 2; a <= 8; ++a)
        {
            for (int b = 2; b <= 8; ++b)
            {
                if (a == b) continue;
                
                RhythmPattern testPattern;
                auto generateResult = pimpl->generateResultantOffline(a, b, testPattern);
                
                if (generateResult.wasOk())
                {
                    // Calculate similarity
                    double similarity = 0.0;
                    int minSize = juce::jmin(targetPattern.durations.size(), testPattern.durations.size());
                    int matches_count = 0;
                    
                    for (int i = 0; i < minSize; ++i)
                    {
                        if (targetPattern.durations[i] == testPattern.durations[i])
                            matches_count++;
                    }
                    
                    if (minSize > 0)
                        similarity = static_cast<double>(matches_count) / minSize;
                    
                    if (similarity >= options.toleranceThreshold)
                    {
                        SchillingerMatch match;
                        match.pattern = testPattern;
                        match.similarity = similarity;
                        match.matchType = "resultant";
                        
                        auto params = new juce::DynamicObject();
                        params->setProperty("generatorA", a);
                        params->setProperty("generatorB", b);
                        match.parameters = juce::var(params);
                        
                        matches.add(match);
                    }
                }
                
                if (matches.size() >= options.maxResults)
                    break;
            }
            if (matches.size() >= options.maxResults)
                break;
        }
        
        // Sort by similarity (highest first)
        matches.sort([](const SchillingerMatch& a, const SchillingerMatch& b)
        {
            return a.similarity > b.similarity;
        });
        
        callback(juce::Result::ok(), matches);
    }

    juce::Result RhythmAPI::generateResultantSync(int generatorA, int generatorB, 
                                                 RhythmPattern& result)
    {
        return pimpl->generateResultantOffline(generatorA, generatorB, result);
    }

    juce::Result RhythmAPI::analyzePatternSync(const RhythmPattern& pattern,
                                              RhythmAnalysis& result)
    {
        return pimpl->analyzePatternOffline(pattern, result);
    }

    juce::Result RhythmAPI::validatePattern(const RhythmPattern& pattern)
    {
        return pattern.validate();
    }

    juce::Result RhythmAPI::convertPattern(const RhythmPattern& input,
                                          const juce::String& targetFormat,
                                          juce::var& output)
    {
        if (targetFormat == "json")
        {
            output = input.toJson();
            return juce::Result::ok();
        }
        else if (targetFormat == "midi_ticks")
        {
            auto ticksArray = new juce::Array<juce::var>();
            for (int duration : input.durations)
                ticksArray->add(duration * 480); // 480 ticks per quarter note
            output = juce::var(ticksArray);
            return juce::Result::ok();
        }
        
        return SCHILLINGER_VALIDATION_ERROR("Unsupported format", "Format '" + targetFormat + "' is not supported");
    }

} // namespace Schillinger