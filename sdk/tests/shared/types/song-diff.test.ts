/**
 * Unit Tests for SongDiff Type
 *
 * TDD Approach: Red -> Green -> Refactor
 * These tests ensure SongDiff provides atomic, immutable mutations to SongModel_v1.
 */

import { describe, it, expect } from "vitest";
import type {
  SongModel_v1,
  Role_v1,
  Section_v1,
  Projection_v1,
  MixGraph_v1,
} from "../../../packages/shared/src/types/song-model";
import {
  SongDiffApplier,
  type SongDiff,
  type DiffOperation,
  type AddRoleOperation,
  type RemoveRoleOperation,
  type UpdateRoleOperation,
  type AddSectionOperation,
  type RemoveSectionOperation,
  type UpdateSectionOperation,
  type AddProjectionOperation,
  type RemoveProjectionOperation,
  type UpdateMixGraphOperation,
  type UpdateParameterOperation,
  type DiffValidation,
} from "../../../packages/shared/src/types/song-diff";

describe("SongDiff Type Definition", () => {
  describe("SongDiff Structure", () => {
    it("should define a valid minimal SongDiff", () => {
      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: "song-model-1",
        operations: [],
      };

      expect(diff.version).toBe("1.0");
      expect(diff.diffId).toBeDefined();
      expect(diff.timestamp).toBeTypeOf("number");
      expect(diff.appliesTo).toBeDefined();
      expect(diff.operations).toBeDefined();
    });

    it("should accept optional metadata", () => {
      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-002",
        timestamp: Date.now(),
        appliesTo: "song-model-1",
        operations: [],
        metadata: {
          author: "test-user",
          description: "Test diff",
          context: {
            sessionId: "session-123",
          },
        },
      };

      expect(diff.metadata).toBeDefined();
      expect(diff.metadata?.author).toBe("test-user");
      expect(diff.metadata?.description).toBe("Test diff");
      expect(diff.metadata?.context).toBeDefined();
    });

    it("should accept multiple operations", () => {
      const operations: DiffOperation[] = [
        {
          type: "addRole",
          role: {
            id: "role-new",
            name: "New Role",
            type: "bass",
            generatorConfig: {
              generators: [2, 3],
              parameters: {},
            },
            parameters: {},
          },
        },
        {
          type: "updateRole",
          roleId: "role-existing",
          updates: {
            name: "Updated Name",
          },
        },
      ];

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-003",
        timestamp: Date.now(),
        appliesTo: "song-model-1",
        operations,
      };

      expect(diff.operations).toHaveLength(2);
    });
  });

  describe("DiffOperation Types", () => {
    describe("AddRoleOperation", () => {
      it("should define valid addRole operation", () => {
        const role: Role_v1 = {
          id: "role-bass",
          name: "Bass",
          type: "bass",
          generatorConfig: {
            generators: [2, 3],
            parameters: {},
          },
          parameters: {},
        };

        const operation: AddRoleOperation = {
          type: "addRole",
          role,
        };

        expect(operation.type).toBe("addRole");
        expect(operation.role).toBeDefined();
        expect(operation.role.id).toBe("role-bass");
      });

      it("should accept optional index for insertion", () => {
        const role: Role_v1 = {
          id: "role-melody",
          name: "Melody",
          type: "melody",
          generatorConfig: {
            generators: [3, 4],
            parameters: {},
          },
          parameters: {},
        };

        const operation: AddRoleOperation = {
          type: "addRole",
          role,
          index: 0, // Insert at beginning
        };

        expect(operation.index).toBe(0);
      });
    });

    describe("RemoveRoleOperation", () => {
      it("should define valid removeRole operation", () => {
        const operation: RemoveRoleOperation = {
          type: "removeRole",
          roleId: "role-bass",
        };

        expect(operation.type).toBe("removeRole");
        expect(operation.roleId).toBe("role-bass");
      });
    });

    describe("UpdateRoleOperation", () => {
      it("should define valid updateRole operation", () => {
        const operation: UpdateRoleOperation = {
          type: "updateRole",
          roleId: "role-bass",
          updates: {
            name: "Updated Bass",
            parameters: {
              volume: 0.9,
            },
          },
        };

        expect(operation.type).toBe("updateRole");
        expect(operation.roleId).toBe("role-bass");
        expect(operation.updates).toBeDefined();
        expect(operation.updates.name).toBe("Updated Bass");
      });
    });

    describe("AddSectionOperation", () => {
      it("should define valid addSection operation", () => {
        const section: Section_v1 = {
          id: "section-verse",
          name: "Verse",
          start: { seconds: 0, beats: 0, measures: 0 },
          end: { seconds: 32, beats: 128, measures: 32 },
          roles: ["role-bass"],
        };

        const operation: AddSectionOperation = {
          type: "addSection",
          section,
        };

        expect(operation.type).toBe("addSection");
        expect(operation.section).toBeDefined();
        expect(operation.section.id).toBe("section-verse");
      });

      it("should accept optional index for insertion", () => {
        const section: Section_v1 = {
          id: "section-chorus",
          name: "Chorus",
          start: { seconds: 32, beats: 128, measures: 32 },
          end: { seconds: 64, beats: 256, measures: 64 },
          roles: ["role-bass", "role-melody"],
        };

        const operation: AddSectionOperation = {
          type: "addSection",
          section,
          index: 1,
        };

        expect(operation.index).toBe(1);
      });
    });

    describe("RemoveSectionOperation", () => {
      it("should define valid removeSection operation", () => {
        const operation: RemoveSectionOperation = {
          type: "removeSection",
          sectionId: "section-verse",
        };

        expect(operation.type).toBe("removeSection");
        expect(operation.sectionId).toBe("section-verse");
      });
    });

    describe("UpdateSectionOperation", () => {
      it("should define valid updateSection operation", () => {
        const operation: UpdateSectionOperation = {
          type: "updateSection",
          sectionId: "section-verse",
          updates: {
            name: "Updated Verse",
            end: { seconds: 40, beats: 160, measures: 40 },
          },
        };

        expect(operation.type).toBe("updateSection");
        expect(operation.sectionId).toBe("section-verse");
        expect(operation.updates).toBeDefined();
      });
    });

    describe("AddProjectionOperation", () => {
      it("should define valid addProjection operation", () => {
        const projection: Projection_v1 = {
          id: "proj-bass-track",
          roleId: "role-bass",
          target: {
            type: "track",
            id: "track-1",
          },
        };

        const operation: AddProjectionOperation = {
          type: "addProjection",
          projection,
        };

        expect(operation.type).toBe("addProjection");
        expect(operation.projection).toBeDefined();
        expect(operation.projection.id).toBe("proj-bass-track");
      });
    });

    describe("RemoveProjectionOperation", () => {
      it("should define valid removeProjection operation", () => {
        const operation: RemoveProjectionOperation = {
          type: "removeProjection",
          projectionId: "proj-bass-track",
        };

        expect(operation.type).toBe("removeProjection");
        expect(operation.projectionId).toBe("proj-bass-track");
      });
    });

    describe("UpdateMixGraphOperation", () => {
      it("should define valid updateMixGraph operation", () => {
        const operation: UpdateMixGraphOperation = {
          type: "updateMixGraph",
          updates: {
            master: {
              volume: 0.9,
            },
          },
        };

        expect(operation.type).toBe("updateMixGraph");
        expect(operation.updates).toBeDefined();
        expect(operation.updates.master?.volume).toBe(0.9);
      });

      it("should accept track updates", () => {
        const operation: UpdateMixGraphOperation = {
          type: "updateMixGraph",
          updates: {
            tracks: [
              {
                id: "track-1",
                name: "Bass",
                volume: 0.8,
              },
            ],
          },
        };

        expect(operation.updates.tracks).toBeDefined();
        expect(operation.updates.tracks).toHaveLength(1);
      });

      it("should accept send updates", () => {
        const operation: UpdateMixGraphOperation = {
          type: "updateMixGraph",
          updates: {
            sends: [
              {
                fromTrack: "track-1",
                toBus: "bus-reverb",
                amount: 0.4,
              },
            ],
          },
        };

        expect(operation.updates.sends).toBeDefined();
        expect(operation.updates.sends).toHaveLength(1);
      });
    });

    describe("UpdateParameterOperation", () => {
      it("should define valid updateParameter operation", () => {
        const operation: UpdateParameterOperation = {
          type: "updateParameter",
          target: "/role/bass/volume",
          value: 0.85,
        };

        expect(operation.type).toBe("updateParameter");
        expect(operation.target).toBeDefined();
        expect(operation.target).toBe("/role/bass/volume");
        expect(operation.value).toBe(0.85);
      });

      it("should accept linear interpolation", () => {
        const operation: UpdateParameterOperation = {
          type: "updateParameter",
          target: "/track/1/volume",
          value: 0.7,
          interpolation: "linear",
          rampDuration: 0.5,
        };

        expect(operation.interpolation).toBe("linear");
        expect(operation.rampDuration).toBe(0.5);
      });

      it("should accept exponential interpolation", () => {
        const operation: UpdateParameterOperation = {
          type: "updateParameter",
          target: "/bus/reverb/mix",
          value: 0.6,
          interpolation: "exponential",
        };

        expect(operation.interpolation).toBe("exponential");
      });

      it("should accept step interpolation", () => {
        const operation: UpdateParameterOperation = {
          type: "updateParameter",
          target: "/instrument/synth/filter/cutoff",
          value: 1000,
          interpolation: "step",
        };

        expect(operation.interpolation).toBe("step");
      });
    });
  });
});

