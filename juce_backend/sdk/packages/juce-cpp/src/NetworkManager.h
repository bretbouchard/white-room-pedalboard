/*
  ==============================================================================

    NetworkManager.h
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#pragma once

#include "../include/SchillingerSDK.h"
#include <juce_core/juce_core.h>
#include <functional>

namespace Schillinger
{
    /**
        Manages network requests for the Schillinger SDK.
        
        Handles HTTP requests, caching, offline mode, and response parsing
        using JUCE's networking classes.
    */
    class NetworkManager
    {
    public:
        //==============================================================================
        /** HTTP methods */
        enum class HttpMethod
        {
            GET,
            POST,
            PUT,
            DELETE,
            PATCH
        };
        
        /** Request options */
        struct RequestOptions
        {
            HttpMethod method = HttpMethod::GET;
            juce::String endpoint;
            juce::var body;
            juce::StringPairArray headers;
            int timeoutMs = 30000;
            bool useCache = true;
            bool requireAuth = true;
        };
        
        /** Response data */
        struct Response
        {
            int statusCode = 0;
            juce::String statusText;
            juce::var data;
            juce::StringPairArray headers;
            bool fromCache = false;
            juce::String error;
            
            bool isSuccess() const { return statusCode >= 200 && statusCode < 300; }
        };
        
        /** Callback for async requests */
        using ResponseCallback = std::function<void(Response)>;

        //==============================================================================
        NetworkManager();
        ~NetworkManager();

        //==============================================================================
        /** Configure the network manager */
        juce::Result configure(const SDKOptions& options);
        
        /** Make an async HTTP request */
        void makeRequest(const RequestOptions& options, ResponseCallback callback);
        
        /** Make a synchronous HTTP request (for offline-capable operations) */
        Response makeRequestSync(const RequestOptions& options);
        
        /** Set offline mode */
        void setOfflineMode(bool enabled) noexcept;
        
        /** Check if offline mode is enabled */
        bool isOfflineModeEnabled() const noexcept;
        
        /** Clear cache */
        juce::Result clearCache();
        
        /** Get cache statistics */
        juce::var getCacheStats() const;
        
        /** Set auth token for requests */
        void setAuthToken(const juce::String& token);

    private:
        //==============================================================================
        struct Impl;
        std::unique_ptr<Impl> pimpl;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(NetworkManager)
    };

} // namespace Schillinger