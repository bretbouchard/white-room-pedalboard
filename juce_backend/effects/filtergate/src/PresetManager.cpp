/*******************************************************************************
 * FilterGate - Preset Manager Implementation
 *
 * JSON serialization and preset management implementation.
 *
 * @author FilterGate Autonomous Agent 7
 * @date  2025-12-30
 ******************************************************************************/

#include "PresetManager.h"
#include "FilterGateProcessor.h"
#include <sstream>

namespace FilterGate {

//==============================================================================
// Preset Serialization
//==============================================================================

juce::var Preset::toJSON() const {
    auto* json = new juce::DynamicObject();

    // Metadata
    json->setProperty("name", name);
    json->setProperty("author", author);
    json->setProperty("category", category);
    json->setProperty("description", description);
    json->setProperty("version", version);
    json->setProperty("createdDate", createdDate);
    json->setProperty("modifiedDate", modifiedDate);

    // Gate parameters
    auto* gate = new juce::DynamicObject();
    gate->setProperty("threshold", gateThreshold);
    gate->setProperty("attack", gateAttack);
    gate->setProperty("hold", gateHold);
    gate->setProperty("release", gateRelease);
    gate->setProperty("hysteresis", gateHysteresis);
    json->setProperty("gate", gate);

    // Envelope 1
    auto* env1 = new juce::DynamicObject();
    env1->setProperty("mode", env1Mode);
    env1->setProperty("attack", env1Attack);
    env1->setProperty("decay", env1Decay);
    env1->setProperty("sustain", env1Sustain);
    env1->setProperty("release", env1Release);
    env1->setProperty("loop", env1Loop);
    env1->setProperty("velocitySensitive", env1VelocitySensitive);
    json->setProperty("envelope1", env1);

    // Envelope 2
    auto* env2 = new juce::DynamicObject();
    env2->setProperty("mode", env2Mode);
    env2->setProperty("attack", env2Attack);
    env2->setProperty("decay", env2Decay);
    env2->setProperty("sustain", env2Sustain);
    env2->setProperty("release", env2Release);
    env2->setProperty("loop", env2Loop);
    env2->setProperty("velocitySensitive", env2VelocitySensitive);
    json->setProperty("envelope2", env2);

    // Envelope Follower
    auto* envFollow = new juce::DynamicObject();
    envFollow->setProperty("attack", envFollowerAttack);
    envFollow->setProperty("release", envFollowerRelease);
    json->setProperty("envelopeFollower", envFollow);

    // Pre-Drive
    auto* preDrv = new juce::DynamicObject();
    preDrv->setProperty("type", preDriveType);
    preDrv->setProperty("drive", preDriveDrive);
    preDrv->setProperty("output", preDriveOutput);
    preDrv->setProperty("tone", preDriveTone);
    json->setProperty("preDrive", preDrv);

    // Post-Drive
    auto* postDrv = new juce::DynamicObject();
    postDrv->setProperty("type", postDriveType);
    postDrv->setProperty("drive", postDriveDrive);
    postDrv->setProperty("output", postDriveOutput);
    postDrv->setProperty("tone", postDriveTone);
    json->setProperty("postDrive", postDrv);

    // Phaser A
    auto* phaserA = new juce::DynamicObject();
    phaserA->setProperty("stages", phaserAStages);
    phaserA->setProperty("rate", phaserARate);
    phaserA->setProperty("depth", phaserADepth);
    phaserA->setProperty("feedback", phaserAFeedback);
    phaserA->setProperty("center", phaserACenter);
    phaserA->setProperty("spread", phaserASpread);
    phaserA->setProperty("mix", phaserAMix);
    json->setProperty("phaserA", phaserA);

    // Phaser B
    auto* phaserB = new juce::DynamicObject();
    phaserB->setProperty("stages", phaserBStages);
    phaserB->setProperty("rate", phaserBRate);
    phaserB->setProperty("depth", phaserBDepth);
    phaserB->setProperty("feedback", phaserBFeedback);
    phaserB->setProperty("center", phaserBCenter);
    phaserB->setProperty("spread", phaserBSpread);
    phaserB->setProperty("mix", phaserBMix);
    json->setProperty("phaserB", phaserB);

    // Dual Phaser
    auto* dualPhaser = new juce::DynamicObject();
    dualPhaser->setProperty("routing", dualPhaserRouting);
    dualPhaser->setProperty("lfoPhaseOffset", dualPhaserLFOPhaseOffset);
    dualPhaser->setProperty("crossFeedback", dualPhaserCrossFeedback);
    json->setProperty("dualPhaser", dualPhaser);

    // Filter
    auto* filter = new juce::DynamicObject();
    filter->setProperty("model", filterModel);
    filter->setProperty("cutoff", filterCutoff);
    filter->setProperty("resonance", filterResonance);
    filter->setProperty("drive", filterDrive);
    filter->setProperty("postDrive", filterPostDrive);
    filter->setProperty("keyTrack", filterKeyTrack);
    filter->setProperty("pitch", filterPitch);
    filter->setProperty("oversampling", filterOversampling);
    json->setProperty("filter", filter);

    // Mixer
    auto* mixer = new juce::DynamicObject();
    mixer->setProperty("dryLevel", mixerDryLevel);
    mixer->setProperty("wetLevel", mixerWetLevel);
    mixer->setProperty("phaserAMix", mixerPhaserAMix);
    mixer->setProperty("phaserBMix", mixerPhaserBMix);
    mixer->setProperty("filterMix", mixerFilterMix);
    mixer->setProperty("routing", mixerRouting);
    mixer->setProperty("outputLevel", mixerOutputLevel);
    json->setProperty("mixer", mixer);

    // Modulation routes
    auto* routes = new juce::DynamicObject();
    routes->setProperty("enabled", modulationMatrixEnabled);
    juce::Array<juce::var> routesArray;
    for (const auto& route : modulationRoutes) {
        routesArray.add(juce::var(route));
    }
    routes->setProperty("routes", routesArray);
    json->setProperty("modulationMatrix", routes);

    return json;
}

Preset Preset::fromJSON(const juce::var& json) {
    Preset preset;

    // Metadata
    preset.name = json.getProperty("name", "Untitled").toString();
    preset.author = json.getProperty("author", "Unknown").toString();
    preset.category = json.getProperty("category", "User").toString();
    preset.description = json.getProperty("description", "").toString();
    preset.version = json.getProperty("version", 1);
    preset.createdDate = json.getProperty("createdDate", "").toString();
    preset.modifiedDate = json.getProperty("modifiedDate", "").toString();

    // Gate parameters
    auto gate = json.getProperty("gate", juce::var());
    if (gate.isObject()) {
        preset.gateThreshold = gate.getProperty("threshold", 0.5f);
        preset.gateAttack = gate.getProperty("attack", 10.0f);
        preset.gateHold = gate.getProperty("hold", 100.0f);
        preset.gateRelease = gate.getProperty("release", 200.0f);
        preset.gateHysteresis = gate.getProperty("hysteresis", 0.05f);
    }

    // Envelope 1
    auto env1 = json.getProperty("envelope1", juce::var());
    if (env1.isObject()) {
        preset.env1Mode = env1.getProperty("mode", 1);
        preset.env1Attack = env1.getProperty("attack", 10.0f);
        preset.env1Decay = env1.getProperty("decay", 100.0f);
        preset.env1Sustain = env1.getProperty("sustain", 0.5f);
        preset.env1Release = env1.getProperty("release", 200.0f);
        preset.env1Loop = env1.getProperty("loop", false);
        preset.env1VelocitySensitive = env1.getProperty("velocitySensitive", false);
    }

    // Envelope 2
    auto env2 = json.getProperty("envelope2", juce::var());
    if (env2.isObject()) {
        preset.env2Mode = env2.getProperty("mode", 1);
        preset.env2Attack = env2.getProperty("attack", 10.0f);
        preset.env2Decay = env2.getProperty("decay", 100.0f);
        preset.env2Sustain = env2.getProperty("sustain", 0.5f);
        preset.env2Release = env2.getProperty("release", 200.0f);
        preset.env2Loop = env2.getProperty("loop", false);
        preset.env2VelocitySensitive = env2.getProperty("velocitySensitive", false);
    }

    // Envelope Follower
    auto envFollow = json.getProperty("envelopeFollower", juce::var());
    if (envFollow.isObject()) {
        preset.envFollowerAttack = envFollow.getProperty("attack", 5.0f);
        preset.envFollowerRelease = envFollow.getProperty("release", 50.0f);
    }

    // Pre-Drive
    auto preDrv = json.getProperty("preDrive", juce::var());
    if (preDrv.isObject()) {
        preset.preDriveType = preDrv.getProperty("type", 0);
        preset.preDriveDrive = preDrv.getProperty("drive", 0.0f);
        preset.preDriveOutput = preDrv.getProperty("output", 1.0f);
        preset.preDriveTone = preDrv.getProperty("tone", 0.5f);
    }

    // Post-Drive
    auto postDrv = json.getProperty("postDrive", juce::var());
    if (postDrv.isObject()) {
        preset.postDriveType = postDrv.getProperty("type", 0);
        preset.postDriveDrive = postDrv.getProperty("drive", 0.0f);
        preset.postDriveOutput = postDrv.getProperty("output", 1.0f);
        preset.postDriveTone = postDrv.getProperty("tone", 0.5f);
    }

    // Phaser A
    auto phaserA = json.getProperty("phaserA", juce::var());
    if (phaserA.isObject()) {
        preset.phaserAStages = phaserA.getProperty("stages", 4);
        preset.phaserARate = phaserA.getProperty("rate", 0.5f);
        preset.phaserADepth = phaserA.getProperty("depth", 0.7f);
        preset.phaserAFeedback = phaserA.getProperty("feedback", 0.5f);
        preset.phaserACenter = phaserA.getProperty("center", 1000.0f);
        preset.phaserASpread = phaserA.getProperty("spread", 2000.0f);
        preset.phaserAMix = phaserA.getProperty("mix", 0.5f);
    }

    // Phaser B
    auto phaserB = json.getProperty("phaserB", juce::var());
    if (phaserB.isObject()) {
        preset.phaserBStages = phaserB.getProperty("stages", 4);
        preset.phaserBRate = phaserB.getProperty("rate", 0.5f);
        preset.phaserBDepth = phaserB.getProperty("depth", 0.7f);
        preset.phaserBFeedback = phaserB.getProperty("feedback", 0.5f);
        preset.phaserBCenter = phaserB.getProperty("center", 1000.0f);
        preset.phaserBSpread = phaserB.getProperty("spread", 2000.0f);
        preset.phaserBMix = phaserB.getProperty("mix", 0.5f);
    }

    // Dual Phaser
    auto dualPhaser = json.getProperty("dualPhaser", juce::var());
    if (dualPhaser.isObject()) {
        preset.dualPhaserRouting = dualPhaser.getProperty("routing", 0);
        preset.dualPhaserLFOPhaseOffset = dualPhaser.getProperty("lfoPhaseOffset", 0.0f);
        preset.dualPhaserCrossFeedback = dualPhaser.getProperty("crossFeedback", 0.0f);
    }

    // Filter
    auto filter = json.getProperty("filter", juce::var());
    if (filter.isObject()) {
        preset.filterModel = filter.getProperty("model", 0);
        preset.filterCutoff = filter.getProperty("cutoff", 1000.0f);
        preset.filterResonance = filter.getProperty("resonance", 0.5f);
        preset.filterDrive = filter.getProperty("drive", 0.0f);
        preset.filterPostDrive = filter.getProperty("postDrive", 0.0f);
        preset.filterKeyTrack = filter.getProperty("keyTrack", 0.0f);
        preset.filterPitch = filter.getProperty("pitch", 69.0f);
        preset.filterOversampling = filter.getProperty("oversampling", 1);
    }

    // Mixer
    auto mixer = json.getProperty("mixer", juce::var());
    if (mixer.isObject()) {
        preset.mixerDryLevel = mixer.getProperty("dryLevel", 0.0f);
        preset.mixerWetLevel = mixer.getProperty("wetLevel", 1.0f);
        preset.mixerPhaserAMix = mixer.getProperty("phaserAMix", 1.0f);
        preset.mixerPhaserBMix = mixer.getProperty("phaserBMix", 1.0f);
        preset.mixerFilterMix = mixer.getProperty("filterMix", 1.0f);
        preset.mixerRouting = mixer.getProperty("routing", 0);
        preset.mixerOutputLevel = mixer.getProperty("outputLevel", 1.0f);
    }

    // Modulation routes
    auto modMatrix = json.getProperty("modulationMatrix", juce::var());
    if (modMatrix.isObject()) {
        preset.modulationMatrixEnabled = modMatrix.getProperty("enabled", true);
        auto routesArray = modMatrix.getProperty("routes", juce::var());
        if (routesArray.isArray()) {
            preset.modulationRoutes.clear();
            for (const auto& route : *routesArray.getArray()) {
                preset.modulationRoutes.add(route.toString());
            }
        }
    }

    return preset;
}

juce::String Preset::toString() const {
    auto json = toJSON();
    return juce::JSON::toString(json, true);
}

Preset Preset::fromString(const juce::String& jsonString) {
    auto json = juce::JSON::parse(jsonString);
    if (!json.isObject()) {
        throw PresetException("Invalid JSON format");
    }
    return fromJSON(json);
}

//==============================================================================
// Preset Application
//==============================================================================

void Preset::applyToModules(FilterGateProcessor& processor) const {
    // Apply gate parameters
    GateParams gateParams;
    gateParams.threshold = gateThreshold;
    gateParams.attackMs = gateAttack;
    gateParams.holdMs = gateHold;
    gateParams.releaseMs = gateRelease;
    gateParams.hysteresis = gateHysteresis;
    processor.getGateDetector().setParams(gateParams);

    // Apply envelope 1
    EnvelopeParams env1Params;
    env1Params.mode = env1Mode == 0 ? EnvMode::ADR : EnvMode::ADSR;
    env1Params.attackMs = env1Attack;
    env1Params.decayMs = env1Decay;
    env1Params.sustain = env1Sustain;
    env1Params.releaseMs = env1Release;
    env1Params.loop = env1Loop;
    env1Params.velocitySensitive = env1VelocitySensitive;
    processor.getEnvelope1().setParams(env1Params);

    // Apply envelope 2
    EnvelopeParams env2Params;
    env2Params.mode = env2Mode == 0 ? EnvMode::ADR : EnvMode::ADSR;
    env2Params.attackMs = env2Attack;
    env2Params.decayMs = env2Decay;
    env2Params.sustain = env2Sustain;
    env2Params.releaseMs = env2Release;
    env2Params.loop = env2Loop;
    env2Params.velocitySensitive = env2VelocitySensitive;
    processor.getEnvelope2().setParams(env2Params);

    // Apply envelope follower
    EnvelopeFollowerParams envFollowParams;
    envFollowParams.attackMs = envFollowerAttack;
    envFollowParams.releaseMs = envFollowerRelease;
    processor.getEnvelopeFollower().setParams(envFollowParams);

    // Apply pre-drive
    DriveParams preDriveParams;
    preDriveParams.type = static_cast<DriveType>(preDriveType);
    preDriveParams.drive = preDriveDrive;
    preDriveParams.outputGain = preDriveOutput;
    preDriveParams.tone = preDriveTone;
    processor.getPreDrive().setParams(preDriveParams);

    // Apply post-drive
    DriveParams postDriveParams;
    postDriveParams.type = static_cast<DriveType>(postDriveType);
    postDriveParams.drive = postDriveDrive;
    postDriveParams.outputGain = postDriveOutput;
    postDriveParams.tone = postDriveTone;
    processor.getPostDrive().setParams(postDriveParams);

    // Apply phaser A
    PhaserParams phaserAParams;
    phaserAParams.stages = phaserAStages;
    phaserAParams.rateHz = phaserARate;
    phaserAParams.depth = phaserADepth;
    phaserAParams.feedback = phaserAFeedback;
    phaserAParams.centerHz = phaserACenter;
    phaserAParams.spread = phaserASpread;
    phaserAParams.mix = phaserAMix;

    // Apply phaser B
    PhaserParams phaserBParams;
    phaserBParams.stages = phaserBStages;
    phaserBParams.rateHz = phaserBRate;
    phaserBParams.depth = phaserBDepth;
    phaserBParams.feedback = phaserBFeedback;
    phaserBParams.centerHz = phaserBCenter;
    phaserBParams.spread = phaserBSpread;
    phaserBParams.mix = phaserBMix;

    // Apply dual phaser to both phaser A and B in mixer
    DualPhaserParams dualPhaserParams;
    dualPhaserParams.phaserA = phaserAParams;
    dualPhaserParams.phaserB = phaserBParams;
    dualPhaserParams.routing = static_cast<PhaserRouting>(dualPhaserRouting);
    dualPhaserParams.lfoPhaseOffset = dualPhaserLFOPhaseOffset;
    dualPhaserParams.crossFeedback = dualPhaserCrossFeedback;
    processor.getMixer().getPhaserA().setParams(dualPhaserParams);
    processor.getMixer().getPhaserB().setParams(dualPhaserParams);

    // Apply filter
    FilterEngineParams filterParams;
    filterParams.model = static_cast<FilterModel>(filterModel);
    filterParams.cutoffHz = filterCutoff;
    filterParams.resonance = filterResonance;
    filterParams.drive = filterDrive;
    filterParams.postDrive = filterPostDrive;
    filterParams.keyTrack = filterKeyTrack;
    filterParams.pitch = filterPitch;
    filterParams.oversampling = filterOversampling;
    processor.getMixer().getFilter().setParams(filterParams);

    // Apply mixer
    MixerParams mixerParams;
    mixerParams.dryLevel = mixerDryLevel;
    mixerParams.wetLevel = mixerWetLevel;
    mixerParams.phaserAMix = mixerPhaserAMix;
    mixerParams.phaserBMix = mixerPhaserBMix;
    mixerParams.filterMix = mixerFilterMix;
    mixerParams.routing = static_cast<RoutingMode>(mixerRouting);
    mixerParams.outputLevel = mixerOutputLevel;
    processor.getMixer().setParams(mixerParams);

    // Apply modulation matrix
    processor.getModMatrix().clearRoutes();
    if (modulationMatrixEnabled) {
        for (const auto& routeStr : modulationRoutes) {
            // Parse route string format: "source,destination,amount,slewMs"
            auto parts = juce::StringArray::fromTokens(routeStr, ",", "");
            if (parts.size() == 4) {
                ModRoute route;
                route.source = static_cast<ModSource>(parts[0].getIntValue());
                route.destination = static_cast<ModDestination>(parts[1].getIntValue());
                route.amount = parts[2].getFloatValue();
                route.slewMs = parts[3].getFloatValue();
                processor.getModMatrix().addRoute(route);
            }
        }
    }
}

Preset Preset::captureFromProcessor(const FilterGateProcessor& processor,
                                     const juce::String& name) {
    (void)processor; // Suppress unused warning until full implementation
    Preset preset;
    preset.name = name;

    // Capture current timestamp
    auto now = juce::Time::getCurrentTime();
    preset.createdDate = now.toISO8601(false);
    preset.modifiedDate = now.toISO8601(false);

    // TODO: Capture all parameters from processor modules
    // This would require getter methods for all parameter structures

    return preset;
}

//==============================================================================
// Preset Manager Implementation
//==============================================================================

PresetManager::PresetManager() {
    createFactoryPresets();
}

PresetManager::~PresetManager() = default;

juce::Array<Preset> PresetManager::getFactoryPresets() const {
    juce::Array<Preset> presets;
    presets.add(createInitPreset());
    presets.add(createSubtlePhaserPreset());
    presets.add(createDeepPhaserPreset());
    presets.add(createFilterSweepPreset());
    presets.add(createGateTriggerPreset());
    presets.add(createModulationDemoPreset());
    presets.add(createDualPhaserPreset());
    presets.add(createSoftDrivePreset());
    presets.add(createHardClipPreset());
    presets.add(createVintagePreset());
    presets.add(createModernPreset());
    presets.add(createAmbientPadPreset());
    presets.add(createFunkRhythmPreset());
    presets.add(createElectronicPreset());
    presets.add(createBassEnhancerPreset());
    presets.add(createVocalFXPreset());
    presets.add(createDrumBusPreset());
    presets.add(createSynthLeadPreset());
    presets.add(createGuitarFXPreset());
    presets.add(createExperimentalPreset());
    presets.add(createExtremeModulationPreset());
    presets.add(createMinimalPreset());

    return presets;
}

Preset PresetManager::getFactoryPreset(const juce::String& name) const {
    auto presets = getFactoryPresets();
    for (const auto& preset : presets) {
        if (preset.name == name) {
            return preset;
        }
    }
    return Preset(); // Return empty preset if not found
}

juce::StringArray PresetManager::getFactoryPresetNames() const {
    juce::StringArray names;
    auto presets = getFactoryPresets();
    for (const auto& preset : presets) {
        names.add(preset.name);
    }
    return names;
}

juce::File PresetManager::getUserPresetsDirectory() const {
    auto documentsDir = juce::File::getSpecialLocation(juce::File::userDocumentsDirectory);
    auto presetDir = documentsDir.getChildFile("FilterGate").getChildFile("Presets");

    // Create directory if it doesn't exist
    if (!presetDir.exists()) {
        auto result = presetDir.createDirectory();
        if (result.failed()) {
            // Handle error silently or log it
        }
    }

    return presetDir;
}

juce::Array<juce::File> PresetManager::getUserPresetFiles() const {
    juce::Array<juce::File> files;
    auto dir = getUserPresetsDirectory();

    if (dir.exists()) {
        for (auto& file : dir.findChildFiles(juce::File::findFiles, false, "*.json")) {
            files.add(file);
        }
    }

    return files;
}

Preset PresetManager::loadUserPreset(const juce::File& file) const {
    if (!file.existsAsFile()) {
        throw PresetException("Preset file does not exist: " + file.getFullPathName());
    }

    juce::String jsonString = file.loadFileAsString();
    return Preset::fromString(jsonString);
}

bool PresetManager::saveUserPreset(const Preset& preset, const juce::File& file) const {
    auto jsonString = preset.toString();
    return file.replaceWithText(jsonString);
}

bool PresetManager::validatePreset(const Preset& preset) const {
    // Check required metadata
    if (preset.name.isEmpty() || preset.name == "Untitled") {
        lastValidationError = "Preset name is required";
        return false;
    }

    // Check parameter ranges
    if (preset.gateThreshold < 0.0f || preset.gateThreshold > 1.0f) {
        lastValidationError = "Gate threshold out of range [0, 1]";
        return false;
    }

    if (preset.filterCutoff < 20.0f || preset.filterCutoff > 20000.0f) {
        lastValidationError = "Filter cutoff out of range [20, 20000]";
        return false;
    }

    if (preset.mixerOutputLevel < 0.0f || preset.mixerOutputLevel > 2.0f) {
        lastValidationError = "output level out of range [0, 2]";
        return false;
    }

    // Check enum values are in valid range
    if (preset.env1Mode < 0 || preset.env1Mode > 1) {
        lastValidationError = "Envelope 1 mode must be 0 (ADR) or 1 (ADSR)";
        return false;
    }

    if (preset.env2Mode < 0 || preset.env2Mode > 1) {
        lastValidationError = "Envelope 2 mode must be 0 (ADR) or 1 (ADSR)";
        return false;
    }

    if (preset.preDriveType < 0 || preset.preDriveType > 3) {
        lastValidationError = "Pre-drive type must be 0-3";
        return false;
    }

    if (preset.postDriveType < 0 || preset.postDriveType > 3) {
        lastValidationError = "Post-drive type must be 0-3";
        return false;
    }

    if (preset.filterModel < 0 || preset.filterModel > 5) {
        lastValidationError = "Filter model must be 0-5";
        return false;
    }

    if (preset.mixerRouting < 0 || preset.mixerRouting > 4) {
        lastValidationError = "Mixer routing must be 0-4";
        return false;
    }

    if (preset.dualPhaserRouting < 0 || preset.dualPhaserRouting > 2) {
        lastValidationError = "Dual phaser routing must be 0-2";
        return false;
    }

    // Check phaser stages are valid
    if (preset.phaserAStages != 4 && preset.phaserAStages != 6 && preset.phaserAStages != 8) {
        lastValidationError = "Phaser A stages must be 4, 6, or 8";
        return false;
    }

    if (preset.phaserBStages != 4 && preset.phaserBStages != 6 && preset.phaserBStages != 8) {
        lastValidationError = "Phaser B stages must be 4, 6, or 8";
        return false;
    }

    return true;
}

//==============================================================================
// Factory Preset Definitions
//==============================================================================

Preset PresetManager::createInitPreset() const {
    Preset preset;
    preset.name = "Init";
    preset.category = "Factory";
    preset.description = "Clean default preset with all parameters at default values";
    preset.author = "FilterGate";

    // Use default values from struct initialization
    return preset;
}

Preset PresetManager::createSubtlePhaserPreset() const {
    Preset preset;
    preset.name = "Subtle Phaser";
    preset.category = "Phaser";
    preset.description = "Gentle 4-stage phaser with slow sweep, perfect for subtle movement";
    preset.author = "FilterGate";

    preset.phaserAStages = 4;
    preset.phaserARate = 0.3f;
    preset.phaserADepth = 0.4f;
    preset.phaserAFeedback = 0.3f;
    preset.phaserACenter = 800.0f;
    preset.phaserASpread = 1500.0f;
    preset.phaserAMix = 0.3f;

    preset.mixerWetLevel = 0.5f;
    preset.mixerDryLevel = 0.5f;

    return preset;
}

Preset PresetManager::createDeepPhaserPreset() const {
    Preset preset;
    preset.name = "Deep Phaser";
    preset.category = "Phaser";
    preset.description = "Classic 8-stage sweeping phaser with rich resonance";
    preset.author = "FilterGate";

    preset.phaserAStages = 8;
    preset.phaserARate = 0.5f;
    preset.phaserADepth = 0.8f;
    preset.phaserAFeedback = 0.7f;
    preset.phaserACenter = 1200.0f;
    preset.phaserASpread = 3000.0f;
    preset.phaserAMix = 0.7f;

    preset.mixerWetLevel = 0.8f;
    preset.mixerDryLevel = 0.2f;

    return preset;
}

Preset PresetManager::createFilterSweepPreset() const {
    Preset preset;
    preset.name = "Filter Sweep";
    preset.category = "Filter";
    preset.description = "Automatic filter sweep triggered by envelope follower";
    preset.author = "FilterGate";

    preset.filterModel = 0; // SVF
    preset.filterCutoff = 500.0f;
    preset.filterResonance = 0.7f;

    preset.envFollowerAttack = 10.0f;
    preset.envFollowerRelease = 200.0f;

    // Add modulation route: envelope follower to filter cutoff
    preset.modulationRoutes.add("4,0,0.8,10.0"); // ENV_FOLLOWER -> FILTER_CUTOFF

    preset.mixerWetLevel = 0.7f;
    preset.mixerDryLevel = 0.3f;

    return preset;
}

Preset PresetManager::createGateTriggerPreset() const {
    Preset preset;
    preset.name = "Gate Trigger";
    preset.category = "Modulation";
    preset.description = "Gate triggers envelopes for dynamic filter modulation";
    preset.author = "FilterGate";

    preset.gateThreshold = 0.4f;
    preset.gateAttack = 5.0f;
    preset.gateRelease = 100.0f;

    preset.env1Mode = 1; // ADSR
    preset.env1Attack = 20.0f;
    preset.env1Decay = 200.0f;
    preset.env1Sustain = 0.6f;
    preset.env1Release = 300.0f;

    preset.filterCutoff = 800.0f;
    preset.filterResonance = 0.5f;

    // Modulation: envelope 1 to filter cutoff
    preset.modulationRoutes.add("0,0,0.7,5.0"); // ENV1 -> FILTER_CUTOFF

    return preset;
}

Preset PresetManager::createModulationDemoPreset() const {
    Preset preset;
    preset.name = "Modulation Demo";
    preset.category = "Modulation";
    preset.description = "Showcases various modulation sources and destinations";
    preset.author = "FilterGate";

    preset.gateThreshold = 0.3f;

    preset.env1Mode = 1;
    preset.env1Attack = 50.0f;
    preset.env1Decay = 300.0f;
    preset.env1Sustain = 0.5f;
    preset.env1Release = 400.0f;

    preset.env2Mode = 1;
    preset.env2Attack = 30.0f;
    preset.env2Decay = 200.0f;
    preset.env2Sustain = 0.7f;
    preset.env2Release = 250.0f;

    preset.filterCutoff = 1000.0f;
    preset.filterResonance = 0.6f;

    preset.phaserARate = 0.6f;
    preset.phaserADepth = 0.6f;
    preset.phaserAMix = 0.5f;

    // Multiple modulation routes
    preset.modulationRoutes.add("0,0,0.8,10.0");   // ENV1 -> FILTER_CUTOFF
    preset.modulationRoutes.add("0,1,0.5,15.0");   // ENV1 -> FILTER_RESONANCE
    preset.modulationRoutes.add("1,4,0.6,8.0");    // ENV2 -> PHASER_A_CENTER
    preset.modulationRoutes.add("4,0,0.4,20.0");   // ENV_FOLLOWER -> FILTER_CUTOFF

    return preset;
}

Preset PresetManager::createDualPhaserPreset() const {
    Preset preset;
    preset.name = "Dual Phaser";
    preset.category = "Phaser";
    preset.description = "Two independent phasers in stereo configuration";
    preset.author = "FilterGate";

    preset.phaserAStages = 6;
    preset.phaserARate = 0.4f;
    preset.phaserADepth = 0.7f;
    preset.phaserAFeedback = 0.6f;
    preset.phaserACenter = 1000.0f;
    preset.phaserASpread = 2500.0f;

    preset.phaserBStages = 4;
    preset.phaserBRate = 0.6f;
    preset.phaserBDepth = 0.5f;
    preset.phaserBFeedback = 0.4f;
    preset.phaserBCenter = 1500.0f;
    preset.phaserBSpread = 2000.0f;

    preset.dualPhaserRouting = 2; // STEREO
    preset.dualPhaserLFOPhaseOffset = 90.0f;

    preset.mixerWetLevel = 0.7f;

    return preset;
}

Preset PresetManager::createSoftDrivePreset() const {
    Preset preset;
    preset.name = "Soft Drive";
    preset.category = "Distortion";
    preset.description = "Warm tube-like saturation with soft clipping";
    preset.author = "FilterGate";

    preset.preDriveType = 0; // SOFT_CLIP
    preset.preDriveDrive = 0.5f;
    preset.preDriveOutput = 1.0f;
    preset.preDriveTone = 0.6f;

    preset.postDriveType = 0;
    preset.postDriveDrive = 0.2f;
    preset.postDriveOutput = 1.0f;

    preset.mixerWetLevel = 0.6f;
    preset.mixerDryLevel = 0.4f;

    return preset;
}

Preset PresetManager::createHardClipPreset() const {
    Preset preset;
    preset.name = "Hard Clip";
    preset.category = "Distortion";
    preset.description = "Brutal hard clipping for aggressive distortion";
    preset.author = "FilterGate";

    preset.preDriveType = 1; // HARD_CLIP
    preset.preDriveDrive = 0.8f;
    preset.preDriveOutput = 0.7f;

    preset.postDriveType = 1;
    preset.postDriveDrive = 0.3f;
    preset.postDriveOutput = 0.8f;

    preset.mixerWetLevel = 1.0f;
    preset.mixerDryLevel = 0.0f;

    return preset;
}

Preset PresetManager::createVintagePreset() const {
    Preset preset;
    preset.name = "Vintage";
    preset.category = "Character";
    preset.description = "Classic 70s phaser with warm drive";
    preset.author = "FilterGate";

    preset.phaserAStages = 4;
    preset.phaserARate = 0.4f;
    preset.phaserADepth = 0.7f;
    preset.phaserAFeedback = 0.6f;
    preset.phaserACenter = 900.0f;
    preset.phaserASpread = 2200.0f;
    preset.phaserAMix = 0.6f;

    preset.preDriveType = 0; // SOFT_CLIP
    preset.preDriveDrive = 0.3f;
    preset.preDriveOutput = 1.0f;

    preset.mixerWetLevel = 0.7f;
    preset.mixerDryLevel = 0.3f;

    return preset;
}

Preset PresetManager::createModernPreset() const {
    Preset preset;
    preset.name = "Modern";
    preset.category = "Character";
    preset.description = "Clean, precise dual phaser with LFO stereo offset";
    preset.author = "FilterGate";

    preset.phaserAStages = 8;
    preset.phaserARate = 0.6f;
    preset.phaserADepth = 0.6f;
    preset.phaserAFeedback = 0.5f;
    preset.phaserACenter = 1200.0f;
    preset.phaserASpread = 2800.0f;

    preset.phaserBStages = 8;
    preset.phaserBRate = 0.6f;
    preset.phaserBDepth = 0.6f;
    preset.phaserBFeedback = 0.5f;
    preset.phaserBCenter = 1200.0f;
    preset.phaserBSpread = 2800.0f;

    preset.dualPhaserRouting = 2; // STEREO
    preset.dualPhaserLFOPhaseOffset = 180.0f;

    preset.mixerWetLevel = 0.6f;
    preset.mixerDryLevel = 0.4f;

    return preset;
}

Preset PresetManager::createAmbientPadPreset() const {
    Preset preset;
    preset.name = "Ambient Pad";
    preset.category = "Ambient";
    preset.description = "Slow, evolving filter modulations for ambient textures";
    preset.author = "FilterGate";

    preset.filterModel = 1; // LADDER
    preset.filterCutoff = 600.0f;
    preset.filterResonance = 0.4f;

    preset.env1Mode = 1;
    preset.env1Attack = 500.0f;
    preset.env1Decay = 1000.0f;
    preset.env1Sustain = 0.7f;
    preset.env1Release = 2000.0f;

    preset.env2Mode = 1;
    preset.env2Attack = 700.0f;
    preset.env2Decay = 1200.0f;
    preset.env2Sustain = 0.5f;
    preset.env2Release = 2500.0f;

    preset.phaserAStages = 4;
    preset.phaserARate = 0.1f;
    preset.phaserADepth = 0.5f;
    preset.phaserAMix = 0.4f;

    // Modulation routes for slow evolution
    preset.modulationRoutes.add("0,0,0.9,100.0");  // ENV1 -> FILTER_CUTOFF
    preset.modulationRoutes.add("1,1,0.6,150.0");  // ENV2 -> FILTER_RESONANCE
    preset.modulationRoutes.add("0,4,0.5,80.0");   // ENV1 -> PHASER_A_CENTER

    preset.mixerWetLevel = 0.8f;
    preset.mixerDryLevel = 0.2f;

    return preset;
}

Preset PresetManager::createFunkRhythmPreset() const {
    Preset preset;
    preset.name = "Funk Rhythm";
    preset.category = "Rhythm";
    preset.description = "Dynamic filter for funky rhythm guitar";
    preset.author = "FilterGate";

    preset.gateThreshold = 0.5f;
    preset.gateAttack = 1.0f;
    preset.gateRelease = 50.0f;

    preset.env1Mode = 0; // ADR (no sustain)
    preset.env1Attack = 10.0f;
    preset.env1Decay = 150.0f;
    preset.env1Release = 100.0f;
    preset.env1Loop = true;

    preset.filterModel = 0; // SVF
    preset.filterCutoff = 400.0f;
    preset.filterResonance = 0.8f;

    preset.modulationRoutes.add("0,0,1.0,2.0");   // ENV1 -> FILTER_CUTOFF (fast)

    preset.mixerWetLevel = 0.7f;
    preset.mixerDryLevel = 0.3f;

    return preset;
}

Preset PresetManager::createElectronicPreset() const {
    Preset preset;
    preset.name = "Electronic";
    preset.category = "Electronic";
    preset.description = "Sweeping filter with phaser for electronic music";
    preset.author = "FilterGate";

    preset.filterModel = 0; // SVF
    preset.filterCutoff = 1500.0f;
    preset.filterResonance = 0.6f;

    preset.phaserAStages = 6;
    preset.phaserARate = 0.8f;
    preset.phaserADepth = 0.7f;
    preset.phaserAFeedback = 0.6f;
    preset.phaserACenter = 1500.0f;
    preset.phaserASpread = 3000.0f;
    preset.phaserAMix = 0.5f;

    preset.envFollowerAttack = 5.0f;
    preset.envFollowerRelease = 100.0f;

    preset.modulationRoutes.add("4,0,0.7,10.0");  // ENV_FOLLOWER -> FILTER_CUTOFF
    preset.modulationRoutes.add("4,5,0.5,15.0");  // ENV_FOLLOWER -> PHASER_A_DEPTH

    preset.mixerRouting = 2; // PHASER_FILTER
    preset.mixerWetLevel = 0.8f;
    preset.mixerDryLevel = 0.2f;

    return preset;
}

Preset PresetManager::createBassEnhancerPreset() const {
    Preset preset;
    preset.name = "Bass Enhancer";
    preset.category = "Bass";
    preset.description = "Subtle filter and phaser for bass enhancement";
    preset.author = "FilterGate";

    preset.filterModel = 1; // LADDER
    preset.filterCutoff = 400.0f;
    preset.filterResonance = 0.3f;

    preset.phaserAStages = 4;
    preset.phaserARate = 0.2f;
    preset.phaserADepth = 0.3f;
    preset.phaserAFeedback = 0.2f;
    preset.phaserACenter = 500.0f;
    preset.phaserASpread = 1000.0f;
    preset.phaserAMix = 0.3f;

    preset.mixerWetLevel = 0.4f;
    preset.mixerDryLevel = 0.6f;

    return preset;
}

Preset PresetManager::createVocalFXPreset() const {
    Preset preset;
    preset.name = "Vocal FX";
    preset.category = "Vocal";
    preset.description = "Gentle phaser for vocal processing";
    preset.author = "FilterGate";

    preset.phaserAStages = 4;
    preset.phaserARate = 0.3f;
    preset.phaserADepth = 0.4f;
    preset.phaserAFeedback = 0.3f;
    preset.phaserACenter = 1500.0f;
    preset.phaserASpread = 2000.0f;
    preset.phaserAMix = 0.3f;

    preset.preDriveType = 0; // SOFT_CLIP
    preset.preDriveDrive = 0.2f;
    preset.preDriveOutput = 1.0f;

    preset.mixerWetLevel = 0.4f;
    preset.mixerDryLevel = 0.6f;

    return preset;
}

Preset PresetManager::createDrumBusPreset() const {
    Preset preset;
    preset.name = "Drum Bus";
    preset.category = "Drums";
    preset.description = "Transient-triggered filter for drum bus processing";
    preset.author = "FilterGate";

    preset.gateThreshold = 0.4f;
    preset.gateAttack = 1.0f;
    preset.gateHold = 50.0f;
    preset.gateRelease = 100.0f;

    preset.env1Mode = 0; // ADR
    preset.env1Attack = 5.0f;
    preset.env1Decay = 100.0f;
    preset.env1Release = 50.0f;
    preset.env1Loop = false;

    preset.filterModel = 0; // SVF
    preset.filterCutoff = 800.0f;
    preset.filterResonance = 0.5f;

    preset.modulationRoutes.add("0,0,0.8,1.0");   // ENV1 -> FILTER_CUTOFF (fast)
    preset.modulationRoutes.add("3,0,0.3,5.0");   // GATE -> FILTER_CUTOFF

    preset.mixerWetLevel = 0.6f;
    preset.mixerDryLevel = 0.4f;

    return preset;
}

Preset PresetManager::createSynthLeadPreset() const {
    Preset preset;
    preset.name = "Synth Lead";
    preset.category = "Synth";
    preset.description = "Dynamic filter with envelope for synth leads";
    preset.author = "FilterGate";

    preset.gateThreshold = 0.3f;

    preset.env1Mode = 1; // ADSR
    preset.env1Attack = 20.0f;
    preset.env1Decay = 200.0f;
    preset.env1Sustain = 0.6f;
    preset.env1Release = 300.0f;

    preset.filterModel = 1; // LADDER
    preset.filterCutoff = 2000.0f;
    preset.filterResonance = 0.7f;
    preset.filterDrive = 0.3f;

    preset.modulationRoutes.add("0,0,1.0,5.0");   // ENV1 -> FILTER_CUTOFF
    preset.modulationRoutes.add("0,1,0.5,8.0");   // ENV1 -> FILTER_RESONANCE

    preset.mixerWetLevel = 0.8f;
    preset.mixerDryLevel = 0.2f;

    return preset;
}

Preset PresetManager::createGuitarFXPreset() const {
    Preset preset;
    preset.name = "Guitar FX";
    preset.category = "Guitar";
    preset.description = "Classic guitar phaser with warm drive";
    preset.author = "FilterGate";

    preset.phaserAStages = 6;
    preset.phaserARate = 0.4f;
    preset.phaserADepth = 0.7f;
    preset.phaserAFeedback = 0.65f;
    preset.phaserACenter = 1100.0f;
    preset.phaserASpread = 2400.0f;
    preset.phaserAMix = 0.6f;

    preset.preDriveType = 0; // SOFT_CLIP
    preset.preDriveDrive = 0.4f;
    preset.preDriveOutput = 1.0f;
    preset.preDriveTone = 0.6f;

    preset.postDriveType = 0;
    preset.postDriveDrive = 0.2f;
    preset.postDriveOutput = 1.1f;

    preset.mixerWetLevel = 0.7f;
    preset.mixerDryLevel = 0.3f;

    return preset;
}

Preset PresetManager::createExperimentalPreset() const {
    Preset preset;
    preset.name = "Experimental";
    preset.category = "Experimental";
    preset.description = "Complex modulation routing for experimental sounds";
    preset.author = "FilterGate";

    preset.filterModel = 0;
    preset.filterCutoff = 1000.0f;
    preset.filterResonance = 0.6f;

    preset.phaserAStages = 8;
    preset.phaserARate = 1.2f;
    preset.phaserADepth = 0.8f;
    preset.phaserAFeedback = 0.7f;
    preset.phaserACenter = 1500.0f;
    preset.phaserASpread = 3500.0f;
    preset.phaserAMix = 0.6f;

    preset.phaserBStages = 4;
    preset.phaserBRate = 0.8f;
    preset.phaserBDepth = 0.6f;
    preset.phaserBFeedback = 0.5f;
    preset.phaserBCenter = 800.0f;
    preset.phaserBSpread = 2000.0f;
    preset.phaserBMix = 0.5f;

    preset.dualPhaserRouting = 1; // PARALLEL
    preset.dualPhaserCrossFeedback = 0.3f;

    preset.gateThreshold = 0.4f;

    preset.env1Mode = 1;
    preset.env1Attack = 30.0f;
    preset.env1Decay = 250.0f;
    preset.env1Sustain = 0.5f;
    preset.env1Release = 400.0f;

    // Complex modulation matrix
    preset.modulationRoutes.add("0,0,0.9,10.0");   // ENV1 -> FILTER_CUTOFF
    preset.modulationRoutes.add("0,1,0.7,15.0");   // ENV1 -> FILTER_RESONANCE
    preset.modulationRoutes.add("0,4,0.6,12.0");   // ENV1 -> PHASER_A_CENTER
    preset.modulationRoutes.add("0,8,0.5,8.0");    // ENV1 -> PHASER_B_CENTER
    preset.modulationRoutes.add("4,5,0.4,20.0");   // ENV_FOLLOWER -> PHASER_A_DEPTH
    preset.modulationRoutes.add("4,9,0.3,18.0");   // ENV_FOLLOWER -> PHASER_B_DEPTH
    preset.modulationRoutes.add("3,0,0.2,5.0");    // GATE -> FILTER_CUTOFF

    preset.mixerWetLevel = 0.9f;
    preset.mixerDryLevel = 0.1f;

    return preset;
}

Preset PresetManager::createExtremeModulationPreset() const {
    Preset preset;
    preset.name = "Extreme Modulation";
    preset.category = "Experimental";
    preset.description = "Maximum modulation depth for extreme sonic textures";
    preset.author = "FilterGate";

    preset.filterModel = 1; // LADDER
    preset.filterCutoff = 1000.0f;
    preset.filterResonance = 0.8f;
    preset.filterDrive = 0.5f;

    preset.phaserAStages = 8;
    preset.phaserARate = 2.0f;
    preset.phaserADepth = 1.0f;
    preset.phaserAFeedback = 0.9f;
    preset.phaserACenter = 2000.0f;
    preset.phaserASpread = 5000.0f;
    preset.phaserAMix = 0.8f;

    preset.env1Mode = 1;
    preset.env1Attack = 10.0f;
    preset.env1Decay = 100.0f;
    preset.env1Sustain = 1.0f;
    preset.env1Release = 500.0f;

    preset.env2Mode = 1;
    preset.env2Attack = 15.0f;
    preset.env2Decay = 150.0f;
    preset.env2Sustain = 0.8f;
    preset.env2Release = 400.0f;

    // Maximum modulation
    preset.modulationRoutes.add("0,0,1.0,2.0");    // ENV1 -> FILTER_CUTOFF (max, fast)
    preset.modulationRoutes.add("1,0,-1.0,3.0");   // ENV2 -> FILTER_CUTOFF (inverted, fast)
    preset.modulationRoutes.add("0,1,1.0,5.0");    // ENV1 -> FILTER_RESONANCE
    preset.modulationRoutes.add("0,4,1.0,5.0");    // ENV1 -> PHASER_A_CENTER
    preset.modulationRoutes.add("0,5,1.0,8.0");    // ENV1 -> PHASER_A_DEPTH
    preset.modulationRoutes.add("0,6,1.0,10.0");   // ENV1 -> PHASER_A_FEEDBACK
    preset.modulationRoutes.add("1,8,1.0,7.0");    // ENV2 -> PHASER_B_CENTER
    preset.modulationRoutes.add("4,0,0.8,1.0");    // ENV_FOLLOWER -> FILTER_CUTOFF

    preset.mixerWetLevel = 1.0f;
    preset.mixerDryLevel = 0.0f;
    preset.mixerOutputLevel = 0.8f;

    return preset;
}

Preset PresetManager::createMinimalPreset() const {
    Preset preset;
    preset.name = "Minimal";
    preset.category = "Character";
    preset.description = "Subtle effect with minimal processing";
    preset.author = "FilterGate";

    preset.phaserAStages = 4;
    preset.phaserARate = 0.2f;
    preset.phaserADepth = 0.2f;
    preset.phaserAFeedback = 0.2f;
    preset.phaserACenter = 1000.0f;
    preset.phaserASpread = 1000.0f;
    preset.phaserAMix = 0.2f;

    preset.mixerWetLevel = 0.3f;
    preset.mixerDryLevel = 0.7f;

    return preset;
}

void PresetManager::createFactoryPresets() {
    // Factory presets are created on-demand in getFactoryPresets()
}

} // namespace FilterGate