describe("SongDiffApplier", () => {
  // Helper to create a minimal SongModel_v1 for testing
  const createTestModel = (): SongModel_v1 => ({
    version: "1.0",
    id: "test-model-1",
    createdAt: Date.now(),
    metadata: {
      title: "Test Song",
    },
    transport: {
      tempoMap: [{ time: { seconds: 0 }, tempo: 120 }],
      timeSignatureMap: [
        { time: { seconds: 0 }, numerator: 4, denominator: 4 },
      ],
      loopPolicy: { enabled: false },
      playbackSpeed: 1.0,
    },
    sections: [],
    roles: [],
    projections: [],
    mixGraph: {
      tracks: [],
      buses: [],
      sends: [],
      master: { volume: 0.8 },
    },
    realizationPolicy: {
      windowSize: { seconds: 2.0 },
      lookaheadDuration: { seconds: 1.0 },
      determinismMode: "strict",
    },
    determinismSeed: "test-seed",
  });

  describe("apply()", () => {
    it("should throw error if diff applies to wrong model", () => {
      const model = createTestModel();
      model.id = "model-1";

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: "model-2", // Wrong model ID
        operations: [],
      };

      expect(() => {
        SongDiffApplier.apply(model, diff);
      }).toThrow("Diff applies to model-2 but model is model-1");
    });

    it("should apply empty diff and return unchanged model", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result).toEqual(model);
    });

    it("should not mutate original model (immutability)", () => {
      const model = createTestModel();
      const originalRoles = [...model.roles];

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "addRole",
            role: {
              id: "role-new",
              name: "New Role",
              type: "bass",
              generatorConfig: { generators: [2, 3], parameters: {} },
              parameters: {},
            },
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      // Original should be unchanged
      expect(model.roles).toEqual(originalRoles);
      expect(result.roles).not.toEqual(model.roles);
    });
  });

  describe("Role Operations", () => {
    it("should add role to model", () => {
      const model = createTestModel();

      const newRole: Role_v1 = {
        id: "role-bass",
        name: "Bass",
        type: "bass",
        generatorConfig: {
          generators: [2, 3],
          parameters: {},
        },
        parameters: {},
      };

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "addRole",
            role: newRole,
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.roles).toHaveLength(1);
      expect(result.roles[0]).toEqual(newRole);
    });

    it("should insert role at specific index", () => {
      const model = createTestModel();
      model.roles = [
        {
          id: "role-1",
          name: "Role 1",
          type: "melody",
          generatorConfig: { generators: [1, 2], parameters: {} },
          parameters: {},
        },
      ];

      const newRole: Role_v1 = {
        id: "role-2",
        name: "Role 2",
        type: "bass",
        generatorConfig: { generators: [2, 3], parameters: {} },
        parameters: {},
      };

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "addRole",
            role: newRole,
            index: 0, // Insert at beginning
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.roles).toHaveLength(2);
      expect(result.roles[0].id).toBe("role-2");
      expect(result.roles[1].id).toBe("role-1");
    });

    it("should remove role from model", () => {
      const model = createTestModel();
      model.roles = [
        {
          id: "role-bass",
          name: "Bass",
          type: "bass",
          generatorConfig: { generators: [2, 3], parameters: {} },
          parameters: {},
        },
        {
          id: "role-melody",
          name: "Melody",
          type: "melody",
          generatorConfig: { generators: [3, 4], parameters: {} },
          parameters: {},
        },
      ];

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "removeRole",
            roleId: "role-bass",
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].id).toBe("role-melody");
    });

    it("should throw error when removing non-existent role", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "removeRole",
            roleId: "non-existent",
          },
        ],
      };

      expect(() => {
        SongDiffApplier.apply(model, diff);
      }).toThrow("Role not found: non-existent");
    });

    it("should update role in model", () => {
      const model = createTestModel();
      model.roles = [
        {
          id: "role-bass",
          name: "Bass",
          type: "bass",
          generatorConfig: { generators: [2, 3], parameters: {} },
          parameters: {
            volume: 0.8,
          },
        },
      ];

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "updateRole",
            roleId: "role-bass",
            updates: {
              name: "Updated Bass",
              parameters: {
                volume: 0.9,
              },
            },
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.roles[0].name).toBe("Updated Bass");
      expect(result.roles[0].parameters?.volume).toBe(0.9);
      // Generator config should remain unchanged
      expect(result.roles[0].generatorConfig).toEqual({
        generators: [2, 3],
        parameters: {},
      });
    });

    it("should throw error when updating non-existent role", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "updateRole",
            roleId: "non-existent",
            updates: {
              name: "Updated",
            },
          },
        ],
      };

      expect(() => {
        SongDiffApplier.apply(model, diff);
      }).toThrow("Role not found: non-existent");
    });
  });

  describe("Section Operations", () => {
    it("should add section to model", () => {
      const model = createTestModel();

      const newSection: Section_v1 = {
        id: "section-verse",
        name: "Verse",
        start: { seconds: 0, beats: 0, measures: 0 },
        end: { seconds: 32, beats: 128, measures: 32 },
        roles: [],
      };

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "addSection",
            section: newSection,
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0]).toEqual(newSection);
    });

    it("should insert section at specific index", () => {
      const model = createTestModel();
      model.sections = [
        {
          id: "section-1",
          name: "Section 1",
          start: { seconds: 0 },
          end: { seconds: 32 },
          roles: [],
        },
      ];

      const newSection: Section_v1 = {
        id: "section-2",
        name: "Section 2",
        start: { seconds: 32 },
        end: { seconds: 64 },
        roles: [],
      };

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "addSection",
            section: newSection,
            index: 0,
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].id).toBe("section-2");
      expect(result.sections[1].id).toBe("section-1");
    });

    it("should remove section from model", () => {
      const model = createTestModel();
      model.sections = [
        {
          id: "section-verse",
          name: "Verse",
          start: { seconds: 0 },
          end: { seconds: 32 },
          roles: [],
        },
        {
          id: "section-chorus",
          name: "Chorus",
          start: { seconds: 32 },
          end: { seconds: 64 },
          roles: [],
        },
      ];

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "removeSection",
            sectionId: "section-verse",
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].id).toBe("section-chorus");
    });

    it("should throw error when removing non-existent section", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "removeSection",
            sectionId: "non-existent",
          },
        ],
      };

      expect(() => {
        SongDiffApplier.apply(model, diff);
      }).toThrow("Section not found: non-existent");
    });

    it("should update section in model", () => {
      const model = createTestModel();
      model.sections = [
        {
          id: "section-verse",
          name: "Verse",
          start: { seconds: 0 },
          end: { seconds: 32 },
          roles: ["role-bass"],
        },
      ];

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "updateSection",
            sectionId: "section-verse",
            updates: {
              name: "Updated Verse",
              end: { seconds: 40 },
            },
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.sections[0].name).toBe("Updated Verse");
      expect(result.sections[0].end).toEqual({ seconds: 40 });
      // Start time should remain unchanged
      expect(result.sections[0].start).toEqual({ seconds: 0 });
    });
  });

  describe("Projection Operations", () => {
    it("should add projection to model", () => {
      const model = createTestModel();

      const newProjection: Projection_v1 = {
        id: "proj-bass-track",
        roleId: "role-bass",
        target: {
          type: "track",
          id: "track-1",
        },
      };

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "addProjection",
            projection: newProjection,
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.projections).toHaveLength(1);
      expect(result.projections[0]).toEqual(newProjection);
    });

    it("should remove projection from model", () => {
      const model = createTestModel();
      model.projections = [
        {
          id: "proj-bass-track",
          roleId: "role-bass",
          target: {
            type: "track",
            id: "track-1",
          },
        },
        {
          id: "proj-melody-track",
          roleId: "role-melody",
          target: {
            type: "track",
            id: "track-2",
          },
        },
      ];

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "removeProjection",
            projectionId: "proj-bass-track",
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.projections).toHaveLength(1);
      expect(result.projections[0].id).toBe("proj-melody-track");
    });

    it("should throw error when removing non-existent projection", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "removeProjection",
            projectionId: "non-existent",
          },
        ],
      };

      expect(() => {
        SongDiffApplier.apply(model, diff);
      }).toThrow("Projection not found: non-existent");
    });
  });

  describe("Mix Graph Operations", () => {
    it("should update mix graph master volume", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "updateMixGraph",
            updates: {
              master: {
                volume: 0.9,
              },
            },
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.mixGraph.master.volume).toBe(0.9);
    });

    it("should update mix graph tracks", () => {
      const model = createTestModel();
      model.mixGraph.tracks = [
        {
          id: "track-1",
          name: "Track 1",
          volume: 0.8,
        },
      ];

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "updateMixGraph",
            updates: {
              tracks: [
                {
                  id: "track-1",
                  name: "Track 1",
                  volume: 0.9,
                },
              ],
            },
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.mixGraph.tracks).toHaveLength(1);
      expect(result.mixGraph.tracks[0].volume).toBe(0.9);
    });

    it("should update mix graph sends", () => {
      const model = createTestModel();
      model.mixGraph.sends = [
        {
          fromTrack: "track-1",
          toBus: "bus-reverb",
          amount: 0.3,
        },
      ];

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "updateMixGraph",
            updates: {
              sends: [
                {
                  fromTrack: "track-1",
                  toBus: "bus-reverb",
                  amount: 0.5,
                },
              ],
            },
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.mixGraph.sends).toHaveLength(1);
      expect(result.mixGraph.sends[0].amount).toBe(0.5);
    });

    it("should merge mix graph updates", () => {
      const model = createTestModel();
      model.mixGraph.master = { volume: 0.8 };
      model.mixGraph.tracks = [{ id: "track-1", name: "Track 1" }];

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "updateMixGraph",
            updates: {
              master: {
                volume: 0.9,
              },
            },
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.mixGraph.master.volume).toBe(0.9);
      // Tracks should remain unchanged
      expect(result.mixGraph.tracks).toEqual([
        { id: "track-1", name: "Track 1" },
      ]);
    });
  });

  describe("Parameter Operations", () => {
    it("should store parameter hints in metadata", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "updateParameter",
            target: "/role/bass/volume",
            value: 0.85,
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.custom?.["/role/bass/volume"]).toBeDefined();
      expect(result.metadata.custom?.["/role/bass/volume"]).toEqual({
        value: 0.85,
        interpolation: undefined,
        rampDuration: undefined,
        timestamp: expect.any(Number),
      });
    });

    it("should store parameter interpolation settings", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "updateParameter",
            target: "/track/1/volume",
            value: 0.7,
            interpolation: "linear",
            rampDuration: 0.5,
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.metadata.custom?.["/track/1/volume"]).toEqual({
        value: 0.7,
        interpolation: "linear",
        rampDuration: 0.5,
        timestamp: expect.any(Number),
      });
    });

    it("should preserve existing metadata when updating parameters", () => {
      const model = createTestModel();
      model.metadata = {
        title: "Test Song",
        custom: {
          customField: "custom-value",
        },
      };

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "updateParameter",
            target: "/role/bass/volume",
            value: 0.9,
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.metadata.title).toBe("Test Song");
      expect(result.metadata.custom?.customField).toBe("custom-value");
      expect(result.metadata.custom?.["/role/bass/volume"]).toBeDefined();
    });
  });

  describe("Multiple Operations", () => {
    it("should apply multiple operations in sequence", () => {
      const model = createTestModel();

      const role1: Role_v1 = {
        id: "role-bass",
        name: "Bass",
        type: "bass",
        generatorConfig: { generators: [2, 3], parameters: {} },
        parameters: {},
      };

      const role2: Role_v1 = {
        id: "role-melody",
        name: "Melody",
        type: "melody",
        generatorConfig: { generators: [3, 4], parameters: {} },
        parameters: {},
      };

      const section: Section_v1 = {
        id: "section-verse",
        name: "Verse",
        start: { seconds: 0 },
        end: { seconds: 32 },
        roles: [],
      };

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          { type: "addRole", role: role1 },
          { type: "addRole", role: role2 },
          { type: "addSection", section },
          {
            type: "updateRole",
            roleId: "role-bass",
            updates: { name: "Updated Bass" },
          },
        ],
      };

      const result = SongDiffApplier.apply(model, diff);

      expect(result.roles).toHaveLength(2);
      expect(result.sections).toHaveLength(1);
      expect(result.roles[0].name).toBe("Updated Bass");
    });
  });
});

