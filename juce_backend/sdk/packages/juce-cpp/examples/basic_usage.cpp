/*
  ==============================================================================

    basic_usage.cpp
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#include "../include/SchillingerSDK.h"
#include <juce_core/juce_core.h>
#include <iostream>

using namespace Schillinger;

//==============================================================================
class SchillingerSDKExample
{
public:
    SchillingerSDKExample()
    {
        // Initialize the SDK
        sdk = std::make_unique<SchillingerSDK>();
        
        // Configure SDK options
        SDKOptions options;
        options.apiBaseUrl = "https://api.schillinger.com";
        options.enableOfflineMode = true;
        options.enableCaching = true;
        
        auto configResult = sdk->configure(options);
        if (!configResult.wasOk())
        {
            std::cout << "Failed to configure SDK: " << configResult.getErrorMessage() << std::endl;
            return;
        }
        
        // Set up error handler
        sdk->setErrorHandler([](const juce::String& code, const juce::String& message)
        {
            std::cout << "SDK Error [" << code << "]: " << message << std::endl;
        });
        
        std::cout << "Schillinger SDK initialized successfully!" << std::endl;
        std::cout << "Version: " << SchillingerSDK::getVersion() << std::endl;
    }
    
    void demonstrateRhythmGeneration()
    {
        std::cout << "\n=== Rhythm Generation Demo ===" << std::endl;
        
        auto& rhythmAPI = sdk->getRhythmAPI();
        
        // Generate a 3:2 resultant pattern synchronously
        RhythmPattern pattern;
        auto result = rhythmAPI.generateResultantSync(3, 2, pattern);
        
        if (result.wasOk())
        {
            std::cout << "Generated 3:2 resultant pattern:" << std::endl;
            std::cout << "Durations: ";
            for (int i = 0; i < pattern.durations.size(); ++i)
            {
                std::cout << pattern.durations[i];
                if (i < pattern.durations.size() - 1)
                    std::cout << ", ";
            }
            std::cout << std::endl;
            std::cout << "Time Signature: " << pattern.timeSignature.first 
                      << "/" << pattern.timeSignature.second << std::endl;
            std::cout << "Tempo: " << pattern.tempo << " BPM" << std::endl;
            
            // Analyze the generated pattern
            RhythmAnalysis analysis;
            auto analysisResult = rhythmAPI.analyzePatternSync(pattern, analysis);
            
            if (analysisResult.wasOk())
            {
                std::cout << "\nPattern Analysis:" << std::endl;
                std::cout << "Complexity: " << analysis.complexity << std::endl;
                std::cout << "Density: " << analysis.density << std::endl;
                std::cout << "Syncopation: " << analysis.syncopation << std::endl;
                
                if (!analysis.suggestions.isEmpty())
                {
                    std::cout << "Suggestions:" << std::endl;
                    for (const auto& suggestion : analysis.suggestions)
                        std::cout << "  - " << suggestion << std::endl;
                }
            }
        }
        else
        {
            std::cout << "Failed to generate pattern: " << result.getErrorMessage() << std::endl;
        }
    }
    
    void demonstrateReverseAnalysis()
    {
        std::cout << "\n=== Reverse Analysis Demo ===" << std::endl;
        
        auto& rhythmAPI = sdk->getRhythmAPI();
        
        // Create a test pattern to analyze
        RhythmPattern testPattern;
        testPattern.durations = {2, 1, 3, 1, 2, 1}; // A simple pattern
        testPattern.timeSignature = {4, 4};
        testPattern.tempo = 120;
        
        std::cout << "Analyzing pattern: ";
        for (int i = 0; i < testPattern.durations.size(); ++i)
        {
            std::cout << testPattern.durations[i];
            if (i < testPattern.durations.size() - 1)
                std::cout << ", ";
        }
        std::cout << std::endl;
        
        // Infer generators asynchronously
        rhythmAPI.inferGenerators(testPattern, [](juce::Result result, GeneratorInference inference)
        {
            if (result.wasOk())
            {
                std::cout << "Generator Inference Results:" << std::endl;
                
                if (!inference.possibleGenerators.isEmpty())
                {
                    std::cout << "Possible generator pairs:" << std::endl;
                    for (int i = 0; i < inference.possibleGenerators.size(); ++i)
                    {
                        auto pair = inference.possibleGenerators[i];
                        double confidence = i < inference.confidenceScores.size() ? 
                                          inference.confidenceScores[i] : 0.0;
                        
                        std::cout << "  " << pair.first << ":" << pair.second 
                                  << " (confidence: " << confidence << ")" << std::endl;
                    }
                    
                    if (inference.bestMatch.isNotEmpty())
                        std::cout << "Best match: " << inference.bestMatch << std::endl;
                }
                else
                {
                    std::cout << "No suitable generators found for this pattern." << std::endl;
                }
            }
            else
            {
                std::cout << "Failed to infer generators: " << result.getErrorMessage() << std::endl;
            }
        });
    }
    
    void demonstratePatternMatching()
    {
        std::cout << "\n=== Pattern Matching Demo ===" << std::endl;
        
        auto& rhythmAPI = sdk->getRhythmAPI();
        
        // Create a target pattern
        RhythmPattern targetPattern;
        targetPattern.durations = {3, 1, 2, 1, 3, 1}; // Pattern to match
        targetPattern.timeSignature = {4, 4};
        targetPattern.tempo = 120;
        
        std::cout << "Finding matches for pattern: ";
        for (int i = 0; i < targetPattern.durations.size(); ++i)
        {
            std::cout << targetPattern.durations[i];
            if (i < targetPattern.durations.size() - 1)
                std::cout << ", ";
        }
        std::cout << std::endl;
        
        // Set up fit options
        FitOptions options;
        options.toleranceThreshold = 0.6;
        options.maxResults = 5;
        options.includeVariations = true;
        
        // Find best fits
        rhythmAPI.findBestFit(targetPattern, options, 
                             [](juce::Result result, juce::Array<SchillingerMatch> matches)
        {
            if (result.wasOk())
            {
                std::cout << "Found " << matches.size() << " matching patterns:" << std::endl;
                
                for (int i = 0; i < matches.size(); ++i)
                {
                    const auto& match = matches[i];
                    std::cout << "  Match " << (i + 1) << ":" << std::endl;
                    std::cout << "    Similarity: " << match.similarity << std::endl;
                    std::cout << "    Type: " << match.matchType << std::endl;
                    
                    if (match.parameters.hasProperty("generatorA") && match.parameters.hasProperty("generatorB"))
                    {
                        int genA = static_cast<int>(match.parameters["generatorA"]);
                        int genB = static_cast<int>(match.parameters["generatorB"]);
                        std::cout << "    Generators: " << genA << ":" << genB << std::endl;
                    }
                    
                    std::cout << "    Pattern: ";
                    for (int j = 0; j < match.pattern.durations.size(); ++j)
                    {
                        std::cout << match.pattern.durations[j];
                        if (j < match.pattern.durations.size() - 1)
                            std::cout << ", ";
                    }
                    std::cout << std::endl;
                }
            }
            else
            {
                std::cout << "Failed to find matches: " << result.getErrorMessage() << std::endl;
            }
        });
    }
    
    void demonstrateOfflineMode()
    {
        std::cout << "\n=== Offline Mode Demo ===" << std::endl;
        
        // Enable offline mode
        sdk->setOfflineMode(true);
        std::cout << "Offline mode enabled: " << (sdk->isOfflineModeEnabled() ? "Yes" : "No") << std::endl;
        
        // Generate patterns offline
        auto& rhythmAPI = sdk->getRhythmAPI();
        
        RhythmPattern pattern1, pattern2;
        auto result1 = rhythmAPI.generateResultantSync(4, 3, pattern1);
        auto result2 = rhythmAPI.generateResultantSync(5, 2, pattern2);
        
        if (result1.wasOk() && result2.wasOk())
        {
            std::cout << "Successfully generated patterns offline:" << std::endl;
            
            std::cout << "4:3 pattern: ";
            for (int i = 0; i < pattern1.durations.size(); ++i)
            {
                std::cout << pattern1.durations[i];
                if (i < pattern1.durations.size() - 1)
                    std::cout << ", ";
            }
            std::cout << std::endl;
            
            std::cout << "5:2 pattern: ";
            for (int i = 0; i < pattern2.durations.size(); ++i)
            {
                std::cout << pattern2.durations[i];
                if (i < pattern2.durations.size() - 1)
                    std::cout << ", ";
            }
            std::cout << std::endl;
        }
        
        // Disable offline mode
        sdk->setOfflineMode(false);
        std::cout << "Offline mode disabled." << std::endl;
    }
    
    void run()
    {
        std::cout << "Starting Schillinger SDK demonstration..." << std::endl;
        
        demonstrateRhythmGeneration();
        demonstrateReverseAnalysis();
        demonstratePatternMatching();
        demonstrateOfflineMode();
        
        std::cout << "\nDemo completed!" << std::endl;
    }

private:
    std::unique_ptr<SchillingerSDK> sdk;
};

//==============================================================================
int main()
{
    // Initialize JUCE
    juce::initialiseJuce_GUI();
    
    try
    {
        SchillingerSDKExample example;
        example.run();
    }
    catch (const std::exception& e)
    {
        std::cout << "Exception: " << e.what() << std::endl;
        return 1;
    }
    
    // Cleanup JUCE
    juce::shutdownJuce_GUI();
    
    return 0;
}