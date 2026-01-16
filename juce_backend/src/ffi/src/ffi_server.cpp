/**
 * White Room JUCE FFI Server Implementation
 *
 * Implementation of realize, reconcile, and loadSong operations.
 */

// JUCE global header - must be first
#include "JuceHeader.h"

#include "ffi_server.h"
#include <optional>
#include <sstream>

// =============================================================================
// FORWARD DECLARATIONS
// =============================================================================

namespace white_room {
namespace ffi {

// =============================================================================
// AUDIO ENGINE BRIDGE (Stub for now)
// =============================================================================

class FFIServer::AudioEngineBridge {
public:
  AudioEngineBridge() = default;
  ~AudioEngineBridge() = default;

  bool loadSong(const std::string& songModelJson, int& outVoiceCount) {
    // TODO: Implement actual audio engine loading
    juce::ignoreUnused(songModelJson);
    outVoiceCount = 0;
    return true;
  }

  bool isReady() const { return true; }
};

// =============================================================================
// SCHEMA VALIDATOR (Stub for now)
// =============================================================================

class FFIServer::SchemaValidator {
public:
  SchemaValidator() = default;
  ~SchemaValidator() = default;

  bool validate(const std::string& json, const std::string& schemaName) {
    // TODO: Implement actual JSON schema validation
    // For now, just check that JSON can be parsed
    try {
      nlohmann::json::parse(json);
      return true;
    } catch (const nlohmann::json::parse_error&) {
      return false;
    }
  }