describe("SongDiffApplier Validation", () => {
  const createTestModel = (): SongModel_v1 => ({
    version: "1.0",
    id: "test-model-1",
    createdAt: Date.now(),
    metadata: {
      title: "Test Song",
    },
    transport: {
      tempoMap: [{ time: { seconds: 0 }, tempo: 120 }],
      timeSignatureMap: [
        { time: { seconds: 0 }, numerator: 4, denominator: 4 },
      ],
      loopPolicy: { enabled: false },
      playbackSpeed: 1.0,
    },
    sections: [],
    roles: [],
    projections: [],
    mixGraph: {
      tracks: [],
      buses: [],
      sends: [],
      master: { volume: 0.8 },
    },
    realizationPolicy: {
      windowSize: { seconds: 2.0 },
      lookaheadDuration: { seconds: 1.0 },
      determinismMode: "strict",
    },
    determinismSeed: "test-seed",
  });

  describe("validate()", () => {
    it("should pass validation for valid diff", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "addRole",
            role: {
              id: "role-bass",
              name: "Bass",
              type: "bass",
              generatorConfig: { generators: [2, 3], parameters: {} },
              parameters: {},
            },
          },
        ],
      };

      const validation = SongDiffApplier.validate(model, diff);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should fail validation for wrong model ID", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: "wrong-model-id",
        operations: [],
      };

      const validation = SongDiffApplier.validate(model, diff);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain("wrong-model-id");
    });

    it("should fail validation for removing non-existent role", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "removeRole",
            roleId: "non-existent-role",
          },
        ],
      };

      const validation = SongDiffApplier.validate(model, diff);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        "Cannot remove non-existent role: non-existent-role",
      );
    });

    it("should fail validation for updating non-existent role", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "updateRole",
            roleId: "non-existent-role",
            updates: { name: "Updated" },
          },
        ],
      };

      const validation = SongDiffApplier.validate(model, diff);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        "Cannot update non-existent role: non-existent-role",
      );
    });

    it("should fail validation for removing non-existent section", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [
          {
            type: "removeSection",
            sectionId: "non-existent-section",
          },
        ],
      };

      const validation = SongDiffApplier.validate(model, diff);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        "Cannot remove non-existent section: non-existent-section",
      );
    });

    it("should aggregate multiple validation errors", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: "wrong-id",
        operations: [
          {
            type: "removeRole",
            roleId: "non-existent-role",
          },
          {
            type: "removeSection",
            sectionId: "non-existent-section",
          },
        ],
      };

      const validation = SongDiffApplier.validate(model, diff);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(3);
    });

    it("should return validation result structure", () => {
      const model = createTestModel();

      const diff: SongDiff = {
        version: "1.0",
        diffId: "diff-001",
        timestamp: Date.now(),
        appliesTo: model.id,
        operations: [],
      };

      const validation = SongDiffApplier.validate(model, diff);

      expect(validation).toHaveProperty("valid");
      expect(validation).toHaveProperty("errors");
      expect(validation).toHaveProperty("warnings");
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });
});

