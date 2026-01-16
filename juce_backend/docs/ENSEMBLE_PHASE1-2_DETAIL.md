# Phase 1-2 Implementation Guide: C++ Types + FFI Bridge

**Timeline:** Week 1 (5-7 days)
**Prerequisites:** C++20, CMake, existing SchillingerEngineCore codebase

## Quick Start

This guide provides complete code for implementing:
1. C++ types for realized ensemble (VoiceSpec, EnsembleSource, RealizedVoice)
2. Stable ID preservation algorithm
3. FFI bridge to expose to Swift

## Files to Create

### 1. VoiceSpec.hpp
```cpp
#pragma once
#include <string>
#include <cstdint>

namespace sch {
enum class MusicalFunction : uint8_t {
  Bass = 0, Harmony = 1, Melody = 2, Rhythm = 3,
  Texture = 4, Ornament = 5, Accent = 6, Drone = 7,
  Counterline = 8, Custom = 99
};

struct VoiceSpec {
  double rangeLow = 0;
  double rangeHigh = 127;
  double tessitura = 60.0;
  double ambitus = 24.0;
  double density = 0.5;
  double centroid = 60.0;
  double spread = 12.0;

  std::string fingerprint() const {
    char buf[256];
    snprintf(buf, sizeof(buf), "%.2f-%.2f-%.2f-%.2f-%.2f-%.2f-%.2f",
             rangeLow, rangeHigh, tessitura, ambitus,
             density, centroid, spread);
    return std::string(buf);
  }

  bool operator==(const VoiceSpec& other) const {
    return fingerprint() == other.fingerprint();
  }
};
}
```

### 2. EnsembleSource.hpp  
```cpp
#pragma once
#include <string>
#include <vector>

namespace sch {
struct EnsembleSource {
  std::string authoredRoleID;
  std::string sectionID;
  std::string patternID;
  
  enum class SystemType : uint8_t {
    RhythmResultant = 0, HarmonyAxis = 1,
    MelodyContour = 2, TextureDensity = 3, Custom = 99
  } systemType;

  std::vector<std::string> derivationPath;

  static EnsembleSource fromRole(const std::string& roleID) {
    EnsembleSource source;
    source.authoredRoleID = roleID;
    source.systemType = SystemType::RhythmResultant;
    source.derivationPath = {"role:" + roleID};
    return source;
  }

  void addDerivationStep(const std::string& step) {
    derivationPath.push_back(step);
  }
};
}
```

### 3. RealizedEnsemble.hpp
```cpp
#pragma once
#include "VoiceSpec.hpp"
#include "EnsembleSource.hpp"
#include <string>
#include <vector>
#include <functional>

namespace sch {
struct RealizedVoice {
  std::string id;
  MusicalFunction function;
  VoiceSpec voiceSpec;
  OrchestrationSpec orchestration;
  EnsembleSource source;

  std::string getFingerprint() const {
    return std::to_string(static_cast<int>(function)) + "-" +
           source.authoredRoleID + "-" +
           source.patternID + "-" +
           voiceSpec.fingerprint();
  }

  bool isMusicallySame(const RealizedVoice& other) const {
    return function == other.function &&
           source.authoredRoleID == other.source.authoredRoleID &&
           source.patternID == other.source.patternID &&
           voiceSpec == other.voiceSpec;
  }
};

class RealizedEnsembleModel_v1 {
public:
  std::vector<RealizedVoice> members;

  std::string generateStableID(const RealizedVoice& voice) {
    char buf[128];
    snprintf(buf, sizeof(buf), "voice-%s-%08x",
             voice.source.authoredRoleID.c_str(),
             static_cast<uint32_t>(std::hash<std::string>{}(
               voice.getFingerprint())));
    return std::string(buf);
  }

  size_t preserveMatchingIDs(
    const RealizedEnsembleModel_v1& previous,
    std::function<bool(const RealizedVoice&, const RealizedVoice&)> 
      comparator = &RealizedVoice::isMusicallySame
  ) {
    size_t preserved = 0;
    for (auto& newVoice : members) {
      for (const auto& oldVoice : previous.members) {
        if (comparator(newVoice, oldVoice)) {
          newVoice.id = oldVoice.id;
          preserved++;
          break;
        }
      }
      if (newVoice.id.empty()) {
        newVoice.id = generateStableID(newVoice);
      }
    }
    return preserved;
  }
};
}
```

