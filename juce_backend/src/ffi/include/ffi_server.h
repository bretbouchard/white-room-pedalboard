/**
 * White Room JUCE FFI Server
 *
 * FFI server for TypeScript SDK to JUCE Backend integration.
 * Provides realize, reconcile, and loadSong operations with schema validation.
 */

#pragma once

#include <string>
#include <memory>
#include <functional>
#include <mutex>
#include <nlohmann/json.hpp>

// =============================================================================
// TYPES
// =============================================================================

namespace white_room {
namespace ffi {

/**
 * Error codes for FFI operations
 */
enum class FFICode {
  SUCCESS = 0,
  INVALID_ARGUMENT = 1,
  VALIDATION_FAILED = 2,
  ENGINE_FAILED = 3,
  NOT_FOUND = 4,
  ALREADY_EXISTS = 5,
  INTERNAL_ERROR = 6
};

/**
 * FFI result with optional data
 */
template<typename T>
class FFIResult {
public:
  static FFIResult success(T data) {
    return FFIResult(std::move(data));
  }

  static FFIResult error(FFICode code, std::string message) {
    return FFIResult(code, std::move(message));
  }

  bool isSuccess() const { return code_ == FFICode::SUCCESS; }
  FFICode getCode() const { return code_; }
  const std::string& getMessage() const { return message_; }
  const T& getData() const { return data_; }

private:
  FFIResult(T data) : code_(FFICode::SUCCESS), data_(std::move(data)) {}
  FFIResult(FFICode code, std::string message)
    : code_(code), message_(std::move(message)) {}

  FFICode code_;
  std::string message_;
  T data_;
};

/**
 * Realization request
 */
struct RealizeRequest {
  std::string songId;           // SchillingerSong ID
  std::string songJson;         // SchillingerSong JSON
  uint64_t seed;                // PRNG seed
  double tempo;                 // BPM
  int timeSignatureNum;         // Time signature numerator
  int timeSignatureDen;         // Time signature denominator
  int sampleRate;               // Sample rate (Hz)
};

/**
 * Realization response
 */
struct RealizeResponse {
  std::string songModelId;      // Generated SongModel ID
  std::string songModelJson;    // SongModel JSON
  int durationSamples;          // Total duration in samples
  int noteCount;                // Number of generated notes
};

/**
 * Reconciliation request
 */
struct ReconcileRequest {
  std::string originalSongId;   // Original SchillingerSong ID
  std::string editedSongId;     // Edited SongModel ID
  std::string editedSongJson;   // Edited SongModel JSON
};

/**
 * Reconciliation response
 */
struct ReconcileResponse {
  std::string reportId;         // Generated ReconciliationReport ID
  std::string reportJson;       // ReconciliationReport JSON
  double confidence;            // Overall confidence score (0-1)
  std::string suggestedAction;  // Suggested next action
};

/**
 * Load song request
 */
struct LoadSongRequest {
  std::string songModelId;      // SongModel ID to load
  std::string songModelJson;    // SongModel JSON
};

/**
 * Load song response
 */
struct LoadSongResponse {
  bool success;                 // Load success
  std::string message;          // Status message
  int voiceCount;               // Number of loaded voices
};

// =============================================================================
// FFI SERVER
// =============================================================================

/**
 * FFI server for TypeScript SDK integration
 *
 * Thread-safe implementation with schema validation and audio engine
 * integration.
 */
class FFIServer {
public:
  /**
   * Get singleton instance
   */
  static FFIServer& getInstance();

  /**
   * Realize a SchillingerSong into a SongModel
   *
   * @param request Realization request
   * @return Result with SongModel or error
   */
  FFIResult<RealizeResponse> realize(const RealizeRequest& request);

  /**
   * Reconcile an edited SongModel back to theory
   *
   * @param request Reconciliation request
   * @return Result with ReconciliationReport or error
   */
  FFIResult<ReconcileResponse> reconcile(const ReconcileRequest& request);

  /**
   * Load a SongModel into the audio engine
   *
   * @param request Load song request
   * @return Result with load status or error
   */
  FFIResult<LoadSongResponse> loadSong(const LoadSongRequest& request);

  /**
   * Validate JSON against schema
   *
   * @param json JSON string to validate
   * @param schemaName Schema name (e.g., "SchillingerSong_v1", "SongModel_v1")
   * @return Result with validation status
   */
  FFIResult<bool> validateSchema(const std::string& json, const std::string& schemaName);

  /**
   * Get server version
   */
  static std::string getVersion();

  // Delete copy/move constructors
  FFIServer(const FFIServer&) = delete;
  FFIServer& operator=(const FFIServer&) = delete;
  FFIServer(FFIServer&&) = delete;
  FFIServer& operator=(FFIServer&&) = delete;

private:
  FFIServer();
  ~FFIServer();

  // Thread safety
  std::mutex mutex_;

  // Audio engine bridge (opaque pointer for now, will be implemented)
  class AudioEngineBridge;
  std::unique_ptr<AudioEngineBridge> audioEngine_;

  // Schema validator (opaque pointer for now, will be implemented)
  class SchemaValidator;
  std::unique_ptr<SchemaValidator> validator_;
};

} // namespace ffi
} // namespace white_room
