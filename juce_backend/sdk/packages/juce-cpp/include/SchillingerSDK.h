/*
  ==============================================================================

    SchillingerSDK.h
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#pragma once

#include <juce_core/juce_core.h>
#include <juce_data_structures/juce_data_structures.h>
#include <juce_events/juce_events.h>
#include <memory>
#include <functional>
#include <vector>
#include <map>

namespace Schillinger
{
    // Forward declarations
    class AuthManager;
    class RhythmAPI;
    class HarmonyAPI;
    class CompositionAPI;
    class RealtimeAudioAPI;
    class NetworkManager;
    class ErrorHandler;

    //==============================================================================
    /** Configuration options for the Schillinger SDK */
    struct SDKOptions
    {
        juce::String apiBaseUrl = "https://api.schillinger.com";
        juce::String apiVersion = "v1";
        int timeoutMs = 30000;
        bool enableOfflineMode = true;
        bool enableCaching = true;
        juce::String userAgent = "SchillingerSDK-JUCE/1.0.0";
        
        /** Custom headers to include with requests */
        juce::StringPairArray customHeaders;
    };

    //==============================================================================
    /** Authentication credentials for the SDK */
    struct AuthCredentials
    {
        juce::String apiKey;
        juce::String clerkToken;
        juce::var customAuth;
        
        bool isValid() const noexcept
        {
            return apiKey.isNotEmpty() || clerkToken.isNotEmpty() || !customAuth.isVoid();
        }
    };

    //==============================================================================
    /** Represents a rhythm pattern in the Schillinger system */
    struct RhythmPattern
    {
        juce::Array<int> durations;
        std::pair<int, int> timeSignature {4, 4};
        int tempo = 120;
        double swing = 0.0;
        juce::var metadata;
        
        /** Convert to JSON representation */
        juce::var toJson() const;
        
        /** Create from JSON representation */
        static RhythmPattern fromJson(const juce::var& json);
        
        /** Validate the pattern data */
        juce::Result validate() const;
    };

    //==============================================================================
    /** Represents a chord progression */
    struct ChordProgression
    {
        juce::StringArray chords;
        juce::String key = "C";
        juce::String scale = "major";
        juce::var metadata;
        
        /** Convert to JSON representation */
        juce::var toJson() const;
        
        /** Create from JSON representation */
        static ChordProgression fromJson(const juce::var& json);
        
        /** Validate the progression data */
        juce::Result validate() const;
    };

    //==============================================================================
    /** Represents a musical composition */
    struct Composition
    {
        juce::String id;
        juce::String name;
        juce::String key = "C";
        juce::String scale = "major";
        int tempo = 120;
        std::pair<int, int> timeSignature {4, 4};
        juce::var sections;
        juce::var metadata;
        
        /** Convert to JSON representation */
        juce::var toJson() const;
        
        /** Create from JSON representation */
        static Composition fromJson(const juce::var& json);
        
        /** Validate the composition data */
        juce::Result validate() const;
    };

    //==============================================================================
    /** Analysis results for rhythm patterns */
    struct RhythmAnalysis
    {
        double complexity = 0.0;
        double syncopation = 0.0;
        double density = 0.0;
        juce::var patterns;
        juce::StringArray suggestions;
        
        /** Convert to JSON representation */
        juce::var toJson() const;
        
        /** Create from JSON representation */
        static RhythmAnalysis fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Analysis results for harmonic progressions */
    struct HarmonicAnalysis
    {
        double keyStability = 0.0;
        juce::Array<double> tensionCurve;
        juce::StringArray functionalAnalysis;
        double voiceLeadingQuality = 0.0;
        juce::StringArray suggestions;
        
        /** Convert to JSON representation */
        juce::var toJson() const;
        
        /** Create from JSON representation */
        static HarmonicAnalysis fromJson(const juce::var& json);
    };

    //==============================================================================
    /** Callback function type for async operations */
    template<typename T>
    using AsyncCallback = std::function<void(juce::Result, T)>;

    //==============================================================================
    /**
        Main SDK class providing access to all Schillinger System functionality.
        
        This class follows JUCE coding standards and provides a clean interface
        for integrating Schillinger mathematical music composition capabilities
        into JUCE applications.
        
        Example usage:
        @code
        auto sdk = std::make_unique<SchillingerSDK>();
        
        SDKOptions options;
        options.apiBaseUrl = "https://api.schillinger.com";
        
        AuthCredentials credentials;
        credentials.apiKey = "your-api-key";
        
        auto result = sdk->configure(options);
        if (result.wasOk())
        {
            sdk->authenticate(credentials, [](juce::Result authResult)
            {
                if (authResult.wasOk())
                {
                    // SDK is ready to use
                }
            });
        }
        @endcode
    */
    class SchillingerSDK
    {
    public:
        //==============================================================================
        /** Constructor */
        SchillingerSDK();
        
        /** Destructor */
        ~SchillingerSDK();

        //==============================================================================
        /** Configure the SDK with options */
        juce::Result configure(const SDKOptions& options);
        
        /** Authenticate with the Schillinger System */
        void authenticate(const AuthCredentials& credentials, 
                         std::function<void(juce::Result)> callback);
        
        /** Check if the SDK is authenticated */
        bool isAuthenticated() const noexcept;
        
        /** Get current authentication status */
        juce::Result getAuthStatus() const;

        //==============================================================================
        /** Access to rhythm generation and analysis */
        RhythmAPI& getRhythmAPI() noexcept;
        
        /** Access to harmony generation and analysis */
        HarmonyAPI& getHarmonyAPI() noexcept;
        
        /** Access to composition tools */
        CompositionAPI& getCompositionAPI() noexcept;
        
        /** Access to real-time audio processing capabilities */
        RealtimeAudioAPI& getRealtimeAudioAPI() noexcept;

        //==============================================================================
        /** Enable or disable offline mode */
        void setOfflineMode(bool enabled) noexcept;
        
        /** Check if offline mode is enabled */
        bool isOfflineModeEnabled() const noexcept;
        
        /** Clear all cached data */
        juce::Result clearCache();
        
        /** Get cache statistics */
        juce::var getCacheStats() const;

        //==============================================================================
        /** Set error handler for SDK-wide error handling */
        void setErrorHandler(std::function<void(const juce::String&, const juce::String&)> handler);
        
        /** Get SDK version information */
        static juce::String getVersion() noexcept;
        
        /** Get SDK build information */
        static juce::var getBuildInfo() noexcept;

    private:
        //==============================================================================
        struct Impl;
        std::unique_ptr<Impl> pimpl;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(SchillingerSDK)
    };

} // namespace Schillinger