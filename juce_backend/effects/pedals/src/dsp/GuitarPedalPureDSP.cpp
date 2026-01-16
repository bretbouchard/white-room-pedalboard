/*
  ==============================================================================

    GuitarPedalPureDSP.cpp
    Created: January 15, 2026
    Author: Bret Bouchard

    Base class implementation for all guitar effects pedals

  ==============================================================================
*/

#include "dsp/GuitarPedalPureDSP.h"
#include <algorithm>

namespace DSP {

//==============================================================================
// GuitarPedalPureDSP Implementation
//==============================================================================

GuitarPedalPureDSP::GuitarPedalPureDSP()
{
}

GuitarPedalPureDSP::~GuitarPedalPureDSP()
{
}

//==============================================================================
// Parameters
//==============================================================================

float GuitarPedalPureDSP::getParameter(const char* paramId) const
{
    // Search through all parameters
    for (int i = 0; i < getNumParameters(); ++i)
    {
        const Parameter* param = getParameter(i);
        if (param && std::strcmp(param->id, paramId) == 0)
        {
            return getParameterValue(i);
        }
    }
    return 0.0f;
}

void GuitarPedalPureDSP::setParameter(const char* paramId, float value)
{
    // Search through all parameters
    for (int i = 0; i < getNumParameters(); ++i)
    {
        const Parameter* param = getParameter(i);
        if (param && std::strcmp(param->id, paramId) == 0)
        {
            setParameterValue(i, value);
            return;
        }
    }
}

//==============================================================================
// Presets
//==============================================================================

bool GuitarPedalPureDSP::loadPreset(int index)
{
    if (index < 0 || index >= getNumPresets())
        return false;

    const Preset* preset = getPreset(index);
    if (!preset || !preset->values)
        return false;

    // Load values
    for (int i = 0; i < preset->numValues && i < getNumParameters(); ++i)
    {
        setParameterValue(i, preset->values[i]);
    }

    return true;
}

bool GuitarPedalPureDSP::savePreset(char* jsonBuffer, int jsonBufferSize) const
{
    if (!jsonBuffer || jsonBufferSize < 100)
        return false;

    int offset = 0;

    // Write opening brace
    int remaining = jsonBufferSize - offset;
    if (remaining < 10) return false;
    std::snprintf(jsonBuffer + offset, remaining, "{");
    offset = 1;

    // Write all parameters
    for (int i = 0; i < getNumParameters(); ++i)
    {
        const Parameter* param = getParameter(i);
        if (!param) continue;

        float value = getParameterValue(i);
        if (!writeJsonParameter(param->id, value, jsonBuffer, offset, jsonBufferSize))
            return false;
    }

    // Remove trailing comma and add closing brace
    if (offset > 1 && jsonBuffer[offset - 1] == ',')
    {
        offset--;
    }

    remaining = jsonBufferSize - offset;
    if (remaining < 2) return false;
    std::snprintf(jsonBuffer + offset, remaining, "}");

    return true;
}

bool GuitarPedalPureDSP::loadPreset(const char* jsonData)
{
    if (!jsonData) return false;

    // Parse all parameters
    for (int i = 0; i < getNumParameters(); ++i)
    {
        const Parameter* param = getParameter(i);
        if (!param) continue;

        double value;
        if (parseJsonParameter(jsonData, param->id, value))
        {
            setParameterValue(i, static_cast<float>(value));
        }
    }

    return true;
}

//==============================================================================
// State Management
//==============================================================================

bool GuitarPedalPureDSP::getState(void* data, int& dataSize) const
{
    // Calculate required size
    int requiredSize = getNumParameters() * sizeof(float);

    if (!data || dataSize < requiredSize)
    {
        dataSize = requiredSize;
        return false;
    }

    // Write parameter values
    float* floatData = static_cast<float*>(data);
    for (int i = 0; i < getNumParameters(); ++i)
    {
        floatData[i] = getParameterValue(i);
    }

    dataSize = requiredSize;
    return true;
}

bool GuitarPedalPureDSP::setState(const void* data, int dataSize)
{
    if (!data) return false;

    const float* floatData = static_cast<const float*>(data);
    int numFloats = dataSize / sizeof(float);

    // Read parameter values
    for (int i = 0; i < numFloats && i < getNumParameters(); ++i)
    {
        setParameterValue(i, floatData[i]);
    }

    return true;
}

//==============================================================================
// Helper Functions
//==============================================================================

bool GuitarPedalPureDSP::writeJsonParameter(const char* name, double value,
                                           char* buffer, int& offset,
                                           int bufferSize) const
{
    int remaining = bufferSize - offset;
    if (remaining < 50) return false;

    int written = std::snprintf(buffer + offset, remaining,
                               "\"%s\":%.6f,",
                               name, value);

    if (written < 0 || written >= remaining) return false;

    offset += written;
    return true;
}

bool GuitarPedalPureDSP::parseJsonParameter(const char* json, const char* param,
                                           double& value) const
{
    if (!json || !param) return false;

    const char* search = json;
    char pattern[100];
    std::snprintf(pattern, sizeof(pattern), "\"%s\":", param);

    const char* found = std::strstr(search, pattern);
    if (!found) return false;

    found += std::strlen(pattern);
    value = std::atof(found);

    return true;
}

} // namespace DSP
