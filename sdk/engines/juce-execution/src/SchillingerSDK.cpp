/*
  ==============================================================================

    SchillingerSDK.cpp
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#include "../include/SchillingerSDK.h"
#include "../include/RhythmAPI.h"
#include "../include/HarmonyAPI.h"
#include "../include/CompositionAPI.h"
#include "../include/RealtimeAudioAPI.h"
#include "AuthManager.h"
#include "NetworkManager.h"
#include "ErrorHandling.h"
#include <juce_core/juce_core.h>

namespace Schillinger
{
    //==============================================================================
    // RhythmPattern implementation
    juce::var RhythmPattern::toJson() const
    {
        auto json = new juce::DynamicObject();
        
        auto durationsArray = new juce::Array<juce::var>();
        for (int duration : durations)
            durationsArray->add(duration);
        json->setProperty("durations", juce::var(durationsArray));
        
        auto timeSignatureArray = new juce::Array<juce::var>();
        timeSignatureArray->add(timeSignature.first);
        timeSignatureArray->add(timeSignature.second);
        json->setProperty("timeSignature", juce::var(timeSignatureArray));
        
        json->setProperty("tempo", tempo);
        json->setProperty("swing", swing);
        json->setProperty("metadata", metadata);
        
        return juce::var(json);
    }

    RhythmPattern RhythmPattern::fromJson(const juce::var& json)
    {
        RhythmPattern pattern;
        
        if (json.hasProperty("durations"))
        {
            auto durationsArray = json["durations"].getArray();
            if (durationsArray != nullptr)
            {
                for (const auto& duration : *durationsArray)
                    pattern.durations.add(static_cast<int>(duration));
            }
        }
        
        if (json.hasProperty("timeSignature"))
        {
            auto tsArray = json["timeSignature"].getArray();
            if (tsArray != nullptr && tsArray->size() >= 2)
            {
                pattern.timeSignature.first = static_cast<int>((*tsArray)[0]);
                pattern.timeSignature.second = static_cast<int>((*tsArray)[1]);
            }
        }
        
        if (json.hasProperty("tempo"))
            pattern.tempo = static_cast<int>(json["tempo"]);
        
        if (json.hasProperty("swing"))
            pattern.swing = static_cast<double>(json["swing"]);
        
        if (json.hasProperty("metadata"))
            pattern.metadata = json["metadata"];
        
        return pattern;
    }

    juce::Result RhythmPattern::validate() const
    {
        if (durations.isEmpty())
            return juce::Result::fail("Rhythm pattern must have at least one duration");
        
        for (int duration : durations)
        {
            if (duration <= 0)
                return juce::Result::fail("All durations must be positive");
        }
        
        if (timeSignature.first <= 0 || timeSignature.second <= 0)
            return juce::Result::fail("Time signature must have positive values");
        
        if (tempo <= 0 || tempo > 300)
            return juce::Result::fail("Tempo must be between 1 and 300 BPM");
        
        if (swing < 0.0 || swing > 1.0)
            return juce::Result::fail("Swing must be between 0.0 and 1.0");
        
        return juce::Result::ok();
    }

    //==============================================================================
    // ChordProgression implementation
    juce::var ChordProgression::toJson() const
    {
        auto json = new juce::DynamicObject();
        
        auto chordsArray = new juce::Array<juce::var>();
        for (const auto& chord : chords)
            chordsArray->add(chord);
        json->setProperty("chords", juce::var(chordsArray));
        
        json->setProperty("key", key);
        json->setProperty("scale", scale);
        json->setProperty("metadata", metadata);
        
        return juce::var(json);
    }

    ChordProgression ChordProgression::fromJson(const juce::var& json)
    {
        ChordProgression progression;
        
        if (json.hasProperty("chords"))
        {
            auto chordsArray = json["chords"].getArray();
            if (chordsArray != nullptr)
            {
                for (const auto& chord : *chordsArray)
                    progression.chords.add(chord.toString());
            }
        }
        
        if (json.hasProperty("key"))
            progression.key = json["key"].toString();
        
        if (json.hasProperty("scale"))
            progression.scale = json["scale"].toString();
        
        if (json.hasProperty("metadata"))
            progression.metadata = json["metadata"];
        
        return progression;
    }

    juce::Result ChordProgression::validate() const
    {
        if (chords.isEmpty())
            return juce::Result::fail("Chord progression must have at least one chord");
        
        if (key.isEmpty())
            return juce::Result::fail("Key must be specified");
        
        if (scale.isEmpty())
            return juce::Result::fail("Scale must be specified");
        
        // Basic chord symbol validation
        for (const auto& chord : chords)
        {
            if (chord.isEmpty())
                return juce::Result::fail("Chord symbols cannot be empty");
        }
        
        return juce::Result::ok();
    }

    //==============================================================================
    // Composition implementation
    juce::var Composition::toJson() const
    {
        auto json = new juce::DynamicObject();
        
        json->setProperty("id", id);
        json->setProperty("name", name);
        json->setProperty("key", key);
        json->setProperty("scale", scale);
        json->setProperty("tempo", tempo);
        
        auto timeSignatureArray = new juce::Array<juce::var>();
        timeSignatureArray->add(timeSignature.first);
        timeSignatureArray->add(timeSignature.second);
        json->setProperty("timeSignature", juce::var(timeSignatureArray));
        
        json->setProperty("sections", sections);
        json->setProperty("metadata", metadata);
        
        return juce::var(json);
    }

    Composition Composition::fromJson(const juce::var& json)
    {
        Composition composition;
        
        if (json.hasProperty("id"))
            composition.id = json["id"].toString();
        
        if (json.hasProperty("name"))
            composition.name = json["name"].toString();
        
        if (json.hasProperty("key"))
            composition.key = json["key"].toString();
        
        if (json.hasProperty("scale"))
            composition.scale = json["scale"].toString();
        
        if (json.hasProperty("tempo"))
            composition.tempo = static_cast<int>(json["tempo"]);
        
        if (json.hasProperty("timeSignature"))
        {
            auto tsArray = json["timeSignature"].getArray();
            if (tsArray != nullptr && tsArray->size() >= 2)
            {
                composition.timeSignature.first = static_cast<int>((*tsArray)[0]);
                composition.timeSignature.second = static_cast<int>((*tsArray)[1]);
            }
        }
        
        if (json.hasProperty("sections"))
            composition.sections = json["sections"];
        
        if (json.hasProperty("metadata"))
            composition.metadata = json["metadata"];
        
        return composition;
    }

    juce::Result Composition::validate() const
    {
        if (name.isEmpty())
            return juce::Result::fail("Composition name cannot be empty");
        
        if (key.isEmpty())
            return juce::Result::fail("Key must be specified");
        
        if (scale.isEmpty())
            return juce::Result::fail("Scale must be specified");
        
        if (tempo <= 0 || tempo > 300)
            return juce::Result::fail("Tempo must be between 1 and 300 BPM");
        
        if (timeSignature.first <= 0 || timeSignature.second <= 0)
            return juce::Result::fail("Time signature must have positive values");
        
        return juce::Result::ok();
    }

    //==============================================================================
    // RhythmAnalysis implementation
    juce::var RhythmAnalysis::toJson() const
    {
        auto json = new juce::DynamicObject();
        
        json->setProperty("complexity", complexity);
        json->setProperty("syncopation", syncopation);
        json->setProperty("density", density);
        json->setProperty("patterns", patterns);
        
        auto suggestionsArray = new juce::Array<juce::var>();
        for (const auto& suggestion : suggestions)
            suggestionsArray->add(suggestion);
        json->setProperty("suggestions", juce::var(suggestionsArray));
        
        return juce::var(json);
    }

    RhythmAnalysis RhythmAnalysis::fromJson(const juce::var& json)
    {
        RhythmAnalysis analysis;
        
        if (json.hasProperty("complexity"))
            analysis.complexity = static_cast<double>(json["complexity"]);
        
        if (json.hasProperty("syncopation"))
            analysis.syncopation = static_cast<double>(json["syncopation"]);
        
        if (json.hasProperty("density"))
            analysis.density = static_cast<double>(json["density"]);
        
        if (json.hasProperty("patterns"))
            analysis.patterns = json["patterns"];
        
        if (json.hasProperty("suggestions"))
        {
            auto suggestionsArray = json["suggestions"].getArray();
            if (suggestionsArray != nullptr)
            {
                for (const auto& suggestion : *suggestionsArray)
                    analysis.suggestions.add(suggestion.toString());
            }
        }
        
        return analysis;
    }

    //==============================================================================
    // HarmonicAnalysis implementation
    juce::var HarmonicAnalysis::toJson() const
    {
        auto json = new juce::DynamicObject();
        
        json->setProperty("keyStability", keyStability);
        
        auto tensionArray = new juce::Array<juce::var>();
        for (double tension : tensionCurve)
            tensionArray->add(tension);
        json->setProperty("tensionCurve", juce::var(tensionArray));
        
        auto functionalArray = new juce::Array<juce::var>();
        for (const auto& function : functionalAnalysis)
            functionalArray->add(function);
        json->setProperty("functionalAnalysis", juce::var(functionalArray));
        
        json->setProperty("voiceLeadingQuality", voiceLeadingQuality);
        
        auto suggestionsArray = new juce::Array<juce::var>();
        for (const auto& suggestion : suggestions)
            suggestionsArray->add(suggestion);
        json->setProperty("suggestions", juce::var(suggestionsArray));
        
        return juce::var(json);
    }

    HarmonicAnalysis HarmonicAnalysis::fromJson(const juce::var& json)
    {
        HarmonicAnalysis analysis;
        
        if (json.hasProperty("keyStability"))
            analysis.keyStability = static_cast<double>(json["keyStability"]);
        
        if (json.hasProperty("tensionCurve"))
        {
            auto tensionArray = json["tensionCurve"].getArray();
            if (tensionArray != nullptr)
            {
                for (const auto& tension : *tensionArray)
                    analysis.tensionCurve.add(static_cast<double>(tension));
            }
        }
        
        if (json.hasProperty("functionalAnalysis"))
        {
            auto functionalArray = json["functionalAnalysis"].getArray();
            if (functionalArray != nullptr)
            {
                for (const auto& function : *functionalArray)
                    analysis.functionalAnalysis.add(function.toString());
            }
        }
        
        if (json.hasProperty("voiceLeadingQuality"))
            analysis.voiceLeadingQuality = static_cast<double>(json["voiceLeadingQuality"]);
        
        if (json.hasProperty("suggestions"))
        {
            auto suggestionsArray = json["suggestions"].getArray();
            if (suggestionsArray != nullptr)
            {
                for (const auto& suggestion : *suggestionsArray)
                    analysis.suggestions.add(suggestion.toString());
            }
        }
        
        return analysis;
    }

    //==============================================================================
    // SchillingerSDK::Impl
    struct SchillingerSDK::Impl
    {
        SDKOptions options;
        std::unique_ptr<AuthManager> authManager;
        std::unique_ptr<NetworkManager> networkManager;
        std::unique_ptr<RhythmAPI> rhythmAPI;
        std::unique_ptr<HarmonyAPI> harmonyAPI;
        std::unique_ptr<CompositionAPI> compositionAPI;
        std::unique_ptr<RealtimeAudioAPI> realtimeAudioAPI;
        std::function<void(const juce::String&, const juce::String&)> errorHandler;
        bool offlineModeEnabled = false;
        
        Impl()
        {
            authManager = std::make_unique<AuthManager>();
            networkManager = std::make_unique<NetworkManager>();
        }
    };

    //==============================================================================
    // SchillingerSDK implementation
    SchillingerSDK::SchillingerSDK()
        : pimpl(std::make_unique<Impl>())
    {
        pimpl->rhythmAPI = std::make_unique<RhythmAPI>(this);
        pimpl->harmonyAPI = std::make_unique<HarmonyAPI>(this);
        pimpl->compositionAPI = std::make_unique<CompositionAPI>(this);
        pimpl->realtimeAudioAPI = std::make_unique<RealtimeAudioAPI>(this);
    }

    SchillingerSDK::~SchillingerSDK() = default;

    juce::Result SchillingerSDK::configure(const SDKOptions& options)
    {
        pimpl->options = options;
        
        // Configure network manager
        auto networkResult = pimpl->networkManager->configure(options);
        if (!networkResult.wasOk())
            return networkResult;
        
        // Configure auth manager
        auto authResult = pimpl->authManager->configure(options);
        if (!authResult.wasOk())
            return authResult;
        
        return juce::Result::ok();
    }

    void SchillingerSDK::authenticate(const AuthCredentials& credentials, 
                                     std::function<void(juce::Result)> callback)
    {
        if (!credentials.isValid())
        {
            callback(juce::Result::fail("Invalid credentials provided"));
            return;
        }
        
        pimpl->authManager->authenticate(credentials, std::move(callback));
    }

    bool SchillingerSDK::isAuthenticated() const noexcept
    {
        return pimpl->authManager->isAuthenticated();
    }

    juce::Result SchillingerSDK::getAuthStatus() const
    {
        return pimpl->authManager->getStatus();
    }

    RhythmAPI& SchillingerSDK::getRhythmAPI() noexcept
    {
        return *pimpl->rhythmAPI;
    }

    HarmonyAPI& SchillingerSDK::getHarmonyAPI() noexcept
    {
        return *pimpl->harmonyAPI;
    }

    CompositionAPI& SchillingerSDK::getCompositionAPI() noexcept
    {
        return *pimpl->compositionAPI;
    }

    RealtimeAudioAPI& SchillingerSDK::getRealtimeAudioAPI() noexcept
    {
        return *pimpl->realtimeAudioAPI;
    }

    void SchillingerSDK::setOfflineMode(bool enabled) noexcept
    {
        pimpl->offlineModeEnabled = enabled;
        pimpl->networkManager->setOfflineMode(enabled);
    }

    bool SchillingerSDK::isOfflineModeEnabled() const noexcept
    {
        return pimpl->offlineModeEnabled;
    }

    juce::Result SchillingerSDK::clearCache()
    {
        return pimpl->networkManager->clearCache();
    }

    juce::var SchillingerSDK::getCacheStats() const
    {
        return pimpl->networkManager->getCacheStats();
    }

    void SchillingerSDK::setErrorHandler(std::function<void(const juce::String&, const juce::String&)> handler)
    {
        pimpl->errorHandler = std::move(handler);
        ErrorHandler::setGlobalHandler(pimpl->errorHandler);
    }

    juce::String SchillingerSDK::getVersion() noexcept
    {
        return "1.0.0";
    }

    juce::var SchillingerSDK::getBuildInfo() noexcept
    {
        auto info = new juce::DynamicObject();
        info->setProperty("version", getVersion());
        info->setProperty("buildDate", __DATE__);
        info->setProperty("buildTime", __TIME__);
        info->setProperty("juceVersion", juce::SystemStats::getJUCEVersion());
        info->setProperty("platform", juce::SystemStats::getOperatingSystemName());
        return juce::var(info);
    }

} // namespace Schillinger