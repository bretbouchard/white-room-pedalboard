/*******************************************************************************
 * FilterGate - Modulation Matrix Implementation
 ******************************************************************************/

#include "dsp/ModulationMatrix.h"
#include "dsp/EnvelopeGenerator.h"
#include "dsp/EnvelopeFollower.h"
#include "dsp/GateDetector.h"
#include <juce_dsp/juce_dsp.h>
#include <algorithm>
#include <cmath>

namespace FilterGate {

ModulationMatrix::ModulationMatrix() {
    // Initialize source values to zero
    for (int i = 0; i < static_cast<int>(ModSource::MOD_SOURCE_COUNT); ++i) {
        sourceValues[i] = 0.0f;
    }

    // Initialize destination modulation to zero
    for (int i = 0; i < static_cast<int>(ModDestination::MOD_DESTINATION_COUNT); ++i) {
        modDestinations[i] = 0.0f;
    }
}

ModulationMatrix::~ModulationMatrix() {
    clearRoutes();
}

void ModulationMatrix::setParams(const ModMatrixParams& newParams) {
    params = newParams;

    // Trim excess routes if max reduced
    if (params.maxRoutes > 0 && static_cast<int>(routes.size()) > params.maxRoutes) {
        routes.resize(params.maxRoutes);
    }
}

int ModulationMatrix::addRoute(const ModRoute& route) {
    if (params.maxRoutes > 0 && static_cast<int>(routes.size()) >= params.maxRoutes) {
        return -1; // Matrix full
    }

    routes.push_back(route);

    // Initialize smoothed value to 0
    routes.back().smoothedValue = 0.0f;

    // Calculate slew coefficient
    if (route.slewMs > 0.0f && sampleRate > 0.0) {
        float slewTimeSamples = route.slewMs * 0.001f * static_cast<float>(sampleRate);
        routes.back().slewCoeff = 1.0f / std::max(1.0f, slewTimeSamples);
    } else {
        routes.back().slewCoeff = 1.0f; // Instant
    }

    return static_cast<int>(routes.size()) - 1;
}

bool ModulationMatrix::removeRoute(int routeIndex) {
    if (routeIndex < 0 || routeIndex >= static_cast<int>(routes.size())) {
        return false;
    }

    routes.erase(routes.begin() + routeIndex);
    return true;
}

void ModulationMatrix::clearRoutes() {
    routes.clear();

    // Reset all destination modulation
    for (int i = 0; i < static_cast<int>(ModDestination::MOD_DESTINATION_COUNT); ++i) {
        modDestinations[i] = 0.0f;
    }
}

const ModRoute& ModulationMatrix::getRoute(int index) const {
    static ModRoute emptyRoute;

    if (index < 0 || index >= static_cast<int>(routes.size())) {
        return emptyRoute;
    }

    return routes[index];
}

void ModulationMatrix::updateRoute(int index, const ModRoute& route) {
    if (index < 0 || index >= static_cast<int>(routes.size())) {
        return;
    }

    routes[index] = route;

    // Recalculate slew coefficient
    if (route.slewMs > 0.0f && sampleRate > 0.0) {
        float slewTimeSamples = route.slewMs * 0.001f * static_cast<float>(sampleRate);
        routes[index].slewCoeff = 1.0f / std::max(1.0f, slewTimeSamples);
    } else {
        routes[index].slewCoeff = 1.0f;
    }
}

void ModulationMatrix::prepare(double newSampleRate) {
    sampleRate = newSampleRate;

    // Recalculate all slew coefficients
    for (auto& route : routes) {
        if (route.slewMs > 0.0f && sampleRate > 0.0) {
            float slewTimeSamples = route.slewMs * 0.001f * static_cast<float>(sampleRate);
            route.slewCoeff = 1.0f / std::max(1.0f, slewTimeSamples);
        } else {
            route.slewCoeff = 1.0f;
        }
    }
}

void ModulationMatrix::reset() {
    // Reset all smoothed values
    for (auto& route : routes) {
        route.smoothedValue = 0.0f;
    }

    // Reset all destinations
    for (int i = 0; i < static_cast<int>(ModDestination::MOD_DESTINATION_COUNT); ++i) {
        modDestinations[i] = 0.0f;
    }
}

void ModulationMatrix::processSample() {
    if (!params.enabled) {
        return;
    }

    // Read all source values
    for (int i = 0; i < static_cast<int>(ModSource::MOD_SOURCE_COUNT); ++i) {
        sourceValues[i] = readSource(static_cast<ModSource>(i));
    }

    // Reset all destinations
    for (int i = 0; i < static_cast<int>(ModDestination::MOD_DESTINATION_COUNT); ++i) {
        modDestinations[i] = 0.0f;
    }

    // Process each route
    for (size_t i = 0; i < routes.size(); ++i) {
        ModRoute& route = routes[i];

        if (route.source == ModSource::NONE || route.destination == ModDestination::NONE) {
            continue;
        }

        // Get source value
        float sourceVal = sourceValues[static_cast<int>(route.source)];

        // Apply smoothing
        applySmoothing(static_cast<int>(i));

        // Calculate modulation contribution
        float contribution = route.smoothedValue * route.amount;

        // Add to destination
        int destIndex = static_cast<int>(route.destination);
        modDestinations[destIndex] += contribution;
    }

    // Hard clamp all destinations to prevent runaway modulation
    for (int i = 0; i < static_cast<int>(ModDestination::MOD_DESTINATION_COUNT); ++i) {
        modDestinations[i] = juce::jlimit(-2.0f, 2.0f, modDestinations[i]);
    }
}

float ModulationMatrix::getModulation(ModDestination dest) const {
    int index = static_cast<int>(dest);
    if (index < 0 || index >= static_cast<int>(ModDestination::MOD_DESTINATION_COUNT)) {
        return 0.0f;
    }

    return modDestinations[index];
}

float ModulationMatrix::getSourceValue(ModSource source) const {
    int index = static_cast<int>(source);
    if (index < 0 || index >= static_cast<int>(ModSource::MOD_SOURCE_COUNT)) {
        return 0.0f;
    }

    return sourceValues[index];
}

float ModulationMatrix::readSource(ModSource source) {
    switch (source) {
        case ModSource::ENV1:
            if (env1) return env1->getCurrentLevel();
            return 0.0f;

        case ModSource::ENV2:
            if (env2) return env2->getCurrentLevel();
            return 0.0f;

        case ModSource::ENVELOPE_FOLLOWER:
            if (envelopeFollower) return envelopeFollower->getCurrentLevel();
            return 0.0f;

        case ModSource::GATE:
            if (gateDetector) return gateDetector->getGateState();
            return 0.0f;

        case ModSource::LFO1:
        case ModSource::LFO2:
        case ModSource::VELOCITY:
        case ModSource::RANDOM:
        case ModSource::NONE:
        default:
            return 0.0f;
    }
}

void ModulationMatrix::applySmoothing(int routeIndex) {
    if (routeIndex < 0 || routeIndex >= static_cast<int>(routes.size())) {
        return;
    }

    ModRoute& route = routes[routeIndex];
    int sourceIndex = static_cast<int>(route.source);

    // Get source value
    float target = sourceValues[sourceIndex];

    // Apply smoothing (one-pole lowpass)
    route.smoothedValue += route.slewCoeff * (target - route.smoothedValue);
}

} // namespace FilterGate
