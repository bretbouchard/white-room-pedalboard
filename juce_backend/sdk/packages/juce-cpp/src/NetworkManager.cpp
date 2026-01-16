/*
  ==============================================================================

    NetworkManager.cpp
    Created: 29 Jul 2025
    Author:  Schillinger System

  ==============================================================================
*/

#include "NetworkManager.h"
#include "ErrorHandling.h"
#include <juce_core/juce_core.h>

namespace Schillinger
{
    //==============================================================================
    struct NetworkManager::Impl
    {
        SDKOptions options;
        juce::String authToken;
        bool offlineModeEnabled = false;
        
        // Simple in-memory cache
        struct CacheEntry
        {
            juce::var data;
            juce::Time timestamp;
            juce::Time expiry;
        };
        
        std::map<juce::String, CacheEntry> cache;
        juce::CriticalSection cacheLock;
        
        juce::String buildUrl(const juce::String& endpoint) const
        {
            juce::String url = options.apiBaseUrl;
            if (!url.endsWith("/"))
                url += "/";
            
            if (options.apiVersion.isNotEmpty())
            {
                url += options.apiVersion;
                if (!url.endsWith("/"))
                    url += "/";
            }
            
            if (endpoint.startsWith("/"))
                url += endpoint.substring(1);
            else
                url += endpoint;
            
            return url;
        }
        
        juce::String getCacheKey(const RequestOptions& options) const
        {
            juce::String key = juce::String(static_cast<int>(options.method)) + ":" + options.endpoint;
            if (!options.body.isVoid())
                key += ":" + juce::JSON::toString(options.body);
            return key;
        }
        
        bool getCachedResponse(const juce::String& cacheKey, Response& response)
        {
            juce::ScopedLock lock(cacheLock);
            
            auto it = cache.find(cacheKey.toStdString());
            if (it == cache.end())
                return false;
            
            const auto& entry = it->second;
            if (juce::Time::getCurrentTime() > entry.expiry)
            {
                cache.erase(it);
                return false;
            }
            
            response.statusCode = 200;
            response.statusText = "OK";
            response.data = entry.data;
            response.fromCache = true;
            
            return true;
        }
        
        void setCachedResponse(const juce::String& cacheKey, const Response& response)
        {
            if (!response.isSuccess())
                return;
            
            juce::ScopedLock lock(cacheLock);
            
            CacheEntry entry;
            entry.data = response.data;
            entry.timestamp = juce::Time::getCurrentTime();
            entry.expiry = entry.timestamp + juce::RelativeTime::minutes(15); // 15 minute cache
            
            cache[cacheKey.toStdString()] = entry;
        }
        
        Response createOfflineResponse(const juce::String& error = "Offline mode enabled")
        {
            Response response;
            response.statusCode = 0;
            response.statusText = "Offline";
            response.error = error;
            return response;
        }
        
        Response parseHttpResponse(juce::InputStream* stream, int statusCode, const juce::String& statusText)
        {
            Response response;
            response.statusCode = statusCode;
            response.statusText = statusText;
            
            if (stream != nullptr)
            {
                juce::String responseText = stream->readEntireStreamAsString();
                
                if (responseText.isNotEmpty())
                {
                    auto parseResult = juce::JSON::parse(responseText);
                    if (!parseResult.isVoid() && parseResult.isObject())
                    {
                        response.data = parseResult;
                    }
                    else
                    {
                        // If not JSON, store as string
                        response.data = responseText;
                    }
                }
            }
            
            if (!response.isSuccess() && response.error.isEmpty())
            {
                response.error = "HTTP " + juce::String(statusCode) + ": " + statusText;
            }
            
            return response;
        }
    };

    //==============================================================================
    NetworkManager::NetworkManager()
        : pimpl(std::make_unique<Impl>())
    {
    }

    NetworkManager::~NetworkManager() = default;

    juce::Result NetworkManager::configure(const SDKOptions& options)
    {
        pimpl->options = options;
        
        if (options.apiBaseUrl.isEmpty())
            return juce::Result::fail("API base URL must be specified");
        
        return juce::Result::ok();
    }

