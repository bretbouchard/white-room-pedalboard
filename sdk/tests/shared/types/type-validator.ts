/**
 * Simple type validation test runner
 * This validates that types can be imported and used correctly
 */

// Test 1: Import all SongModel types
import type {
  SongModel_v1,
  TransportConfig,
  Section_v1,
  Role_v1,
  Projection_v1,
  MixGraph_v1,
  RealizationPolicy,
  SongMetadata,
  TempoEvent,
  TimeSignatureEvent,
  LoopPolicy,
  GeneratorConfig,
  RoleParameters,
  ProjectionTarget,
  TransformConfig,
  TrackConfig,
  BusConfig,
  SendConfig,
  MasterConfig,
} from "../../../packages/shared/src/types/song-model";

// Test 2: Create a minimal valid model
const minimalModel: SongModel_v1 = {
  version: "1.0",
  id: "test-song-1",
  createdAt: Date.now(),
  metadata: {
    title: "Test Song",
    composer: "Test Composer",
    duration: 180,
  },
  transport: {
    tempoMap: [
      {
        time: { seconds: 0, beats: 0, measures: 0 },
        tempo: 120,
      },
    ],
    timeSignatureMap: [
      {
        time: { seconds: 0, beats: 0, measures: 0 },
        numerator: 4,
        denominator: 4,
      },
    ],
    loopPolicy: {
      enabled: false,
    },
    playbackSpeed: 1.0,
  },
  sections: [],
  roles: [],
  projections: [],
  mixGraph: {
    tracks: [],
    buses: [],
    sends: [],
    master: {
      volume: 0.8,
    },
  },
  realizationPolicy: {
    windowSize: { seconds: 2.0, beats: 8, measures: 2 },
    lookaheadDuration: { seconds: 1.0, beats: 4, measures: 1 },
    determinismMode: "strict",
  },
  determinismSeed: "test-seed-12345",
};

// Test 3: Validate all required fields are present
console.log("✅ SongModel_v1 type validation passed");
console.log(`  - Version: ${minimalModel.version}`);
console.log(`  - ID: ${minimalModel.id}`);
console.log(`  - Metadata: ${minimalModel.metadata.title}`);
console.log(
  `  - Transport: ${minimalModel.transport.tempoMap.length} tempo events`,
);
console.log(`  - Sections: ${minimalModel.sections.length}`);
console.log(`  - Roles: ${minimalModel.roles.length}`);
console.log(`  - Projections: ${minimalModel.projections.length}`);
console.log(`  - Mix Graph: ${minimalModel.mixGraph.tracks.length} tracks`);
console.log(
  `  - Realization Policy: ${minimalModel.realizationPolicy.determinismMode}`,
);
console.log(`  - Determinism Seed: ${minimalModel.determinismSeed}`);

// Test 4: Validate JSON serialization
const json = JSON.stringify(minimalModel);
console.log("\n✅ JSON serialization passed");
console.log(`  - Serialized length: ${json.length} bytes`);

const deserialized = JSON.parse(json) as SongModel_v1;
console.log("\n✅ JSON deserialization passed");
console.log(`  - Version preserved: ${deserialized.version === "1.0"}`);
console.log(`  - ID preserved: ${deserialized.id === minimalModel.id}`);
console.log(
  `  - Seed preserved: ${deserialized.determinismSeed === minimalModel.determinismSeed}`,
);

// Test 5: Validate MusicalRoleType
const roleTypes: Array<Role_v1["type"]> = [
  "bass",
  "harmony",
  "melody",
  "rhythm",
  "texture",
  "ornament",
];
console.log("\n✅ MusicalRoleType validation passed");
console.log(`  - Supported types: ${roleTypes.join(", ")}`);

// Test 6: Validate DeterminismMode
const determinismModes: Array<RealizationPolicy["determinismMode"]> = [
  "strict",
  "seeded",
  "loose",
];
console.log("\n✅ DeterminismMode validation passed");
console.log(`  - Supported modes: ${determinismModes.join(", ")}`);

// Test 7: Validate ProjectionTarget types
const targetTypes: Array<ProjectionTarget["type"]> = [
  "track",
  "bus",
  "instrument",
];
console.log("\n✅ ProjectionTarget validation passed");
console.log(`  - Supported target types: ${targetTypes.join(", ")}`);

console.log("\n✅✅✅ All type validations passed! ✅✅✅\n");
