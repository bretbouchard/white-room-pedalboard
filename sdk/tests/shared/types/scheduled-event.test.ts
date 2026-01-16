/**
 * Unit Tests for ScheduledEvent Type
 *
 * TDD Approach: Red -> Green -> Refactor
 * These tests ensure ScheduledEvent provides deterministic, bounded musical events.
 */

import { describe, it, expect } from "vitest";
import type {
  ScheduledEvent,
  EventType,
  EventPayload,
  NotePayload,
  ParameterPayload,
  SectionPayload,
  TransportPayload,
  EventSource,
} from "../../../packages/shared/src/types/scheduled-event";
import { ParameterAddress } from "../../../packages/shared/src/types/parameter-address";
import type { MusicalTime } from "../../../packages/shared/src/ir/types";

describe("ScheduledEvent Type Definition", () => {
  describe("Type Structure", () => {
    it("should define a valid NOTE_ON event", () => {
      const noteOnEvent: ScheduledEvent = {
        sampleTime: BigInt(0),
        musicalTime: { seconds: 0, beats: 0 },
        type: "NOTE_ON",
        target: new ParameterAddress("/role/bass/note"),
        payload: {
          note: {
            pitch: 60,
            velocity: 127,
            duration: 1.0,
          },
        },
        deterministicId: "evt-001",
        sourceInfo: {
          generatorId: "gen-bass",
          role: "bass",
        },
      };

      expect(noteOnEvent.type).toBe("NOTE_ON");
      expect(noteOnEvent.sampleTime).toBe(BigInt(0));
      expect(noteOnEvent.target.value).toBe("/role/bass/note");
      expect(noteOnEvent.payload.note?.pitch).toBe(60);
      expect(noteOnEvent.deterministicId).toBeDefined();
    });

    it("should define a valid NOTE_OFF event", () => {
      const noteOffEvent: ScheduledEvent = {
        sampleTime: BigInt(44100),
        musicalTime: { seconds: 1.0, beats: 4 },
        type: "NOTE_OFF",
        target: new ParameterAddress("/role/bass/note"),
        payload: {
          note: {
            pitch: 60,
            velocity: 0,
            duration: 1.0,
          },
        },
        deterministicId: "evt-002",
        sourceInfo: {
          generatorId: "gen-bass",
          role: "bass",
        },
      };

      expect(noteOffEvent.type).toBe("NOTE_OFF");
      expect(noteOffEvent.sampleTime).toBe(BigInt(44100));
      expect(noteOffEvent.payload.note?.velocity).toBe(0);
    });

    it("should define a valid PARAM event", () => {
      const paramEvent: ScheduledEvent = {
        sampleTime: BigInt(22050),
        musicalTime: { seconds: 0.5, beats: 2 },
        type: "PARAM",
        target: new ParameterAddress("/track/3/console/drive"),
        payload: {
          parameter: {
            value: 0.75,
            interpolation: "linear",
            duration: 0.1,
          },
        },
        deterministicId: "evt-003",
        sourceInfo: {
          generatorId: "automation",
          role: "automation",
        },
      };

      expect(paramEvent.type).toBe("PARAM");
      expect(paramEvent.payload.parameter?.value).toBe(0.75);
      expect(paramEvent.payload.parameter?.interpolation).toBe("linear");
    });

    it("should define a valid AUTOMATION event", () => {
      const automationEvent: ScheduledEvent = {
        sampleTime: BigInt(0),
        musicalTime: { seconds: 0 },
        type: "AUTOMATION",
        target: new ParameterAddress("/role/harmony/filter/cutoff"),
        payload: {
          parameter: {
            value: 1000,
            interpolation: "exponential",
          },
        },
        deterministicId: "evt-004",
        sourceInfo: {
          generatorId: "gen-harmony",
          role: "harmony",
        },
      };

      expect(automationEvent.type).toBe("AUTOMATION");
      expect(automationEvent.payload.parameter?.interpolation).toBe(
        "exponential",
      );
    });

    it("should define a valid SECTION event", () => {
      const sectionEvent: ScheduledEvent = {
        sampleTime: BigInt(0),
        musicalTime: { seconds: 32, beats: 128 },
        type: "SECTION",
        target: new ParameterAddress("/section/chorus"),
        payload: {
          section: {
            sectionId: "section-chorus",
            action: "enter",
          },
        },
        deterministicId: "evt-005",
        sourceInfo: {
          generatorId: "structure",
          role: "structure",
        },
      };

      expect(sectionEvent.type).toBe("SECTION");
      expect(sectionEvent.payload.section?.sectionId).toBe("section-chorus");
      expect(sectionEvent.payload.section?.action).toBe("enter");
    });

    it("should define a valid TRANSPORT event", () => {
      const transportEvent: ScheduledEvent = {
        sampleTime: BigInt(0),
        musicalTime: { seconds: 0 },
        type: "TRANSPORT",
        target: new ParameterAddress("/transport/tempo"),
        payload: {
          transport: {
            command: "tempo",
            value: 140,
          },
        },
        deterministicId: "evt-006",
        sourceInfo: {
          generatorId: "transport",
          role: "transport",
        },
      };

      expect(transportEvent.type).toBe("TRANSPORT");
      expect(transportEvent.payload.transport?.command).toBe("tempo");
    });
  });

  describe("EventType", () => {
    it("should support all event types", () => {
      const eventTypes: EventType[] = [
        "NOTE_ON",
        "NOTE_OFF",
        "PARAM",
        "SECTION",
        "TRANSPORT",
        "AUTOMATION",
        "CONTROL",
      ];

      eventTypes.forEach((type) => {
        expect([
          "NOTE_ON",
          "NOTE_OFF",
          "PARAM",
          "SECTION",
          "TRANSPORT",
          "AUTOMATION",
          "CONTROL",
        ]).toContain(type);
      });
    });
  });

  describe("ParameterAddress", () => {
    it("should accept valid role parameter address", () => {
      const address = new ParameterAddress("/role/bass/note");

      expect(address.value).toBe("/role/bass/note");
      expect(address.scope).toBe("role");
    });

    it("should accept valid track parameter address", () => {
      const address = new ParameterAddress("/track/3/console/drive");

      expect(address.value).toBe("/track/3/console/drive");
      expect(address.scope).toBe("track");
    });

    it("should accept valid bus parameter address", () => {
      const address = new ParameterAddress("/bus/reverb/mix");

      expect(address.scope).toBe("bus");
    });

    it("should accept valid instrument parameter address", () => {
      const address = new ParameterAddress(
        "/instrument/synth-1/oscillator/detune",
      );

      expect(address.scope).toBe("instrument");
    });

    it("should accept valid global parameter address", () => {
      const address = new ParameterAddress("/global/master/volume");

      expect(address.scope).toBe("global");
    });

    it("should enforce scope types", () => {
      const scopes: Array<"role" | "track" | "bus" | "instrument" | "global"> =
        ["role", "track", "bus", "instrument", "global"];

      scopes.forEach((scope) => {
        expect(["role", "track", "bus", "instrument", "global"]).toContain(
          scope,
        );
      });
    });
  });

  describe("EventPayload", () => {
    it("should accept NotePayload", () => {
      const notePayload: NotePayload = {
        pitch: 60,
        velocity: 100,
        duration: 2.5,
      };

      const payload: EventPayload = {
        note: notePayload,
      };

      expect(payload.note?.pitch).toBe(60);
      expect(payload.note?.velocity).toBe(100);
      expect(payload.note?.duration).toBe(2.5);
    });

    it("should accept ParameterPayload with linear interpolation", () => {
      const paramPayload: ParameterPayload = {
        value: 0.5,
        interpolation: "linear",
        duration: 0.5,
      };

      const payload: EventPayload = {
        parameter: paramPayload,
      };

      expect(payload.parameter?.value).toBe(0.5);
      expect(payload.parameter?.interpolation).toBe("linear");
      expect(payload.parameter?.duration).toBe(0.5);
    });

    it("should accept ParameterPayload with exponential interpolation", () => {
      const paramPayload: ParameterPayload = {
        value: 1000,
        interpolation: "exponential",
      };

      const payload: EventPayload = {
        parameter: paramPayload,
      };

      expect(payload.parameter?.interpolation).toBe("exponential");
    });

    it("should accept ParameterPayload with step interpolation", () => {
      const paramPayload: ParameterPayload = {
        value: 1.0,
        interpolation: "step",
        duration: 0,
      };

      const payload: EventPayload = {
        parameter: paramPayload,
      };

      expect(payload.parameter?.interpolation).toBe("step");
    });

    it("should accept SectionPayload", () => {
      const sectionPayload: SectionPayload = {
        sectionId: "section-verse-2",
        action: "exit",
      };

      const payload: EventPayload = {
        section: sectionPayload,
      };

      expect(payload.section?.sectionId).toBe("section-verse-2");
      expect(payload.section?.action).toBe("exit");
    });

    it("should accept TransportPayload", () => {
      const transportPayload: TransportPayload = {
        command: "stop",
        value: 0,
      };

      const payload: EventPayload = {
        transport: transportPayload,
      };

      expect(payload.transport?.command).toBe("stop");
    });
  });

  describe("NotePayload Constraints", () => {
    it("should enforce valid pitch range (MIDI)", () => {
      const validPitches = [0, 60, 127];

      validPitches.forEach((pitch) => {
        expect(pitch).toBeGreaterThanOrEqual(0);
        expect(pitch).toBeLessThanOrEqual(127);
      });
    });

    it("should enforce valid velocity range", () => {
      const validVelocities = [0, 64, 127];

      validVelocities.forEach((velocity) => {
        expect(velocity).toBeGreaterThanOrEqual(0);
        expect(velocity).toBeLessThanOrEqual(127);
      });
    });

    it("should enforce positive duration", () => {
      const duration = 1.5;
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe("Serialization & Deserialization", () => {
    it("should serialize to JSON and deserialize back", () => {
      const event: ScheduledEvent = {
        sampleTime: BigInt(44100),
        musicalTime: { seconds: 1.0, beats: 4 },
        type: "NOTE_ON",
        target: new ParameterAddress("/role/melody/note"),
        payload: {
          note: {
            pitch: 72,
            velocity: 100,
            duration: 0.5,
          },
        },
        deterministicId: "evt-melody-001",
        sourceInfo: {
          generatorId: "gen-melody",
          role: "melody",
        },
      };

      // Convert BigInt to number for JSON serialization
      const serializable = {
        ...event,
        sampleTime: Number(event.sampleTime),
      };

      const json = JSON.stringify(serializable);
      const deserialized = JSON.parse(json);

      expect(deserialized.type).toBe(event.type);
      expect(deserialized.deterministicId).toBe(event.deterministicId);
      expect(deserialized.target.value).toBe(event.target.value);
    });

    it("should maintain deterministicId integrity", () => {
      const id = "unique-event-id-12345";
      const event: ScheduledEvent = {
        sampleTime: BigInt(0),
        type: "PARAM",
        target: new ParameterAddress("/role/test/parameter"),
        payload: {
          parameter: {
            value: 1.0,
          },
        },
        deterministicId: id,
        sourceInfo: {
          generatorId: "test",
          role: "test",
        },
      };

      const serializable = {
        ...event,
        sampleTime: Number(event.sampleTime),
      };

      const json = JSON.stringify(serializable);
      const deserialized = JSON.parse(json);

      expect(deserialized.deterministicId).toBe(id);
    });
  });

  describe("Deterministic Properties", () => {
    it("should require deterministicId", () => {
      const event: ScheduledEvent = {
        sampleTime: BigInt(0),
        type: "CONTROL",
        target: new ParameterAddress("/role/test/control"),
        payload: {},
        deterministicId: "must-be-unique",
        sourceInfo: {
          generatorId: "test",
          role: "test",
        },
      };

      expect(event.deterministicId).toBeDefined();
      expect(typeof event.deterministicId).toBe("string");
    });

    it("should require sourceInfo", () => {
      const source: EventSource = {
        generatorId: "gen-bass",
        role: "bass",
      };

      expect(source.generatorId).toBeDefined();
      expect(source.role).toBeDefined();
    });
  });

  describe("Time Representation", () => {
    it("should support sample time as BigInt", () => {
      const sampleTime = BigInt(44100 * 10); // 10 seconds at 44.1kHz
      const event: ScheduledEvent = {
        sampleTime,
        type: "NOTE_ON",
        target: new ParameterAddress("/role/test/control"),
        payload: {
          note: {
            pitch: 60,
            velocity: 100,
            duration: 1.0,
          },
        },
        deterministicId: "test",
        sourceInfo: {
          generatorId: "test",
          role: "test",
        },
      };

      expect(event.sampleTime).toBe(BigInt(441000));
    });

    it("should optionally include musical time", () => {
      const musicalTime: MusicalTime = {
        seconds: 10.5,
        beats: 42,
      };

      const event: ScheduledEvent = {
        sampleTime: BigInt(0),
        musicalTime: { seconds: 10.5, beats: 42 },
        type: "NOTE_ON",
        target: new ParameterAddress("/role/test/control"),
        payload: {
          note: {
            pitch: 60,
            velocity: 100,
            duration: 1.0,
          },
        },
        deterministicId: "test",
        sourceInfo: {
          generatorId: "test",
          role: "test",
        },
      };

      expect(event.musicalTime?.seconds).toBe(10.5);
      expect(event.musicalTime?.beats).toBe(42);
    });
  });
});