    void NetworkManager::makeRequest(const RequestOptions& options, ResponseCallback callback)
    {
        // Check offline mode
        if (pimpl->offlineModeEnabled)
        {
            callback(pimpl->createOfflineResponse());
            return;
        }
        
        // Check cache first
        if (options.useCache && options.method == HttpMethod::GET)
        {
            auto cacheKey = pimpl->getCacheKey(options);
            Response cachedResponse;
            if (pimpl->getCachedResponse(cacheKey, cachedResponse))
            {
                callback(cachedResponse);
                return;
            }
        }
        
        // Build URL
        juce::String url = pimpl->buildUrl(options.endpoint);
        juce::URL juceUrl(url);

        // Add headers
        juce::StringPairArray headers = options.headers;
        headers.set("User-Agent", pimpl->options.userAgent);
        headers.set("Content-Type", "application/json");

        // Add custom headers from options
        for (int i = 0; i < pimpl->options.customHeaders.size(); ++i)
        {
            headers.set(pimpl->options.customHeaders.getAllKeys()[i],
                       pimpl->options.customHeaders.getAllValues()[i]);
        }

        // Add auth header if required and available
        if (options.requireAuth && pimpl->authToken.isNotEmpty())
        {
            headers.set("Authorization", "Bearer " + pimpl->authToken);
        }

        // For POST/PUT/PATCH requests, add body using withPOSTData (JUCE 8.0.8)
        if (options.method == HttpMethod::POST || options.method == HttpMethod::PUT || options.method == HttpMethod::PATCH)
        {
            if (!options.body.isVoid())
            {
                juce::String bodyString = juce::JSON::toString(options.body);
                juceUrl = juceUrl.withPOSTData(bodyString);
            }
        }

        // Create input stream options
        juce::URL::InputStreamOptions streamOptions(juce::URL::ParameterHandling::inAddress);
        streamOptions = streamOptions.withConnectionTimeoutMs(options.timeoutMs)
                                   .withResponseHeaders(&headers)
                                   .withExtraHeaders(headers.getDescription());

        // Make async request
        juceUrl.createInputStream(streamOptions, [this, options, callback, cacheKey = pimpl->getCacheKey(options)]
                                 (std::unique_ptr<juce::InputStream> stream, bool success, juce::String error)
        {
            Response response;

            if (success && stream != nullptr)
            {
                // For JUCE, we need to simulate HTTP status codes since InputStream doesn't provide them directly
                response = pimpl->parseHttpResponse(stream.get(), 200, "OK");

                // Cache successful GET responses
                if (options.useCache && options.method == HttpMethod::GET && response.isSuccess())
                {
                    pimpl->setCachedResponse(cacheKey, response);
                }
            }
            else
            {
                response.statusCode = 0;
                response.statusText = "Network Error";
                response.error = error.isNotEmpty() ? error : "Failed to create input stream";
            }

            callback(response);
        });
    }

    NetworkManager::Response NetworkManager::makeRequestSync(const RequestOptions& options)
    {
        // Check offline mode
        if (pimpl->offlineModeEnabled)
        {
            return pimpl->createOfflineResponse();
        }
        
        // Check cache first
        if (options.useCache && options.method == HttpMethod::GET)
        {
            auto cacheKey = pimpl->getCacheKey(options);
            Response cachedResponse;
            if (pimpl->getCachedResponse(cacheKey, cachedResponse))
            {
                return cachedResponse;
            }
        }
        
        // Build URL
        juce::String url = pimpl->buildUrl(options.endpoint);
        juce::URL juceUrl(url);

        // Add headers
        juce::StringPairArray headers = options.headers;
        headers.set("User-Agent", pimpl->options.userAgent);
        headers.set("Content-Type", "application/json");

        // Add auth header if required and available
        if (options.requireAuth && pimpl->authToken.isNotEmpty())
        {
            headers.set("Authorization", "Bearer " + pimpl->authToken);
        }

        // For POST/PUT/PATCH requests, add body using withPOSTData (JUCE 8.0.8)
        if (options.method == HttpMethod::POST || options.method == HttpMethod::PUT || options.method == HttpMethod::PATCH)
        {
            if (!options.body.isVoid())
            {
                juce::String bodyString = juce::JSON::toString(options.body);
                juceUrl = juceUrl.withPOSTData(bodyString);
            }
        }

        // Create input stream options
        juce::URL::InputStreamOptions streamOptions(juce::URL::ParameterHandling::inAddress);
        streamOptions = streamOptions.withConnectionTimeoutMs(options.timeoutMs)
                                   .withExtraHeaders(headers.getDescription());

        // Make synchronous request
        auto stream = juceUrl.createInputStream(streamOptions);
        
        Response response;
        if (stream != nullptr)
        {
            response = pimpl->parseHttpResponse(stream.get(), 200, "OK");
            
            // Cache successful GET responses
            if (options.useCache && options.method == HttpMethod::GET && response.isSuccess())
            {
                auto cacheKey = pimpl->getCacheKey(options);
                pimpl->setCachedResponse(cacheKey, response);
            }
        }
        else
        {
            response.statusCode = 0;
            response.statusText = "Network Error";
            response.error = "Failed to create input stream";
        }
        
        return response;
    }

    void NetworkManager::setOfflineMode(bool enabled) noexcept
    {
        pimpl->offlineModeEnabled = enabled;
    }

    bool NetworkManager::isOfflineModeEnabled() const noexcept
    {
        return pimpl->offlineModeEnabled;
    }

    juce::Result NetworkManager::clearCache()
    {
        juce::ScopedLock lock(pimpl->cacheLock);
        pimpl->cache.clear();
        return juce::Result::ok();
    }

    juce::var NetworkManager::getCacheStats() const
    {
        juce::ScopedLock lock(pimpl->cacheLock);
        
        auto stats = new juce::DynamicObject();
        stats->setProperty("entryCount", static_cast<int>(pimpl->cache.size()));
        
        int expiredCount = 0;
        auto currentTime = juce::Time::getCurrentTime();
        for (const auto& pair : pimpl->cache)
        {
            if (currentTime > pair.second.expiry)
                expiredCount++;
        }
        stats->setProperty("expiredCount", expiredCount);
        
        return juce::var(stats);
    }

    void NetworkManager::setAuthToken(const juce::String& token)
    {
        pimpl->authToken = token;
    }

} // namespace Schillinger