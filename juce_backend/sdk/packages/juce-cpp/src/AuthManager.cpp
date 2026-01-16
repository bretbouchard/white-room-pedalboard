/*
  ==============================================================================

    AuthManager.cpp
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#include "AuthManager.h"
#include "NetworkManager.h"
#include "ErrorHandling.h"
#include <juce_core/juce_core.h>

namespace Schillinger
{
    //==============================================================================
    struct AuthManager::Impl
    {
        SDKOptions options;
        AuthCredentials currentCredentials;
        juce::String authToken;
        juce::Time tokenExpiry;
        bool authenticated = false;
        juce::String lastError;
        
        // Secure storage for credentials
        juce::PropertiesFile::Options storageOptions;
        std::unique_ptr<juce::PropertiesFile> secureStorage;
        
        Impl()
        {
            // Configure secure storage
            storageOptions.applicationName = "SchillingerSDK";
            storageOptions.filenameSuffix = ".credentials";
            storageOptions.osxLibrarySubFolder = "Application Support";
            storageOptions.folderName = "SchillingerSDK";
            storageOptions.ignoreCaseOfKeyNames = false;
            storageOptions.millisecondsBeforeSaving = 1000;
            storageOptions.storageFormat = juce::PropertiesFile::storeAsXML;
            
            secureStorage = std::make_unique<juce::PropertiesFile>(storageOptions);
        }
        
        void storeCredentials(const AuthCredentials& credentials)
        {
            if (credentials.apiKey.isNotEmpty())
                secureStorage->setValue("apiKey", credentials.apiKey);
            
            if (credentials.clerkToken.isNotEmpty())
                secureStorage->setValue("clerkToken", credentials.clerkToken);
            
            if (!credentials.customAuth.isVoid())
                secureStorage->setValue("customAuth", credentials.customAuth.toString());
            
            secureStorage->saveIfNeeded();
        }
        
        AuthCredentials loadStoredCredentials()
        {
            AuthCredentials credentials;
            credentials.apiKey = secureStorage->getValue("apiKey", "");
            credentials.clerkToken = secureStorage->getValue("clerkToken", "");
            
            auto customAuthStr = secureStorage->getValue("customAuth", "");
            if (customAuthStr.isNotEmpty())
            {
                // Parse JSON string back to var
                auto result = juce::JSON::parse(customAuthStr);
                if (!result.isVoid() && result.isObject())
                    credentials.customAuth = result;
            }
            
            return credentials;
        }
        
        void clearStoredCredentials()
        {
            secureStorage->removeValue("apiKey");
            secureStorage->removeValue("clerkToken");
            secureStorage->removeValue("customAuth");
            secureStorage->saveIfNeeded();
        }
    };

    //==============================================================================
    AuthManager::AuthManager()
        : pimpl(std::make_unique<Impl>())
    {
    }

    AuthManager::~AuthManager() = default;

    juce::Result AuthManager::configure(const SDKOptions& options)
    {
        pimpl->options = options;
        
        // Try to load stored credentials
        auto storedCredentials = pimpl->loadStoredCredentials();
        if (storedCredentials.isValid())
        {
            pimpl->currentCredentials = storedCredentials;
            // Note: We don't automatically authenticate here, 
            // the user needs to call authenticate() explicitly
        }
        
        return juce::Result::ok();
    }

    void AuthManager::authenticate(const AuthCredentials& credentials,
                                  std::function<void(juce::Result)> callback)
    {
        if (!credentials.isValid())
        {
            callback(juce::Result::fail("Invalid credentials provided"));
            return;
        }
        
        // Store credentials for future use
        pimpl->currentCredentials = credentials;
        pimpl->storeCredentials(credentials);
        
        // For API key authentication, we can authenticate immediately
        if (credentials.apiKey.isNotEmpty())
        {
            pimpl->authToken = credentials.apiKey;
            pimpl->authenticated = true;
            pimpl->tokenExpiry = juce::Time::getCurrentTime() + juce::RelativeTime::hours(24);
            callback(juce::Result::ok());
            return;
        }
        
        // For Clerk token authentication, validate with server
        if (credentials.clerkToken.isNotEmpty())
        {
            // This would typically make a network request to validate the token
            // For now, we'll simulate successful authentication
            pimpl->authToken = credentials.clerkToken;
            pimpl->authenticated = true;
            pimpl->tokenExpiry = juce::Time::getCurrentTime() + juce::RelativeTime::hours(1);
            
            // In a real implementation, this would be async
            juce::MessageManager::callAsync([callback]()
            {
                callback(juce::Result::ok());
            });
            return;
        }
        
        // For custom auth, handle according to the custom implementation
        if (!credentials.customAuth.isVoid())
        {
            // Custom authentication logic would go here
            pimpl->authenticated = true;
            pimpl->authToken = "custom_token";
            pimpl->tokenExpiry = juce::Time::getCurrentTime() + juce::RelativeTime::hours(2);
            
            juce::MessageManager::callAsync([callback]()
            {
                callback(juce::Result::ok());
            });
            return;
        }
        
        callback(juce::Result::fail("No valid authentication method found"));
    }

    bool AuthManager::isAuthenticated() const noexcept
    {
        if (!pimpl->authenticated)
            return false;
        
        // Check if token has expired
        if (juce::Time::getCurrentTime() > pimpl->tokenExpiry)
            return false;
        
        return true;
    }

    juce::Result AuthManager::getStatus() const
    {
        if (!pimpl->authenticated)
            return juce::Result::fail("Not authenticated");
        
        if (juce::Time::getCurrentTime() > pimpl->tokenExpiry)
            return juce::Result::fail("Authentication token has expired");
        
        return juce::Result::ok();
    }

    juce::String AuthManager::getAuthToken() const
    {
        if (!isAuthenticated())
            return {};
        
        return pimpl->authToken;
    }

    void AuthManager::refreshToken(std::function<void(juce::Result)> callback)
    {
        if (!pimpl->currentCredentials.isValid())
        {
            callback(juce::Result::fail("No credentials available for token refresh"));
            return;
        }
        
        // Re-authenticate with stored credentials
        authenticate(pimpl->currentCredentials, std::move(callback));
    }

    juce::Result AuthManager::clearCredentials()
    {
        pimpl->clearStoredCredentials();
        pimpl->currentCredentials = AuthCredentials{};
        pimpl->authToken.clear();
        pimpl->authenticated = false;
        pimpl->tokenExpiry = juce::Time{};
        
        return juce::Result::ok();
    }

} // namespace Schillinger