### 4. StableIDPreserver.hpp
```cpp
#pragma once
#include "RealizedEnsemble.hpp"

namespace sch {
class StableIDPreserver {
public:
  static RealizedEnsembleModel_v1 preserveIDs(
    const RealizedEnsembleModel_v1& previous,
    RealizedEnsembleModel_v1 current
  ) {
    size_t preserved = 0;
    for (auto& newVoice : current.members) {
      for (const auto& oldVoice : previous.members) {
        if (newVoice.isMusicallySame(oldVoice)) {
          newVoice.id = oldVoice.id;
          preserved++;
          break;
        }
      }
      if (newVoice.id.empty()) {
        newVoice.id = current.generateStableID(newVoice);
      }
    }
    return current;
  }
};
}
```

## FFI Bridge (schillinger_ffi.h additions)

```c
typedef enum {
  SCH_MUSICAL_FUNCTION_BASS = 0,
  SCH_MUSICAL_FUNCTION_HARMONY = 1,
  SCH_MUSICAL_FUNCTION_MELODY = 2,
  SCH_MUSICAL_FUNCTION_RHYTHM = 3,
  SCH_MUSICAL_FUNCTION_TEXTURE = 4,
  SCH_MUSICAL_FUNCTION_ORNAMENT = 5,
  SCH_MUSICAL_FUNCTION_ACCENT = 6,
  SCH_MUSICAL_FUNCTION_DRONE = 7,
  SCH_MUSICAL_FUNCTION_COUNTERLINE = 8,
  SCH_MUSICAL_FUNCTION_CUSTOM = 99
} sch_musical_function_t;

typedef struct {
  char id[64];
  sch_musical_function_t function;
  char authored_role_id[64];
  char pattern_id[64];
  char section_id[64];
  double range_low;
  double range_high;
  double tessitura;
  double density;
  char preferred_instrument[128];
  double min_volume;
  double max_volume;
  double pan;
  int32_t midi_channel;
} sch_realized_voice_t;

typedef struct {
  sch_realized_voice_t* voices;
  int32_t voice_count;
} sch_realized_ensemble_t;

sch_result_t sch_engine_get_realized_ensemble(
  sch_engine_t* e,
  uint64_t song_id,
  sch_realized_ensemble_t* out_ensemble
);

void sch_engine_free_realized_ensemble(
  sch_realized_ensemble_t* ensemble
);

sch_result_t sch_engine_regenerate_realization(
  sch_engine_t* e,
  uint64_t song_id
);
```

## Unit Tests

```cpp
TEST(RealizedEnsemble, GenerateStableID) {
  RealizedEnsembleModel_v1 ensemble;
  RealizedVoice voice;
  voice.source.authoredRoleID = "bass";
  voice.function = MusicalFunction::Bass;
  
  std::string id = ensemble.generateStableID(voice);
  EXPECT_FALSE(id.empty());
  EXPECT_EQ(id.find("voice-bass-"), 0);
}

TEST(RealizedEnsemble, PreserveIDs_Unchanged) {
  RealizedEnsembleModel_v1 oldEnsemble;
  RealizedVoice voice1;
  voice1.id = "voice-bass-12345678";
  voice1.function = MusicalFunction::Bass;
  voice1.source.authoredRoleID = "bass-role";
  voice1.source.patternID = "3:2-polyrhythm";
  oldEnsemble.addVoice(voice1);

  RealizedEnsembleModel_v1 newEnsemble;
  RealizedVoice voice2;
  voice2.function = MusicalFunction::Bass;
  voice2.source.authoredRoleID = "bass-role";
  voice2.source.patternID = "3:2-polyrhythm";
  newEnsemble.addVoice(voice2);

  newEnsemble = StableIDPreserver::preserveIDs(oldEnsemble, newEnsemble);
  EXPECT_EQ(newEnsemble.members[0].id, "voice-bass-12345678");
}

TEST(RealizedEnsemble, PreserveIDs_Changed) {
  // Similar but change function to Harmony
  // Should generate NEW ID
}
```

## Build Steps

```bash
cd build/
cmake .. -DCMAKE_BUILD_TYPE=Debug
make SchillingerEngineCore -j$(sysctl -n hw.ncpu)
ctest -R RealizedEnsemble -V
```

## Success Criteria

- [ ] All headers compile
- [ ] Unit tests pass (4/4)
- [ ] No memory leaks (Valgrind)
- [ ] FFI functions link correctly
- [ ] Can call from C test program

## Next Phase

After Phase 1-2 complete, proceed to Phase 3 (Swift SDK layer).
