import { describe, expect, it } from "vitest";
import { bindTwig, type BindTrack, type BindUnderstanding } from "./bind";

const track = (over: Partial<BindTrack> & { slug: string }): BindTrack => ({
  family: "support",
  topic: "audio_topic_anxiety_relief",
  tags: [],
  active: true,
  ...over,
});

const u = (over: Partial<BindUnderstanding> = {}): BindUnderstanding => ({
  primaryEmotion: "anxiety",
  thematicTags: [],
  suggestedSpecialty: undefined,
  ...over,
});

const bind = (actionType: string, tracks: BindTrack[], over?: Partial<BindUnderstanding>) =>
  bindTwig(actionType, u(over), tracks);

describe("bindTwig", () => {
  it("breathing and xolacer bind without content", () => {
    expect(bind("breathing", [])).toEqual({ exercise: "sit-with-this" });
    expect(bind("xolacer", [])).toBeNull();
    expect(bind("xolacer", [], { suggestedSpecialty: "burnout" })).toEqual({ specialty: "burnout" });
  });

  it("read binds a free-text secondary to entries shelved under its emotion (#536)", () => {
    const entries = [{ slug: "on-grief", emotions: ["grief"], lifeAreas: [] }];
    expect(bindTwig("read", u({ primaryEmotion: "love", secondaryEmotion: "heartbreak" }), [], entries)).toEqual({ slug: "on-grief" });
    expect(bindTwig("read", u({ primaryEmotion: "love" }), [], entries)).toBeNull();
  });

  it("bridge binds without content", () => {
    expect(bind("bridge", [])).toEqual({ exercise: "trusted-bridge" });
  });

  it("binds audio_topic_* to the best tag match in its own family and topic", () => {
    const tracks = [
      track({ slug: "b", tags: ["anxiety", "racing-thoughts"] }),
      track({ slug: "a", tags: ["anxiety"] }),
      track({ slug: "music", family: "music", tags: ["anxiety", "racing-thoughts"] }),
      track({ slug: "grief", topic: "audio_topic_grief", tags: ["anxiety", "racing-thoughts"] }),
    ];
    expect(bind("audio_topic_anxiety_relief", tracks, { thematicTags: ["racing-thoughts"] })).toEqual({ slug: "b" });
  });

  it("breaks ties deterministically, independent of input order", () => {
    const a = track({ slug: "a", tags: ["anxiety"] });
    const b = track({ slug: "b", tags: ["anxiety"] });
    const forward = bind("audio_topic_anxiety_relief", [a, b]);
    const reversed = bind("audio_topic_anxiety_relief", [b, a]);
    expect(reversed).toEqual(forward);
  });

  it("spreads ties across sessions instead of collapsing onto one track", () => {
    const a = track({ slug: "a", tags: ["anxiety"] });
    const b = track({ slug: "b", tags: ["anxiety"] });
    const first = bind("audio_topic_anxiety_relief", [a, b], { primaryEmotion: "anxiety" });
    const second = bind("audio_topic_anxiety_relief", [a, b], { primaryEmotion: "sadness" });
    expect(first).not.toEqual(second);
    // Same session re-run (any input order) always binds the same slug.
    expect(bind("audio_topic_anxiety_relief", [b, a], { primaryEmotion: "anxiety" })).toEqual(first);
  });

  it("spreads ties the same regardless of thematicTags order or duplicates", () => {
    const a = track({ slug: "a", tags: ["anxiety"] });
    const b = track({ slug: "b", tags: ["anxiety"] });
    const base = bind("audio_topic_anxiety_relief", [a, b], { thematicTags: ["racing-thoughts", "sleep"] });
    const reordered = bind("audio_topic_anxiety_relief", [a, b], { thematicTags: ["sleep", "racing-thoughts"] });
    const duplicated = bind("audio_topic_anxiety_relief", [a, b], {
      thematicTags: ["racing-thoughts", "sleep", "sleep", "racing-thoughts"],
    });
    expect(reordered).toEqual(base);
    expect(duplicated).toEqual(base);
  });

  it("music_topic_* binds only against the music family", () => {
    const tracks = [
      track({ slug: "spoken", topic: "music_topic_sadness" }),
      track({ slug: "tune", family: "music", topic: "music_topic_sadness" }),
    ];
    expect(bind("music_topic_sadness", tracks)).toEqual({ slug: "tune" });
    expect(bind("music_topic_sadness", [tracks[0]])).toBeNull();
  });

  it("episode_reframe binds only to reframe-series rows, across topics", () => {
    const tracks = [
      track({ slug: "spectrum", series: "the-spectrum" }),
      track({ slug: "plain" }),
      track({ slug: "reframe", topic: "audio_topic_shame", series: "reality-not-false-hope" }),
    ];
    expect(bind("episode_reframe", tracks)).toEqual({ slug: "reframe" });
    expect(bind("episode_reframe", tracks.slice(0, 2))).toBeNull();
  });

  it("tier never gates: episodes of any tier and standalones compete on tags only", () => {
    const t4 = track({ slug: "t4", series: "the-spectrum", tags: ["anxiety", "racing-thoughts"] });
    const standalone = track({ slug: "standalone", tags: ["anxiety"] });
    expect(bind("audio_topic_anxiety_relief", [standalone, t4], { thematicTags: ["racing-thoughts"] })).toEqual({ slug: "t4" });
    const t4Tied = track({ slug: "t4", series: "the-spectrum", tags: ["anxiety"] });
    expect(bind("audio_topic_anxiety_relief", [t4Tied, standalone])).toEqual(
      bind("audio_topic_anxiety_relief", [standalone, t4Tied]),
    );
  });

  it("skips inactive rows and unknown action types", () => {
    expect(bind("audio_topic_anxiety_relief", [track({ slug: "off", active: false })])).toBeNull();
    expect(bind("not_a_key", [track({ slug: "x" })])).toBeNull();
  });

  it("lets a compounding domain's life areas outweigh tonight's own tags (#521)", () => {
    const racing = track({ slug: "racing", tags: ["anxiety", "racing-thoughts"] });
    const rest = track({ slug: "rest", tags: ["anxiety", "sleep", "health"] });
    const tags = { thematicTags: ["racing-thoughts"] };
    expect(bind("audio_topic_anxiety_relief", [racing, rest], tags)).toEqual({ slug: "racing" });
    expect(
      bind("audio_topic_anxiety_relief", [racing, rest], { ...tags, compoundingTags: ["health", "sleep"] }),
    ).toEqual({ slug: "rest" });
  });
});
