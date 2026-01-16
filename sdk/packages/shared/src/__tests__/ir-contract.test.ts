import { SongIR_v1, toJSON, fromJSON } from "../ir/song-ir";
import { SeededRNG } from "../utils/seeded-rng";
import { applySongDiff, validateSongDiff } from "../diff/song-diff";

describe("IR/Diff serialization & determinism", () => {
  it("SongIR round-trip preserves fields", () => {
    const model: SongIR_v1 = {
      version: "1.0",
      songId: "song-1",
      tempoMap: [],
      timeSignatureMap: [],
      sections: [
        {
          sectionId: "A",
          lengthBars: 8,
          tracks: [
            {
              trackId: "t1",
              role: "bass",
              pattern: { version: "1.0", baseRule: "simple", seed: "seed1" },
            },
          ],
        },
      ],
    } as any;
    const json = toJSON(model);
    const parsed = fromJSON(json);
    expect(parsed.version).toBe("1.0");
    expect(parsed.songId).toBe("song-1");
    expect(parsed.sections.length).toBe(1);
  });

  it("SeededRNG produces deterministic sequence", () => {
    const rng1 = new SeededRNG("abc");
    const rng2 = new SeededRNG("abc");
    const seq1 = [rng1.int(0, 10), rng1.int(0, 10), rng1.int(0, 10)];
    const seq2 = [rng2.int(0, 10), rng2.int(0, 10), rng2.int(0, 10)];
    expect(seq1).toEqual(seq2);
  });

  it("SongDiff validate/apply are deterministic and pure", () => {
    const model: SongIR_v1 = {
      version: "1.0",
      songId: "song-2",
      tempoMap: [],
      timeSignatureMap: [],
      sections: [
        {
          sectionId: "A",
          lengthBars: 4,
          tracks: [
            {
              trackId: "t1",
              role: "lead",
              pattern: { version: "1.0", baseRule: "melodic", seed: "s" },
            },
          ],
        },
      ],
    } as any;
    const diff = { type: "changeSeed", trackId: "t1", seed: "s2" } as const;
    const v = validateSongDiff(model, diff);
    expect(v.valid).toBe(true);
    const m1 = applySongDiff(model, diff);
    const m2 = applySongDiff(model, diff);
    expect(m1).toEqual(m2);
    expect(model.sections[0].tracks[0].pattern.seed).toBe("s");
    expect(m1.sections[0].tracks[0].pattern.seed).toBe("s2");
  });
});
