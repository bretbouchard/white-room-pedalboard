/*
  ==============================================================================

    InstrumentFactory.cpp
    Created: December 30, 2025
    Author:  Bret Bouchard

    Factory system for creating DSP::InstrumentDSP instances

    This provides a centralized registry for all instrument types,
    allowing dynamic instrument creation by name.

  ==============================================================================
*/

#include "dsp/InstrumentFactory.h"
#include "dsp/InstrumentDSP.h"
#include <map>
#include <string>
#include <mutex>
#include <functional>

namespace DSP {

//==============================================================================
// Factory Registry
//==============================================================================

// Type alias for factory function
using InstrumentFactory = std::function<InstrumentDSP*()>;

// Use "construct on first use" idiom to avoid static initialization order issues
std::map<std::string, InstrumentFactory>& getGlobalFactories()
{
    static std::map<std::string, InstrumentFactory> factories_;
    return factories_;
}

std::mutex& getGlobalFactoriesMutex()
{
    static std::mutex mutex_;
    return mutex_;
}

//==============================================================================
// Factory Implementation
//==============================================================================

void registerInstrumentFactory(const char* name, InstrumentFactory factory)
{
    if (name == nullptr || factory == nullptr) {
        return; // Invalid input
    }

    std::lock_guard<std::mutex> lock(getGlobalFactoriesMutex());
    getGlobalFactories()[name] = factory;
}

InstrumentDSP* createInstrument(const char* name)
{
    if (name == nullptr) {
        return nullptr; // Invalid input
    }

    std::lock_guard<std::mutex> lock(getGlobalFactoriesMutex());

    auto& factories = getGlobalFactories();
    auto it = factories.find(name);
    if (it != factories.end()) {
        // Call the factory function to create instrument
        InstrumentFactory factory = it->second;
        if (factory != nullptr) {
            return factory();
        }
    }

    // Instrument not found
    return nullptr;
}

//==============================================================================
// Factory Query Functions
//==============================================================================

bool isInstrumentRegistered(const char* name)
{
    if (name == nullptr) {
        return false;
    }

    std::lock_guard<std::mutex> lock(getGlobalFactoriesMutex());
    return getGlobalFactories().find(name) != getGlobalFactories().end();
}

int getRegisteredInstrumentCount()
{
    std::lock_guard<std::mutex> lock(getGlobalFactoriesMutex());
    return static_cast<int>(getGlobalFactories().size());
}

void getAllRegisteredInstrumentNames(char* namesBuffer, int bufferSize)
{
    if (namesBuffer == nullptr || bufferSize <= 0) {
        return;
    }

    std::lock_guard<std::mutex> lock(getGlobalFactoriesMutex());

    // Clear buffer
    namesBuffer[0] = '\0';

    // Build comma-separated list of instrument names
    int offset = 0;
    const auto& factories = getGlobalFactories();
    for (const auto& entry : factories) {
        const std::string& name = entry.first;

        // Check if buffer has space
        int spaceNeeded = static_cast<int>(name.length()) + 2; // name + comma + null
        if (offset + spaceNeeded >= bufferSize) {
            break; // Buffer full
        }

        // Copy name to buffer
        for (size_t i = 0; i < name.length(); ++i) {
            namesBuffer[offset++] = name[i];
        }

        // Add comma separator (except for last item)
        if (&entry != &*factories.rbegin()) {
            namesBuffer[offset++] = ',';
        }

        namesBuffer[offset] = '\0'; // Keep null-terminated
    }
}

void unregisterInstrumentFactory(const char* name)
{
    if (name == nullptr) {
        return;
    }

    std::lock_guard<std::mutex> lock(getGlobalFactoriesMutex());
    getGlobalFactories().erase(name);
}

void unregisterAllFactories()
{
    std::lock_guard<std::mutex> lock(getGlobalFactoriesMutex());
    getGlobalFactories().clear();
}

} // namespace DSP
