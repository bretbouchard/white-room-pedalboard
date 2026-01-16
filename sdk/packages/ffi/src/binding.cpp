/**
 * White Room NAPI FFI - TypeScript to C++ Bridge
 *
 * Provides native bindings for audio execution using node-addon-api (NAPI).
 * This is the bridge layer between TypeScript SDK and C++ audio engine.
 */

#include <napi.h>
#include <string>
#include <vector>
#include <memory>

// =============================================================================
// FORWARD DECLARATIONS
// =============================================================================

Napi::Object Init(Napi::Env env, Napi::Object exports);

// =============================================================================
// PING PONG - Basic Connectivity Test
// =============================================================================

/**
 * Ping function - tests FFI connectivity
 * Returns "pong" with optional message
 */
Napi::Value Ping(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Check if we received a valid string argument
  if (info.Length() > 0 && !info[0].IsUndefined() && !info[0].IsNull()) {
    // If argument provided, return it back with "pong" prefix
    if (!info[0].IsString()) {
      Napi::TypeError::New(env, "Expected a string argument").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    std::string message = info[0].As<Napi::String>().Utf8Value();
    return Napi::String::New(env, "pong: " + message);
  }

  // No argument, just return "pong"
  return Napi::String::New(env, "pong");
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Custom exception class for White Room FFI errors
 */
class FFIRuntimeError : public std::exception {
public:
  explicit FFIRuntimeError(const std::string& message) : message_(message) {}

  const char* what() const noexcept override {
    return message_.c_str();
  }

  std::string GetMessage() const {
    return message_;
  }

private:
  std::string message_;
};

/**
 * Test function that throws an error - tests exception propagation
 */
Napi::Value TestError(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  try {
    // Simulate an error condition
    throw FFIRuntimeError("This is a test error from C++");
  } catch (const FFIRuntimeError& e) {
    Napi::Error::New(env, e.GetMessage()).ThrowAsJavaScriptException();
    return env.Undefined();
  }
}

// =============================================================================
// JSON SERIALIZATION
// =============================================================================

/**
 * Serialize a JavaScript object to JSON string
 */
Napi::Value SerializeJSON(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected at least one argument").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Allow null, undefined, and any serializable value
  // Check if it's a valid JSON value (null, undefined, boolean, number, string, object, array)
  if (!info[0].IsNull() && !info[0].IsUndefined() &&
      !info[0].IsBoolean() && !info[0].IsNumber() &&
      !info[0].IsString() && !info[0].IsObject() && !info[0].IsArray()) {
    Napi::TypeError::New(env, "Expected a JSON-serializable value").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Get the global JSON object
  Napi::Object global = env.Global();
  Napi::Object json = global.Get("JSON").As<Napi::Object>();
  Napi::Function stringify = json.Get("stringify").As<Napi::Function>();

  // Call JSON.stringify
  Napi::Value result = stringify.Call(json, { info[0] });

  return result;
}

/**
 * Parse a JSON string to JavaScript object
 */
Napi::Value DeserializeJSON(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Expected at least one argument").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "Expected string argument").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Get the global JSON object
  Napi::Object global = env.Global();
  Napi::Object json = global.Get("JSON").As<Napi::Object>();
  Napi::Function parse = json.Get("parse").As<Napi::Function>();

  // Call JSON.parse
  Napi::Value result = parse.Call(json, { info[0] });

  return result;
}

// =============================================================================
// RHYTHM GENERATION (Book I Integration)
// =============================================================================

/**
 * Generate rhythm attacks from rhythm system configuration
 *
 * This function implements Schillinger Book I rhythm generation:
 * - Takes rhythm system configuration (generators, resultants, etc.)
 * - Returns array of attack points (time, accent level)
 *
 * @param rhythmSystemJSON - JSON string with RhythmSystem configuration
 * @param duration - Duration in beats to generate
 * @param measureLength - Length of one measure in beats (default 4)
 * @returns JSON string with attacks array: [{time: number, accent: number}, ...]
 */
Napi::Value GenerateRhythmAttacks(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected at least 2 arguments (rhythmSystemJSON, duration)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be JSON string with rhythm system").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[1].IsNumber()) {
    Napi::TypeError::New(env, "Second argument must be duration (number)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Parse rhythm system JSON
  Napi::Object global = env.Global();
  Napi::Object json = global.Get("JSON").As<Napi::Object>();
  Napi::Function parse = json.Get("parse").As<Napi::Function>();
  Napi::Value rhythmSystemValue = parse.Call(json, { info[0] });

  if (!rhythmSystemValue.IsObject()) {
    Napi::TypeError::New(env, "Invalid rhythm system JSON").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Object rhythmSystem = rhythmSystemValue.As<Napi::Object>();

  // Extract parameters
  double duration = info[1].As<Napi::Number>().DoubleValue();
  // double measureLength = 4.0;  // Default 4/4 time (unused in current implementation)

  // if (info.Length() >= 3 && info[2].IsNumber()) {
  //   measureLength = info[2].As<Napi::Number>().DoubleValue();
  // }

  // Suppress unused variable warning
  (void)duration;  // Will be used in future enhancements

  // Extract generators
  Napi::Value generatorsValue = rhythmSystem.Get("generators");
  if (!generatorsValue.IsArray()) {
    Napi::TypeError::New(env, "Rhythm system must have generators array").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Array generatorsArray = generatorsValue.As<Napi::Array>();

  // Validate: need at least 1 generator (for simple rhythms)
  if (generatorsArray.Length() < 1) {
    Napi::TypeError::New(env, "Rhythm system requires at least 1 generator").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Parse generators
  struct Generator {
    double period;
    double phase;
    double weight;
  };
  std::vector<Generator> generators;

  for (uint32_t i = 0; i < generatorsArray.Length(); ++i) {
    Napi::Value genValue = generatorsArray.Get(i);
    if (!genValue.IsObject()) {
      Napi::TypeError::New(env, "Each generator must be an object").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    Napi::Object genObj = genValue.As<Napi::Object>();

    Generator gen;
    gen.period = genObj.Get("period").As<Napi::Number>().DoubleValue();
    gen.phase = genObj.Get("phase").As<Napi::Number>().DoubleValue();
    gen.weight = genObj.Has("weight") ? genObj.Get("weight").As<Napi::Number>().DoubleValue() : 1.0;

    generators.push_back(gen);
  }

  // Generate attacks using interference pattern
  std::vector<std::pair<double, double>> attacks;  // (time, accent)

  for (double t = 0; t < duration; t += 0.0625) {  // 1/16 note resolution
    double totalAccent = 0.0;

    // Check each generator for attack at this time
    for (const auto& gen : generators) {
      // Calculate phase-adjusted time
      double adjustedTime = t + gen.phase;

      // Check if this is an attack point (periodic pulse)
      double phasePosition = fmod(adjustedTime, gen.period);

      // Attack occurs at phase = 0 (within small epsilon)
      if (phasePosition < 0.03125 || phasePosition > gen.period - 0.03125) {
        totalAccent += gen.weight;
      }
    }

    // If total accent > 0, we have an attack
    if (totalAccent > 0.0) {
      attacks.push_back({t, totalAccent});
    }
  }

  // Build result array
  Napi::Array result = Napi::Array::New(env, attacks.size());

  for (size_t i = 0; i < attacks.size(); ++i) {
    Napi::Object attack = Napi::Object::New(env);
    attack.Set("time", Napi::Number::New(env, attacks[i].first));
    attack.Set("accent", Napi::Number::New(env, attacks[i].second));
    result.Set(i, attack);
  }

  // Return as JSON string for consistency
  Napi::Function stringify = json.Get("stringify").As<Napi::Function>();
  return stringify.Call(json, { result });
}

// =============================================================================
// MELODY GENERATION (Book II Integration)
// =============================================================================

/**
 * Generate melody from melody system configuration
 *
 * This function implements Schillinger Book II melody generation:
 * - Takes melody system configuration (cycle length, intervals, constraints)
 * - Takes rhythm attack times (from Book I)
 * - Returns array of pitch events (time, pitch, velocity, duration)
 *
 * @param melodySystemJSON - JSON string with MelodySystem configuration
 * @param rhythmAttacksJSON - JSON string with rhythm attack times
 * @param duration - Duration in beats to generate
 * @param rootPitch - Root MIDI note number (default 60)
 * @returns JSON string with pitch events: [{time, pitch, velocity, duration}, ...]
 */
Napi::Value GenerateMelody(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Expected at least 3 arguments (melodySystemJSON, rhythmAttacksJSON, duration)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be JSON string with melody system").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[1].IsString()) {
    Napi::TypeError::New(env, "Second argument must be JSON string with rhythm attacks").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[2].IsNumber()) {
    Napi::TypeError::New(env, "Third argument must be duration (number)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Parse melody system JSON
  Napi::Object global = env.Global();
  Napi::Object json = global.Get("JSON").As<Napi::Object>();
  Napi::Function parse = json.Get("parse").As<Napi::Function>();
  Napi::Value melodySystemValue = parse.Call(json, { info[0] });

  if (!melodySystemValue.IsObject()) {
    Napi::TypeError::New(env, "Invalid melody system JSON").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Object melodySystem = melodySystemValue.As<Napi::Object>();

  // Parse rhythm attacks JSON
  Napi::Value rhythmAttacksValue = parse.Call(json, { info[1] });
  if (!rhythmAttacksValue.IsArray()) {
    Napi::TypeError::New(env, "Invalid rhythm attacks JSON").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Array rhythmAttacksArray = rhythmAttacksValue.As<Napi::Array>();

  // Extract parameters
  double duration = info[2].As<Napi::Number>().DoubleValue();
  int rootPitch = 60;  // Default C4

  if (info.Length() >= 4 && info[3].IsNumber()) {
    rootPitch = info[3].As<Napi::Number>().Int32Value();
  }

  // Extract melody system properties
  int cycleLength = melodySystem.Get("cycleLength").As<Napi::Number>().Int32Value();

  Napi::Value intervalSeedValue = melodySystem.Get("intervalSeed");
  if (!intervalSeedValue.IsArray()) {
    Napi::TypeError::New(env, "Melody system must have intervalSeed array").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Array intervalSeedArray = intervalSeedValue.As<Napi::Array>();
  std::vector<int> intervalSeed;

  for (uint32_t i = 0; i < intervalSeedArray.Length(); ++i) {
    intervalSeed.push_back(intervalSeedArray.Get(i).As<Napi::Number>().Int32Value());
  }

  // Extract contour constraints
  Napi::Value contourValue = melodySystem.Get("contourConstraints");
  std::string contourType = "oscillating";
  int maxIntervalLeaps = 12;

  if (contourValue.IsObject()) {
    Napi::Object contourObj = contourValue.As<Napi::Object>();
    if (contourObj.Has("type")) {
      contourType = contourObj.Get("type").As<Napi::String>().Utf8Value();
    }
    if (contourObj.Has("maxIntervalLeaps")) {
      maxIntervalLeaps = contourObj.Get("maxIntervalLeaps").As<Napi::Number>().Int32Value();
    }
  }

  // Extract register constraints
  int minPitch = 48;
  int maxPitch = 84;
  bool allowTransposition = true;

  Napi::Value registerValue = melodySystem.Get("registerConstraints");
  if (registerValue.IsObject()) {
    Napi::Object registerObj = registerValue.As<Napi::Object>();
    if (registerObj.Has("minPitch")) {
      minPitch = registerObj.Get("minPitch").As<Napi::Number>().Int32Value();
    }
    if (registerObj.Has("maxPitch")) {
      maxPitch = registerObj.Get("maxPitch").As<Napi::Number>().Int32Value();
    }
    if (registerObj.Has("allowTransposition")) {
      allowTransposition = registerObj.Get("allowTransposition").As<Napi::Boolean>().Value();
    }
  }

  // Generate melody from rhythm attacks
  struct PitchEvent {
    double time;
    int pitch;
    int velocity;
    double duration;
  };

  std::vector<PitchEvent> pitchEvents;
  int currentPitch = rootPitch;
  int previousPitch = rootPitch;

  for (uint32_t i = 0; i < rhythmAttacksArray.Length(); ++i) {
    Napi::Value attackValue = rhythmAttacksArray.Get(i);
    if (!attackValue.IsObject()) continue;

    Napi::Object attackObj = attackValue.As<Napi::Object>();
    double time = attackObj.Get("time").As<Napi::Number>().DoubleValue();

    if (time >= duration) break;

    // Calculate pitch using interval cycle
    if (i > 0) {
      int intervalIndex = (static_cast<int>(i) - 1) % cycleLength;
      int interval = intervalSeed[intervalIndex];
      currentPitch += interval;
    }

    // Apply contour constraints
    int constrainedPitch = currentPitch;

    if (contourType == "ascending" && i > 0) {
      if (constrainedPitch <= previousPitch) {
        constrainedPitch = previousPitch + 1;
      }
    } else if (contourType == "descending" && i > 0) {
      if (constrainedPitch >= previousPitch) {
        constrainedPitch = previousPitch - 1;
      }
    }

    // Apply max interval leaps
    if (i > 0) {
      int interval = constrainedPitch - previousPitch;
      if (abs(interval) > maxIntervalLeaps) {
        constrainedPitch = previousPitch + (interval > 0 ? maxIntervalLeaps : -maxIntervalLeaps);
      }
    }

    // Apply register constraints
    if (allowTransposition) {
      while (constrainedPitch < minPitch) constrainedPitch += 12;
      while (constrainedPitch > maxPitch) constrainedPitch -= 12;
    } else {
      constrainedPitch = std::max(minPitch, std::min(maxPitch, constrainedPitch));
    }

    // Ensure MIDI range
    constrainedPitch = std::max(0, std::min(127, constrainedPitch));

    // Calculate velocity based on contour
    int interval = constrainedPitch - previousPitch;
    int velocity = 80 + (interval * 2);
    velocity = std::max(0, std::min(127, velocity));

    // Calculate duration
    double nextTime = (i < rhythmAttacksArray.Length() - 1)
      ? rhythmAttacksArray.Get(i + 1).As<Napi::Object>().Get("time").As<Napi::Number>().DoubleValue()
      : duration;
    double noteDuration = std::max(0.25, nextTime - time);

    pitchEvents.push_back({time, constrainedPitch, velocity, noteDuration});

    previousPitch = constrainedPitch;
  }

  // Build result array
  Napi::Array result = Napi::Array::New(env, pitchEvents.size());

  for (size_t i = 0; i < pitchEvents.size(); ++i) {
    Napi::Object event = Napi::Object::New(env);
    event.Set("time", Napi::Number::New(env, pitchEvents[i].time));
    event.Set("pitch", Napi::Number::New(env, pitchEvents[i].pitch));
    event.Set("velocity", Napi::Number::New(env, pitchEvents[i].velocity));
    event.Set("duration", Napi::Number::New(env, pitchEvents[i].duration));
    result.Set(i, event);
  }

  // Return as JSON string
  Napi::Function stringify = json.Get("stringify").As<Napi::Function>();
  return stringify.Call(json, { result });
}

// =============================================================================
// HARMONY GENERATION (Book III Integration)
// =============================================================================

/**
 * Generate harmony from harmony system configuration
 *
 * This function implements Schillinger Book III harmony generation:
 * - Takes harmony system configuration (distribution, constraints)
 * - Takes rhythm attack times (from Book I)
 * - Returns array of chord events (time, root, intervals, weight)
 *
 * @param harmonySystemJSON - JSON string with HarmonySystem configuration
 * @param rhythmAttacksJSON - JSON string with rhythm attack times
 * @param duration - Duration in beats to generate
 * @param rootPitch - Root MIDI note number (default 60)
 * @returns JSON string with chord events: [{time, root, intervals, weight}, ...]
 */
Napi::Value GenerateHarmony(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Expected at least 3 arguments (harmonySystemJSON, rhythmAttacksJSON, duration)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be JSON string with harmony system").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[1].IsString()) {
    Napi::TypeError::New(env, "Second argument must be JSON string with rhythm attacks").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[2].IsNumber()) {
    Napi::TypeError::New(env, "Third argument must be duration (number)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Parse harmony system JSON
  Napi::Object global = env.Global();
  Napi::Object json = global.Get("JSON").As<Napi::Object>();
  Napi::Function parse = json.Get("parse").As<Napi::Function>();
  Napi::Value harmonySystemValue = parse.Call(json, { info[0] });

  if (!harmonySystemValue.IsObject()) {
    Napi::TypeError::New(env, "Invalid harmony system JSON").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Object harmonySystem = harmonySystemValue.As<Napi::Object>();

  // Parse rhythm attacks JSON
  Napi::Value rhythmAttacksValue = parse.Call(json, { info[1] });
  if (!rhythmAttacksValue.IsArray()) {
    Napi::TypeError::New(env, "Invalid rhythm attacks JSON").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Array rhythmAttacksArray = rhythmAttacksValue.As<Napi::Array>();

  // Extract parameters
  double duration = info[2].As<Napi::Number>().DoubleValue();
  int rootPitch = 60;  // Default C4

  if (info.Length() >= 4 && info[3].IsNumber()) {
    rootPitch = info[3].As<Napi::Number>().Int32Value();
  }

  // Extract distribution
  Napi::Value distributionValue = harmonySystem.Get("distribution");
  if (!distributionValue.IsArray()) {
    Napi::TypeError::New(env, "Harmony system must have distribution array").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Array distributionArray = distributionValue.As<Napi::Array>();
  std::vector<double> distribution;

  for (uint32_t i = 0; i < distributionArray.Length(); ++i) {
    distribution.push_back(distributionArray.Get(i).As<Napi::Number>().DoubleValue());
  }

  // Generate harmony from rhythm attacks
  struct ChordEvent {
    double time;
    int root;
    std::vector<int> intervals;
    double weight;
  };

  std::vector<ChordEvent> chordEvents;
  int currentRoot = rootPitch;

  for (uint32_t i = 0; i < rhythmAttacksArray.Length(); ++i) {
    Napi::Value attackValue = rhythmAttacksArray.Get(i);
    if (!attackValue.IsObject()) continue;

    Napi::Object attackObj = attackValue.As<Napi::Object>();
    double time = attackObj.Get("time").As<Napi::Number>().DoubleValue();

    if (time >= duration) break;

    // Generate chord intervals from distribution
    std::vector<int> intervals;

    // Select intervals based on distribution weights
    int numVoices = 3 + (i % 3);  // 3-5 voices
    for (int j = 0; j < numVoices; ++j) {
      int intervalIndex = (static_cast<int>(i) + j) % 12;
      if (distribution[intervalIndex] > 0.1) {
        intervals.push_back(intervalIndex + 1);  // 1-based intervals
      }
    }

    // Remove duplicates and sort
    std::sort(intervals.begin(), intervals.end());
    intervals.erase(std::unique(intervals.begin(), intervals.end()), intervals.end());

    // Ensure at least a triad
    if (intervals.size() < 3) {
      intervals = {3, 5, 7};  // Major triad
    }

    // Calculate weight (first and last chords are more important)
    double weight = (i == 0 || i == rhythmAttacksArray.Length() - 1) ? 1.0 : 0.7;

    chordEvents.push_back({time, currentRoot, intervals, weight});

    // Transition root (simple stepwise motion)
    int step = (i % 4 < 2) ? 2 : -2;  // Mix of ascending and descending
    currentRoot += step;
  }

  // Build result array
  Napi::Array result = Napi::Array::New(env, chordEvents.size());

  for (size_t i = 0; i < chordEvents.size(); ++i) {
    Napi::Object event = Napi::Object::New(env);
    event.Set("time", Napi::Number::New(env, chordEvents[i].time));
    event.Set("root", Napi::Number::New(env, chordEvents[i].root));

    Napi::Array intervalsArray = Napi::Array::New(env, chordEvents[i].intervals.size());
    for (size_t j = 0; j < chordEvents[i].intervals.size(); ++j) {
      intervalsArray.Set(j, Napi::Number::New(env, chordEvents[i].intervals[j]));
    }
    event.Set("intervals", intervalsArray);
    event.Set("weight", Napi::Number::New(env, chordEvents[i].weight));
    result.Set(i, event);
  }

  // Return as JSON string
  Napi::Function stringify = json.Get("stringify").As<Napi::Function>();
  return stringify.Call(json, { result });
}

// =============================================================================
// FORM GENERATION (Book IV Integration)
// =============================================================================

/**
 * Generate form structure from form system configuration
 *
 * This function implements Schillinger Book IV form generation:
 * - Takes form system configuration (ratio tree, sections)
 * - Returns array of form sections with durations
 *
 * @param formSystemJSON - JSON string with FormSystem configuration
 * @param totalDuration - Total duration in beats
 * @returns JSON string with form sections: [{sectionId, startTime, duration, ...}, ...]
 */
Napi::Value GenerateForm(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Validate arguments
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected at least 2 arguments (formSystemJSON, totalDuration)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be JSON string with form system").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[1].IsNumber()) {
    Napi::TypeError::New(env, "Second argument must be totalDuration (number)").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Parse form system JSON
  Napi::Object global = env.Global();
  Napi::Object json = global.Get("JSON").As<Napi::Object>();
  Napi::Function parse = json.Get("parse").As<Napi::Function>();
  Napi::Value formSystemValue = parse.Call(json, { info[0] });

  if (!formSystemValue.IsObject()) {
    Napi::TypeError::New(env, "Invalid form system JSON").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Object formSystem = formSystemValue.As<Napi::Object>();

  // Extract parameters
  double totalDuration = info[1].As<Napi::Number>().DoubleValue();

  // Extract ratio tree
  Napi::Value ratioTreeValue = formSystem.Get("ratioTree");
  if (!ratioTreeValue.IsObject()) {
    Napi::TypeError::New(env, "Form system must have ratioTree object").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  Napi::Object ratioTree = ratioTreeValue.As<Napi::Object>();

  // Extract section definitions (optional)
  std::vector<std::string> sectionIds;
  Napi::Value sectionsValue = formSystem.Get("sectionDefinitions");

  if (sectionsValue.IsArray()) {
    Napi::Array sectionsArray = sectionsValue.As<Napi::Array>();
    for (uint32_t i = 0; i < sectionsArray.Length(); ++i) {
      Napi::Value sectionValue = sectionsArray.Get(i);
      if (sectionValue.IsObject()) {
        Napi::Object sectionObj = sectionValue.As<Napi::Object>();
        Napi::Value sectionIdValue = sectionObj.Get("sectionId");
        if (sectionIdValue.IsString()) {
          sectionIds.push_back(sectionIdValue.As<Napi::String>().Utf8Value());
        }
      }
    }
  }

  // Extract nesting depth
  int nestingDepth = 3;
  if (formSystem.Has("nestingDepth")) {
    nestingDepth = formSystem.Get("nestingDepth").As<Napi::Number>().Int32Value();
  }

  // Flatten ratio tree into sections
  struct FormSection {
    std::string sectionId;
    double startTime;
    double duration;
  };

  std::vector<FormSection> formSections;

  // Helper function to flatten tree
  std::function<void(Napi::Object, double, double, int)> flattenTree =
    [&](Napi::Object node, double offset, double remainingDuration, int level) {
      // Check if leaf node or exceeded max depth
      Napi::Value childrenValue = node.Get("children");
      bool hasChildren = childrenValue.IsArray() && childrenValue.As<Napi::Array>().Length() > 0;

      if (!hasChildren || level > nestingDepth) {
        // Leaf node - create section
        std::string sectionId = node.Get("nodeId").As<Napi::String>().Utf8Value();
        formSections.push_back({sectionId, offset, remainingDuration});
        return;
      }

      // Distribute duration among children based on ratios
      Napi::Array childrenArray = childrenValue.As<Napi::Array>();
      double totalRatio = 0.0;

      for (uint32_t i = 0; i < childrenArray.Length(); ++i) {
        Napi::Object child = childrenArray.Get(i).As<Napi::Object>();
        totalRatio += child.Get("ratio").As<Napi::Number>().DoubleValue();
      }

      double currentOffset = offset;
      for (uint32_t i = 0; i < childrenArray.Length(); ++i) {
        Napi::Object child = childrenArray.Get(i).As<Napi::Object>();
        double ratio = child.Get("ratio").As<Napi::Number>().DoubleValue();
        double childDuration = (ratio / totalRatio) * remainingDuration;
        flattenTree(child, currentOffset, childDuration, level + 1);
        currentOffset += childDuration;
      }
    };

  // Start flattening from root
  flattenTree(ratioTree, 0.0, totalDuration, 1);

  // Build result array
  Napi::Array result = Napi::Array::New(env, formSections.size());

  for (size_t i = 0; i < formSections.size(); ++i) {
    Napi::Object section = Napi::Object::New(env);
    section.Set("sectionId", Napi::String::New(env, formSections[i].sectionId));
    section.Set("startTime", Napi::Number::New(env, formSections[i].startTime));
    section.Set("duration", Napi::Number::New(env, formSections[i].duration));
    result.Set(i, section);
  }

  // Return as JSON string
  Napi::Function stringify = json.Get("stringify").As<Napi::Function>();
  return stringify.Call(json, { result });
}

// =============================================================================
// MODULE INITIALIZATION
// =============================================================================

/**
 * Initialize the module
 */
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  // Register ping-pong test function
  exports.Set(
    Napi::String::New(env, "ping"),
    Napi::Function::New(env, Ping)
  );

  // Register error test function
  exports.Set(
    Napi::String::New(env, "testError"),
    Napi::Function::New(env, TestError)
  );

  // Register JSON serialization functions
  exports.Set(
    Napi::String::New(env, "serializeJSON"),
    Napi::Function::New(env, SerializeJSON)
  );

  exports.Set(
    Napi::String::New(env, "deserializeJSON"),
    Napi::Function::New(env, DeserializeJSON)
  );

  // Register rhythm generation function
  exports.Set(
    Napi::String::New(env, "generateRhythmAttacks"),
    Napi::Function::New(env, GenerateRhythmAttacks)
  );

  // Register melody generation function
  exports.Set(
    Napi::String::New(env, "generateMelody"),
    Napi::Function::New(env, GenerateMelody)
  );

  // Register harmony generation function
  exports.Set(
    Napi::String::New(env, "generateHarmony"),
    Napi::Function::New(env, GenerateHarmony)
  );

  // Register form generation function
  exports.Set(
    Napi::String::New(env, "generateForm"),
    Napi::Function::New(env, GenerateForm)
  );

  return exports;
}

// Register the module with NODE_API_MODULE
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