  std::string getLastError() const {
    return lastError_;
  }

private:
  std::string lastError_;
};

// =============================================================================
// FFI SERVER IMPLEMENTATION
// =============================================================================

FFIServer::FFIServer()
  : audioEngine_(std::make_unique<AudioEngineBridge>()),
    validator_(std::make_unique<SchemaValidator>()) {
}

FFIServer::~FFIServer() = default;

FFIServer& FFIServer::getInstance() {
  static FFIServer instance;
  return instance;
}

FFIResult<RealizeResponse> FFIServer::realize(const RealizeRequest& request) {
  std::lock_guard<std::mutex> lock(mutex_);

  // Validate request
  if (request.songId.empty()) {
    return FFIResult<RealizeResponse>::error(
      FFICode::INVALID_ARGUMENT,
      "songId cannot be empty"
    );
  }

  if (request.songJson.empty()) {
    return FFIResult<RealizeResponse>::error(
      FFICode::INVALID_ARGUMENT,
      "songJson cannot be empty"
    );
  }

  // Validate input schema
  if (!validator_->validate(request.songJson, "SchillingerSong_v1")) {
    return FFIResult<RealizeResponse>::error(
      FFICode::VALIDATION_FAILED,
      "Invalid SchillingerSong schema: " + validator_->getLastError()
    );
  }

  try {
    // TODO: Implement actual realization logic
    // For now, generate a basic SongModel response

    // Parse input song
    auto songJson = nlohmann::json::parse(request.songJson);

    // Generate SongModel ID
    std::string songModelId = juce::Uuid().toString().toStdString();

    // Create basic SongModel response (stub)
    nlohmann::json songModel;
    songModel["version"] = "1.0";
    songModel["id"] = songModelId;
    songModel["sourceSongId"] = request.songId;
    songModel["derivationId"] = juce::Uuid().toString().toStdString();
    songModel["tempo"] = request.tempo;
    songModel["timeSignature"] = {request.timeSignatureNum, request.timeSignatureDen};
    songModel["sampleRate"] = request.sampleRate;
    songModel["duration"] = 0;  // Will be calculated during realization
    songModel["notes"] = nlohmann::json::array();
    songModel["voiceAssignments"] = nlohmann::json::array();
    songModel["derivedAt"] = std::time(nullptr);

    RealizeResponse response;
    response.songModelId = songModelId;
    response.songModelJson = songModel.dump();
    response.durationSamples = 0;
    response.noteCount = 0;

    return FFIResult<RealizeResponse>::success(std::move(response));

  } catch (const std::exception& e) {
    return FFIResult<RealizeResponse>::error(
      FFICode::INTERNAL_ERROR,
      std::string("Realization failed: ") + e.what()
    );
  }
}

FFIResult<ReconcileResponse> FFIServer::reconcile(const ReconcileRequest& request) {
  std::lock_guard<std::mutex> lock(mutex_);

  // Validate request
  if (request.originalSongId.empty()) {
    return FFIResult<ReconcileResponse>::error(
      FFICode::INVALID_ARGUMENT,
      "originalSongId cannot be empty"
    );
  }

  if (request.editedSongJson.empty()) {
    return FFIResult<ReconcileResponse>::error(
      FFICode::INVALID_ARGUMENT,
      "editedSongJson cannot be empty"
    );
  }

  // Validate input schema
  if (!validator_->validate(request.editedSongJson, "SongModel_v1")) {
    return FFIResult<ReconcileResponse>::error(
      FFICode::VALIDATION_FAILED,
      "Invalid SongModel schema: " + validator_->getLastError()
    );
  }

  try {
    // TODO: Implement actual reconciliation logic
    // For now, generate a basic ReconciliationReport response

    // Generate report ID
    std::string reportId = juce::Uuid().toString().toStdString();

    // Create basic ReconciliationReport response (stub)
    nlohmann::json report;
    report["version"] = "1.0";
    report["id"] = reportId;
    report["editedSongId"] = request.editedSongId;
    report["originalSongId"] = request.originalSongId;
    report["generatedAt"] = std::time(nullptr);

    // Edit classification (stub values)
    report["editClassification"] = {
      {"decorative", 0},
      {"structural", 0},
      {"destructive", 0}
    };

    // Confidence summary (stub values)
    report["confidenceSummary"] = {
      {"rhythm", 1.0},
      {"melody", 1.0},
      {"harmony", 1.0},
      {"form", 1.0},
      {"orchestration", 1.0},
      {"overall", 1.0}
    };

    // System matches (empty for now)
    report["systemMatches"] = nlohmann::json::array();

    // Losses (empty for now)
    report["losses"] = nlohmann::json::array();

    // Suggested actions (stub)
    report["suggestedActions"] = nlohmann::json::array();

    ReconcileResponse response;
    response.reportId = reportId;
    response.reportJson = report.dump();
    response.confidence = 1.0;  // Perfect confidence (stub)
    response.suggestedAction = "preserve_realization";

    return FFIResult<ReconcileResponse>::success(std::move(response));

  } catch (const std::exception& e) {
    return FFIResult<ReconcileResponse>::error(
      FFICode::INTERNAL_ERROR,
      std::string("Reconciliation failed: ") + e.what()
    );
  }
}

FFIResult<LoadSongResponse> FFIServer::loadSong(const LoadSongRequest& request) {
  std::lock_guard<std::mutex> lock(mutex_);

  // Validate request
  if (request.songModelId.empty()) {
    return FFIResult<LoadSongResponse>::error(
      FFICode::INVALID_ARGUMENT,
      "songModelId cannot be empty"
    );
  }

  if (request.songModelJson.empty()) {
    return FFIResult<LoadSongResponse>::error(
      FFICode::INVALID_ARGUMENT,
      "songModelJson cannot be empty"
    );
  }

  // Validate input schema
  if (!validator_->validate(request.songModelJson, "SongModel_v1")) {
    return FFIResult<LoadSongResponse>::error(
      FFICode::VALIDATION_FAILED,
      "Invalid SongModel schema: " + validator_->getLastError()
    );
  }

  // Check audio engine
  if (!audioEngine_->isReady()) {
    return FFIResult<LoadSongResponse>::error(
      FFICode::ENGINE_FAILED,
      "Audio engine not ready"
    );
  }

  try {
    // Load song into audio engine
    int voiceCount = 0;
    bool success = audioEngine_->loadSong(request.songModelJson, voiceCount);

    LoadSongResponse response;
    response.success = success;
    response.message = success ? "Song loaded successfully" : "Failed to load song";
    response.voiceCount = voiceCount;

    if (success) {
      return FFIResult<LoadSongResponse>::success(std::move(response));
    } else {
      return FFIResult<LoadSongResponse>::error(
        FFICode::ENGINE_FAILED,
        response.message
      );
    }

  } catch (const std::exception& e) {
    return FFIResult<LoadSongResponse>::error(
      FFICode::INTERNAL_ERROR,
      std::string("Load song failed: ") + e.what()
    );
  }
}

FFIResult<bool> FFIServer::validateSchema(const std::string& json, const std::string& schemaName) {
  std::lock_guard<std::mutex> lock(mutex_);

  if (json.empty()) {
    return FFIResult<bool>::error(
      FFICode::INVALID_ARGUMENT,
      "JSON cannot be empty"
    );
  }

  if (schemaName.empty()) {
    return FFIResult<bool>::error(
      FFICode::INVALID_ARGUMENT,
      "Schema name cannot be empty"
    );
  }

  bool valid = validator_->validate(json, schemaName);

  if (valid) {
    return FFIResult<bool>::success(true);
  } else {
    return FFIResult<bool>::error(
      FFICode::VALIDATION_FAILED,
      "Validation failed: " + validator_->getLastError()
    );
  }
}

std::string FFIServer::getVersion() {
  return "1.0.0";
}

} // namespace ffi
} // namespace white_room
