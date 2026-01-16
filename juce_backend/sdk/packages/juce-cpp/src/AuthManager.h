/*
  ==============================================================================

    AuthManager.h
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
        Manages authentication for the Schillinger SDK.
        
        Handles API key authentication, token refresh, and credential storage
        using JUCE's secure storage mechanisms.
    */
    class AuthManager
    {
    public:
        //==============================================================================
        AuthManager();
        ~AuthManager();

        //==============================================================================
        /** Configure the auth manager */
        juce::Result configure(const SDKOptions& options);
        
        /** Authenticate with credentials */
        void authenticate(const AuthCredentials& credentials,
                         std::function<void(juce::Result)> callback);
        
        /** Check if currently authenticated */
        bool isAuthenticated() const noexcept;
        
        /** Get current authentication status */
        juce::Result getStatus() const;
        
        /** Get current auth token for requests */
        juce::String getAuthToken() const;
        
        /** Refresh authentication token */
        void refreshToken(std::function<void(juce::Result)> callback);
        
        /** Clear stored credentials */
        juce::Result clearCredentials();

    private:
        //==============================================================================
        struct Impl;
        std::unique_ptr<Impl> pimpl;
        
        JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AuthManager)
    };

} // namespace Schillinger