describe("SongDiff Serialization", () => {
  it("should serialize to JSON and deserialize back", () => {
    const diff: SongDiff = {
      version: "1.0",
      diffId: "diff-001",
      timestamp: Date.now(),
      appliesTo: "song-model-1",
      operations: [
        {
          type: "addRole",
          role: {
            id: "role-bass",
            name: "Bass",
            type: "bass",
            generatorConfig: { generators: [2, 3], parameters: {} },
            parameters: {},
          },
        },
        {
          type: "updateRole",
          roleId: "role-bass",
          updates: { name: "Updated Bass" },
        },
      ],
      metadata: {
        author: "test-user",
        description: "Test diff",
      },
    };

    const json = JSON.stringify(diff);
    const deserialized = JSON.parse(json) as SongDiff;

    expect(deserialized.version).toBe(diff.version);
    expect(deserialized.diffId).toBe(diff.diffId);
    expect(deserialized.appliesTo).toBe(diff.appliesTo);
    expect(deserialized.operations).toHaveLength(2);
    expect(deserialized.metadata?.author).toBe("test-user");
  });

  it("should maintain operation type integrity through serialization", () => {
    const diff: SongDiff = {
      version: "1.0",
      diffId: "diff-001",
      timestamp: Date.now(),
      appliesTo: "song-model-1",
      operations: [
        {
          type: "updateParameter",
          target: "/role/bass/volume",
          value: 0.85,
          interpolation: "linear",
          rampDuration: 0.5,
        },
      ],
    };

    const json = JSON.stringify(diff);
    const deserialized = JSON.parse(json) as SongDiff;

    expect(deserialized.operations[0].type).toBe("updateParameter");
    if (deserialized.operations[0].type === "updateParameter") {
      expect(deserialized.operations[0].interpolation).toBe("linear");
      expect(deserialized.operations[0].rampDuration).toBe(0.5);
    }
  });
});
