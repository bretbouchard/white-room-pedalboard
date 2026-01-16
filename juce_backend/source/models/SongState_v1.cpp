/*
  SongState_v1.cpp - JSON serialization implementation

  Implementation of JSON serialization/deserialization for SongState_v1
  and related structures. Uses JUCE JSON library for parsing/generating.
*/

#include "../../include/models/SongState_v1.h"
#include <juce_core/juce_core.h>
#include <optional>

namespace white_room {
namespace models {

// =============================================================================
// Helper Functions
// =============================================================================

namespace {

/**
 Convert JUCE var to optional double
 */
std::optional<double> varToOptionalDouble(const juce::var& var) {
    if (var.isVoid() || var.isUndefined()) {
        return std::nullopt;
    }
    return {static_cast<double>(var)};
}

/**
 Convert JUCE var to optional string
 */
std::optional<std::string> varToOptionalString(const juce::var& var) {
    if (var.isVoid() || var.isUndefined()) {
        return std::nullopt;
    }
    return {var.toString().toStdString()};
}

/**
 Convert JUCE var to optional map
 */
template<typename T>
std::optional<std::map<std::string, T>> varToOptionalMap(const juce::var& var) {
    if (var.isVoid() || var.isUndefined() || !var.isObject()) {
        return std::nullopt;
    }

    std::map<std::string, T> result;
    auto* obj = var.getDynamicObject();

    if (obj) {
        for (const auto& [key, value] : obj->getProperties()) {
            // This is a simplified implementation
            // In production, you'd need to handle different types of T
        }
    }

    return result;
}

} // anonymous namespace

// =============================================================================
// NoteEvent Implementation
// =============================================================================

std::string NoteEvent::toJson() const {
    juce::DynamicObject::Ptr obj = new juce::DynamicObject();

    obj->setProperty("id", juce::String(id));
    obj->setProperty("voiceId", juce::String(voiceId));
    obj->setProperty("startTime", startTime);
    obj->setProperty("duration", duration);
    obj->setProperty("pitch", pitch);
    obj->setProperty("velocity", velocity);

    if (systemType.has_value()) {
        obj->setProperty("systemType", juce::String(systemType.value()));
    }
    if (systemId.has_value()) {
        obj->setProperty("systemId", juce::String(systemId.value()));
    }
    if (confidence.has_value()) {
        obj->setProperty("confidence", confidence.value());
    }

    juce::var jsonVar(obj);
    return juce::JSON::toString(jsonVar).toStdString();
}

NoteEvent NoteEvent::fromJson(const std::string& json) {
    juce::var jsonVar = juce::JSON::parse(juce::String(json));
    auto* obj = jsonVar.getDynamicObject();

    if (!obj) {
        throw std::runtime_error("Invalid JSON for NoteEvent");
    }

    NoteEvent note;
    note.id = obj->getProperty("id").toString().toStdString();
    note.voiceId = obj->getProperty("voiceId").toString().toStdString();
    note.startTime = static_cast<double>(obj->getProperty("startTime"));
    note.duration = static_cast<double>(obj->getProperty("duration"));
    note.pitch = static_cast<int>(obj->getProperty("pitch"));
    note.velocity = static_cast<int>(obj->getProperty("velocity"));

    // Optional fields
    if (obj->hasProperty("systemType")) {
        note.systemType = obj->getProperty("systemType").toString().toStdString();
    }
    if (obj->hasProperty("systemId")) {
        note.systemId = obj->getProperty("systemId").toString().toStdString();
    }
    if (obj->hasProperty("confidence")) {
        note.confidence = static_cast<double>(obj->getProperty("confidence"));
    }

    return note;
}

// =============================================================================
// TimelineSection Implementation
// =============================================================================

std::string TimelineSection::toJson() const {
    juce::DynamicObject::Ptr obj = new juce::DynamicObject();

    obj->setProperty("id", juce::String(id));
    obj->setProperty("name", juce::String(name));
    obj->setProperty("startTime", startTime);
    obj->setProperty("duration", duration);
    obj->setProperty("tempo", tempo);

    juce::Array<juce::var> timeSigArr;
    timeSigArr.add(timeSignature.first);
    timeSigArr.add(timeSignature.second);
    obj->setProperty("timeSignature", timeSigArr);

    juce::var jsonVar(obj);
    return juce::JSON::toString(jsonVar).toStdString();
}

TimelineSection TimelineSection::fromJson(const std::string& json) {
    juce::var jsonVar = juce::JSON::parse(juce::String(json));
    auto* obj = jsonVar.getDynamicObject();

    if (!obj) {
        throw std::runtime_error("Invalid JSON for TimelineSection");
    }

    TimelineSection section;
    section.id = obj->getProperty("id").toString().toStdString();
    section.name = obj->getProperty("name").toString().toStdString();
    section.startTime = static_cast<double>(obj->getProperty("startTime"));
    section.duration = static_cast<double>(obj->getProperty("duration"));
    section.tempo = static_cast<double>(obj->getProperty("tempo"));

    auto timeSigVar = obj->getProperty("timeSignature");
    if (timeSigVar.isArray()) {
        auto* arr = timeSigVar.getArray();
        if (arr && arr->size() == 2) {
            section.timeSignature.first = static_cast<int>((*arr)[0]);
            section.timeSignature.second = static_cast<int>((*arr)[1]);
        }
    }

    return section;
}

// =============================================================================
// Timeline Implementation
// =============================================================================

std::string Timeline::toJson() const {
    juce::DynamicObject::Ptr obj = new juce::DynamicObject();

    juce::Array<juce::var> sectionsArr;
    for (const auto& section : sections) {
        sectionsArr.add(juce::JSON::parse(section.toJson()));
    }
    obj->setProperty("sections", sectionsArr);

    obj->setProperty("tempo", tempo);

    juce::Array<juce::var> timeSigArr;
    timeSigArr.add(timeSignature.first);
    timeSigArr.add(timeSignature.second);
    obj->setProperty("timeSignature", timeSigArr);

    juce::var jsonVar(obj);
    return juce::JSON::toString(jsonVar).toStdString();
}

Timeline Timeline::fromJson(const std::string& json) {
    juce::var jsonVar = juce::JSON::parse(juce::String(json));
    auto* obj = jsonVar.getDynamicObject();

    if (!obj) {
        throw std::runtime_error("Invalid JSON for Timeline");
    }

    Timeline timeline;
    timeline.tempo = static_cast<double>(obj->getProperty("tempo"));

    auto timeSigVar = obj->getProperty("timeSignature");
    if (timeSigVar.isArray()) {
        auto* arr = timeSigVar.getArray();
        if (arr && arr->size() == 2) {
            timeline.timeSignature.first = static_cast<int>((*arr)[0]);
            timeline.timeSignature.second = static_cast<int>((*arr)[1]);
        }
    }

    auto sectionsVar = obj->getProperty("sections");
    if (sectionsVar.isArray()) {
        auto* arr = sectionsVar.getArray();
        if (arr) {
            for (const auto& sectionVar : *arr) {
                timeline.sections.push_back(
                    TimelineSection::fromJson(juce::JSON::toString(sectionVar).toStdString())
                );
            }
        }
    }

    return timeline;
}

// =============================================================================
// AutomationPoint Implementation
// =============================================================================

std::string AutomationPoint::toJson() const {
    juce::DynamicObject::Ptr obj = new juce::DynamicObject();

    obj->setProperty("time", time);
    obj->setProperty("value", value);

    if (curve.has_value()) {
        obj->setProperty("curve", juce::String(curve.value()));
    }

    juce::var jsonVar(obj);
    return juce::JSON::toString(jsonVar).toStdString();
}

AutomationPoint AutomationPoint::fromJson(const std::string& json) {
    juce::var jsonVar = juce::JSON::parse(juce::String(json));
    auto* obj = jsonVar.getDynamicObject();

    if (!obj) {
        throw std::runtime_error("Invalid JSON for AutomationPoint");
    }

    AutomationPoint point;
    point.time = static_cast<double>(obj->getProperty("time"));
    point.value = static_cast<double>(obj->getProperty("value"));

    if (obj->hasProperty("curve")) {
        point.curve = obj->getProperty("curve").toString().toStdString();
    }

    return point;
}

// =============================================================================
// Automation Implementation
// =============================================================================

std::string Automation::toJson() const {
    juce::DynamicObject::Ptr obj = new juce::DynamicObject();

    obj->setProperty("id", juce::String(id));
    obj->setProperty("parameter", juce::String(parameter));

    juce::Array<juce::var> pointsArr;
    for (const auto& point : points) {
        pointsArr.add(juce::JSON::parse(point.toJson()));
    }
    obj->setProperty("points", pointsArr);

    juce::var jsonVar(obj);
    return juce::JSON::toString(jsonVar).toStdString();
}

Automation Automation::fromJson(const std::string& json) {
    juce::var jsonVar = juce::JSON::parse(juce::String(json));
    auto* obj = jsonVar.getDynamicObject();

    if (!obj) {
        throw std::runtime_error("Invalid JSON for Automation");
    }

    Automation automation;
    automation.id = obj->getProperty("id").toString().toStdString();
    automation.parameter = obj->getProperty("parameter").toString().toStdString();

    auto pointsVar = obj->getProperty("points");
    if (pointsVar.isArray()) {
        auto* arr = pointsVar.getArray();
        if (arr) {
            for (const auto& pointVar : *arr) {
                automation.points.push_back(
                    AutomationPoint::fromJson(juce::JSON::toString(pointVar).toStdString())
                );
            }
        }
    }

    return automation;
}

// =============================================================================
// VoiceAssignment Implementation
// =============================================================================

std::string VoiceAssignment::toJson() const {
    juce::DynamicObject::Ptr obj = new juce::DynamicObject();

    obj->setProperty("voiceId", juce::String(voiceId));
    obj->setProperty("instrumentId", juce::String(instrumentId));
    obj->setProperty("presetId", juce::String(presetId));
    obj->setProperty("busId", juce::String(busId));

    juce::var jsonVar(obj);
    return juce::JSON::toString(jsonVar).toStdString();
}

VoiceAssignment VoiceAssignment::fromJson(const std::string& json) {
    juce::var jsonVar = juce::JSON::parse(juce::String(json));
    auto* obj = jsonVar.getDynamicObject();

    if (!obj) {
        throw std::runtime_error("Invalid JSON for VoiceAssignment");
    }

    VoiceAssignment assignment;
    assignment.voiceId = obj->getProperty("voiceId").toString().toStdString();
    assignment.instrumentId = obj->getProperty("instrumentId").toString().toStdString();
    assignment.presetId = obj->getProperty("presetId").toString().toStdString();
    assignment.busId = obj->getProperty("busId").toString().toStdString();

    return assignment;
}

// =============================================================================
// PresetAssignment Implementation
// =============================================================================

std::string PresetAssignment::toJson() const {
    juce::DynamicObject::Ptr obj = new juce::DynamicObject();

    obj->setProperty("instrumentType", juce::String(instrumentType));
    obj->setProperty("presetId", juce::String(presetId));

    juce::var jsonVar(obj);
    return juce::JSON::toString(jsonVar).toStdString();
}

PresetAssignment PresetAssignment::fromJson(const std::string& json) {
    juce::var jsonVar = juce::JSON::parse(juce::String(json));
    auto* obj = jsonVar.getDynamicObject();

    if (!obj) {
        throw std::runtime_error("Invalid JSON for PresetAssignment");
    }

    PresetAssignment assignment;
    assignment.instrumentType = obj->getProperty("instrumentType").toString().toStdString();
    assignment.presetId = obj->getProperty("presetId").toString().toStdString();

    return assignment;
}

// =============================================================================
// SongStateV1 Implementation
// =============================================================================

std::string SongStateV1::toJson() const {
    juce::DynamicObject::Ptr obj = new juce::DynamicObject();

    // Basic metadata
    obj->setProperty("version", juce::String(version));
    obj->setProperty("id", juce::String(id));
    obj->setProperty("sourceContractId", juce::String(sourceContractId));
    obj->setProperty("derivationId", juce::String(derivationId));

    // Timeline
    obj->setProperty("timeline", juce::JSON::parse(timeline.toJson()));

    // Notes
    juce::Array<juce::var> notesArr;
    for (const auto& note : notes) {
        notesArr.add(juce::JSON::parse(note.toJson()));
    }
    obj->setProperty("notes", notesArr);

    // Automations
    juce::Array<juce::var> automationsArr;
    for (const auto& automation : automations) {
        automationsArr.add(juce::JSON::parse(automation.toJson()));
    }
    obj->setProperty("automations", automationsArr);

    // Duration and tempo
    obj->setProperty("duration", duration);
    obj->setProperty("tempo", tempo);

    // Time signature
    juce::Array<juce::var> timeSigArr;
    timeSigArr.add(timeSignature.first);
    timeSigArr.add(timeSignature.second);
    obj->setProperty("timeSignature", timeSigArr);

    // Sample rate
    obj->setProperty("sampleRate", sampleRate);

    // Voice assignments
    juce::Array<juce::var> voiceAssignmentsArr;
    for (const auto& assignment : voiceAssignments) {
        voiceAssignmentsArr.add(juce::JSON::parse(assignment.toJson()));
    }
    obj->setProperty("voiceAssignments", voiceAssignmentsArr);

    // Console (simplified - full implementation would serialize all console fields)
    juce::DynamicObject::Ptr consoleObj = new juce::DynamicObject();
    consoleObj->setProperty("version", juce::String(console.version));
    consoleObj->setProperty("id", juce::String(console.id));
    obj->setProperty("console", juce::var(consoleObj));

    // Presets
    juce::Array<juce::var> presetsArr;
    for (const auto& preset : presets) {
        presetsArr.add(juce::JSON::parse(preset.toJson()));
    }
    obj->setProperty("presets", presetsArr);

    // Derived timestamp
    obj->setProperty("derivedAt", derivedAt);

    // Performances
    juce::Array<juce::var> performancesArr;
    for (const auto& perf : performances) {
        // This would require PerformanceState_v1::toJson() implementation
        // For now, create a minimal object
        juce::DynamicObject::Ptr perfObj = new juce::DynamicObject();
        perfObj->setProperty("id", juce::String(perf.id));
        perfObj->setProperty("name", juce::String(perf.name));
        perfObj->setProperty("arrangementStyle", juce::String(arrangementStyleToString(perf.arrangementStyle)));
        performancesArr.add(juce::var(perfObj));
    }
    obj->setProperty("performances", performancesArr);

    // Active performance ID
    obj->setProperty("activePerformanceId", juce::String(activePerformanceId));

    juce::var jsonVar(obj);
    return juce::JSON::toString(jsonVar, true).toStdString();  // true for all-on-one-line
}

SongStateV1 SongStateV1::fromJson(const std::string& json) {
    juce::var jsonVar = juce::JSON::parse(juce::String(json));
    auto* obj = jsonVar.getDynamicObject();

    if (!obj) {
        throw std::runtime_error("Invalid JSON for SongStateV1");
    }

    SongStateV1 state;

    // Basic metadata
    state.version = obj->getProperty("version").toString().toStdString();
    state.id = obj->getProperty("id").toString().toStdString();
    state.sourceContractId = obj->getProperty("sourceContractId").toString().toStdString();
    state.derivationId = obj->getProperty("derivationId").toString().toStdString();

    // Timeline
    auto timelineVar = obj->getProperty("timeline");
    if (timelineVar.isObject()) {
        state.timeline = Timeline::fromJson(juce::JSON::toString(timelineVar).toStdString());
    }

    // Notes
    auto notesVar = obj->getProperty("notes");
    if (notesVar.isArray()) {
        auto* arr = notesVar.getArray();
        if (arr) {
            for (const auto& noteVar : *arr) {
                state.notes.push_back(
                    NoteEvent::fromJson(juce::JSON::toString(noteVar).toStdString())
                );
            }
        }
    }

    // Automations
    auto automationsVar = obj->getProperty("automations");
    if (automationsVar.isArray()) {
        auto* arr = automationsVar.getArray();
        if (arr) {
            for (const auto& automationVar : *arr) {
                state.automations.push_back(
                    Automation::fromJson(juce::JSON::toString(automationVar).toStdString())
                );
            }
        }
    }

    // Duration and tempo
    state.duration = static_cast<double>(obj->getProperty("duration"));
    state.tempo = static_cast<double>(obj->getProperty("tempo"));

    // Time signature
    auto timeSigVar = obj->getProperty("timeSignature");
    if (timeSigVar.isArray()) {
        auto* arr = timeSigVar.getArray();
        if (arr && arr->size() == 2) {
            state.timeSignature.first = static_cast<int>((*arr)[0]);
            state.timeSignature.second = static_cast<int>((*arr)[1]);
        }
    }

    // Sample rate
    state.sampleRate = static_cast<double>(obj->getProperty("sampleRate"));

    // Voice assignments
    auto voiceAssignmentsVar = obj->getProperty("voiceAssignments");
    if (voiceAssignmentsVar.isArray()) {
        auto* arr = voiceAssignmentsVar.getArray();
        if (arr) {
            for (const auto& assignmentVar : *arr) {
                state.voiceAssignments.push_back(
                    VoiceAssignment::fromJson(juce::JSON::toString(assignmentVar).toStdString())
                );
            }
        }
    }

    // Console (simplified)
    auto consoleVar = obj->getProperty("console");
    if (consoleVar.isObject()) {
        auto* consoleObj = consoleVar.getDynamicObject();
        if (consoleObj) {
            state.console.version = consoleObj->getProperty("version").toString().toStdString();
            state.console.id = consoleObj->getProperty("id").toString().toStdString();
        }
    }

    // Presets
    auto presetsVar = obj->getProperty("presets");
    if (presetsVar.isArray()) {
        auto* arr = presetsVar.getArray();
        if (arr) {
            for (const auto& presetVar : *arr) {
                state.presets.push_back(
                    PresetAssignment::fromJson(juce::JSON::toString(presetVar).toStdString())
                );
            }
        }
    }

    // Derived timestamp
    state.derivedAt = static_cast<long long>(obj->getProperty("derivedAt"));

    // Performances (simplified - full implementation would use PerformanceState_v1::fromJson)
    auto performancesVar = obj->getProperty("performances");
    if (performancesVar.isArray()) {
        auto* arr = performancesVar.getArray();
        if (arr) {
            for (const auto& perfVar : *arr) {
                auto* perfObj = perfVar.getDynamicObject();
                if (perfObj) {
                    PerformanceState_v1 perf;
                    perf.id = perfObj->getProperty("id").toString().toStdString();
                    perf.name = perfObj->getProperty("name").toString().toStdString();

                    auto styleStr = perfObj->getProperty("arrangementStyle").toString().toStdString();
                    perf.arrangementStyle = stringToArrangementStyle(styleStr);

                    state.performances.push_back(perf);
                }
            }
        }
    }

    // Active performance ID
    state.activePerformanceId = obj->getProperty("activePerformanceId").toString().toStdString();

    return state;
}

} // namespace models
} // namespace white_room
