import { describe, expect, it } from "vitest";
import {
  conversationOrigin,
  isInSuggestionCooldown,
  meetsRatingFloor,
  MIN_RATINGS_TO_JUDGE,
  MIN_SUGGESTION_INTENSITY,
  rankSuggestionCandidates,
  retainedSuggestion,
  suggestedSpecialty,
  SUGGESTION_COOLDOWN_MS,
  type SuggestionInput,
} from "./xolacerSuggestion";

const base: SuggestionInput = {
  thematicTags: [],
  primaryEmotion: "sadness",
  intensity: 7,
  safeguardLevel: "none",
  entryType: "open_prompt",
};

describe("suggestedSpecialty — emotion fallback", () => {
  it("maps emotion anxiety to anxiety when no theme mapped", () => {
    expect(
      suggestedSpecialty({
        ...base,
        primaryEmotion: "anxiety",
        thematicTags: ["health"],
      }),
    ).toBe("anxiety");
  });

  it("maps granular label loneliness to loneliness", () => {
    expect(
      suggestedSpecialty({
        ...base,
        granularLabel: "loneliness",
        thematicTags: ["health"],
      }),
    ).toBe("loneliness");
  });

  it("lets theme win over a matching emotion", () => {
    expect(
      suggestedSpecialty({
        ...base,
        thematicTags: ["family"],
        primaryEmotion: "anxiety",
      }),
    ).toBe("family");
  });

  it("returns null for an unmapped emotion and no mapped theme", () => {
    expect(suggestedSpecialty({ ...base, thematicTags: ["health"] })).toBeNull();
  });

  // The taxonomies are keyed on model output, so a tag naming an Object
  // prototype member must miss. On a plain-object lookup these resolve to a
  // truthy inherited function that would be returned as a Specialty.
  it.each(["constructor", "toString", "valueOf", "hasOwnProperty"])(
    "returns null for the prototype key %s",
    (key) => {
      expect(suggestedSpecialty({ ...base, thematicTags: [key] })).toBeNull();
      expect(
        suggestedSpecialty({ ...base, thematicTags: [], primaryEmotion: key }),
      ).toBeNull();
      expect(
        suggestedSpecialty({
          ...base,
          thematicTags: [],
          primaryEmotion: "boredom",
          granularLabel: key,
        }),
      ).toBeNull();
    },
  );
});

// Every lookup lowercases first. The classifier is instructed to emit these
// taxonomies in lowercase, but it is a model, and a capitalised tag silently
// mapping to nothing would read as "the suggestion just doesn't fire much"
// rather than as a bug.
describe("suggestedSpecialty — case normalization", () => {
  it("matches a capitalised theme", () => {
    expect(suggestedSpecialty({ ...base, thematicTags: ["Work"] })).toBe(
      "burnout",
    );
  });

  it("matches a capitalised emotion in the fallback", () => {
    expect(
      suggestedSpecialty({
        ...base,
        thematicTags: ["health"],
        primaryEmotion: "Anxiety",
      }),
    ).toBe("anxiety");
  });

  it("matches a capitalised granular label in the fallback", () => {
    expect(
      suggestedSpecialty({
        ...base,
        thematicTags: ["health"],
        primaryEmotion: "sadness",
        granularLabel: "Loneliness",
      }),
    ).toBe("loneliness");
  });

  it("suppresses a capitalised trauma tag", () => {
    expect(
      suggestedSpecialty({ ...base, thematicTags: ["family", "Trauma"] }),
    ).toBeNull();
  });
});

describe("suggestedSpecialty — suppression and gates", () => {
  it("suppresses trauma even when another theme would match", () => {
    expect(
      suggestedSpecialty({ ...base, thematicTags: ["family", "trauma"] }),
    ).toBeNull();
  });

  it("suppresses trauma over a matching emotion fallback", () => {
    expect(
      suggestedSpecialty({
        ...base,
        thematicTags: ["trauma"],
        primaryEmotion: "anxiety",
      }),
    ).toBeNull();
  });

  it("passes safeguard gentle", () => {
    expect(
      suggestedSpecialty({
        ...base,
        thematicTags: ["work"],
        safeguardLevel: "gentle",
      }),
    ).toBe("burnout");
  });

  it("excludes safeguard elevated", () => {
    expect(
      suggestedSpecialty({
        ...base,
        thematicTags: ["work"],
        safeguardLevel: "elevated",
      }),
    ).toBeNull();
  });

  it("excludes safeguard crisis", () => {
    expect(
      suggestedSpecialty({
        ...base,
        thematicTags: ["work"],
        safeguardLevel: "crisis",
      }),
    ).toBeNull();
  });

  it("passes at the intensity floor", () => {
    expect(
      suggestedSpecialty({
        ...base,
        thematicTags: ["work"],
        intensity: MIN_SUGGESTION_INTENSITY,
      }),
    ).toBe("burnout");
  });

  it("excludes one below the intensity floor", () => {
    expect(
      suggestedSpecialty({
        ...base,
        thematicTags: ["work"],
        intensity: MIN_SUGGESTION_INTENSITY - 1,
      }),
    ).toBeNull();
  });

  for (const entryType of ["word_cloud", "body_scan"]) {
    it(`returns null for ${entryType}, a tap rather than a sentence`, () => {
      expect(
        suggestedSpecialty({
          ...base,
          entryType,
          primaryEmotion: "anxiety",
        }),
      ).toBeNull();
    });

    // The case the empty-tags proxy missed: the classifier prompt says an
    // empty array is "fine" for these modes, not required, so a tapped
    // session that did get tagged used to fall straight through to a theme
    // match — routing someone off two tapped words.
    it(`returns null for ${entryType} even when a theme did get tagged`, () => {
      expect(
        suggestedSpecialty({
          ...base,
          entryType,
          thematicTags: ["work"],
        }),
      ).toBeNull();
    });
  }

  // The other direction: a typed session keeps the emotion fallback the map
  // deliberately includes, even when the classifier tagged no life domain.
  it("still suggests for a typed session with no thematic tags", () => {
    expect(
      suggestedSpecialty({
        ...base,
        thematicTags: [],
        primaryEmotion: "anxiety",
      }),
    ).toBe("anxiety");
  });

  it("does not suppress voice, which is an utterance not a tap", () => {
    expect(
      suggestedSpecialty({
        ...base,
        entryType: "voice",
        thematicTags: ["work"],
      }),
    ).toBe("burnout");
  });
});

describe("meetsRatingFloor", () => {
  it("passes an unrated xolacer", () => {
    expect(meetsRatingFloor({})).toBe(true);
  });

  it("passes a badly rated xolacer below the judgement threshold", () => {
    expect(
      meetsRatingFloor({ ratingCount: MIN_RATINGS_TO_JUDGE - 1, ratingSum: 4 }),
    ).toBe(true);
  });

  it("excludes an average below 3.0 at the threshold", () => {
    expect(
      meetsRatingFloor({ ratingCount: MIN_RATINGS_TO_JUDGE, ratingSum: 14 }),
    ).toBe(false);
  });

  it("passes an average of exactly 3.0", () => {
    expect(
      meetsRatingFloor({ ratingCount: MIN_RATINGS_TO_JUDGE, ratingSum: 15 }),
    ).toBe(true);
  });

  // Both counters are optional on the profile and are maintained separately by
  // rateConversation, so a row can carry a count with no sum. That reads as an
  // average of 0 and must exclude — the app is vouching for this person.
  it("excludes a rated xolacer whose sum is missing", () => {
    expect(meetsRatingFloor({ ratingCount: MIN_RATINGS_TO_JUDGE })).toBe(false);
  });
});

describe("rankSuggestionCandidates", () => {
  const load = (
    xolacerProfileId: string,
    openCount: number,
    present = false,
  ) => ({
    xolacerProfileId,
    openCount,
    present,
  });

  it("orders by fewest open conversations when presence ties", () => {
    const ranked = rankSuggestionCandidates(
      [load("a", 3), load("b", 0), load("c", 1)],
      "session1",
    );
    expect(ranked.map((c) => c.xolacerProfileId)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input", () => {
    const input = [load("a", 3), load("b", 0)];
    rankSuggestionCandidates(input, "session1");
    expect(input.map((c) => c.xolacerProfileId)).toEqual(["a", "b"]);
  });

  it("is stable across repeated reads of one session", () => {
    const candidates = ["a", "b", "c", "d"].map((id) => load(id, 0));
    const first = rankSuggestionCandidates(candidates, "session1");
    const second = rankSuggestionCandidates([...candidates].reverse(), "session1");
    expect(second.map((c) => c.xolacerProfileId)).toEqual(
      first.map((c) => c.xolacerProfileId),
    );
  });

  it("spreads the winner across sessions when everyone is idle", () => {
    const candidates = ["a", "b", "c", "d", "e"].map((id) => load(id, 0));
    const winners = new Set(
      Array.from(
        { length: 40 },
        (_, i) => rankSuggestionCandidates(candidates, `session${i}`)[0].xolacerProfileId,
      ),
    );
    // Not "uniform" — just proof it isn't the id sort handing every first
    // suggestion to whoever sorts lowest.
    expect(winners.size).toBeGreaterThan(1);
  });

  it("never lets the tie-break outrank load, when presence ties", () => {
    const ranked = rankSuggestionCandidates(
      [load("a", 0), load("b", 1)],
      "session-that-favours-b",
    );
    expect(ranked[0].xolacerProfileId).toBe("a");
  });

  // Presence is the sort's first key: a present candidate outranks an absent
  // one even carrying more open conversations — reaching someone now is the
  // point of the feature, and MAX_OPEN_CONVERSATIONS is what still caps them.
  it("ranks a present candidate with more open conversations above an idle absent one", () => {
    const ranked = rankSuggestionCandidates(
      [load("absent", 0, false), load("present", 3, true)],
      "session1",
    );
    expect(ranked.map((c) => c.xolacerProfileId)).toEqual(["present", "absent"]);
  });

  it("falls back to open count among present candidates", () => {
    const ranked = rankSuggestionCandidates(
      [load("a", 3, true), load("b", 0, true), load("c", 1, true)],
      "session1",
    );
    expect(ranked.map((c) => c.xolacerProfileId)).toEqual(["b", "c", "a"]);
  });

  it("keeps the hash tie-break stable for a repeated session id, with presence mixed", () => {
    const candidates = [
      load("a", 0, true),
      load("b", 0, false),
      load("c", 0, true),
      load("d", 0, false),
    ];
    const first = rankSuggestionCandidates(candidates, "session-mixed");
    const second = rankSuggestionCandidates(
      [...candidates].reverse(),
      "session-mixed",
    );
    expect(second.map((c) => c.xolacerProfileId)).toEqual(
      first.map((c) => c.xolacerProfileId),
    );
  });
});

describe("isInSuggestionCooldown", () => {
  const now = 1_000_000_000_000;

  it("is open when no recent row carried a suggestion", () => {
    expect(
      isInSuggestionCooldown([{ createdAt: now - 1000 }], now),
    ).toBe(false);
  });

  it("is closed just inside the window", () => {
    const row = {
      createdAt: now - SUGGESTION_COOLDOWN_MS + 1,
      suggestedSpecialty: "burnout",
    };
    expect(isInSuggestionCooldown([row], now)).toBe(true);
  });

  it("is open exactly at the window edge", () => {
    const row = {
      createdAt: now - SUGGESTION_COOLDOWN_MS,
      suggestedSpecialty: "burnout",
    };
    expect(isInSuggestionCooldown([row], now)).toBe(false);
  });

  // The real shape of the argument: a week of sessions, most carrying no
  // suggestion, the one that does sitting somewhere in the middle. Every other
  // case here passes a single row, which never exercises the walk.
  it("finds a suggestion that is not the first row", () => {
    const history = [
      { createdAt: now - 6000 },
      { createdAt: now - 5000 },
      { createdAt: now - 4000, suggestedSpecialty: "family" },
      { createdAt: now - 3000 },
    ];
    expect(isInSuggestionCooldown(history, now)).toBe(true);
  });

  it("is open when every suggestion in the history has aged out", () => {
    const history = [
      {
        createdAt: now - SUGGESTION_COOLDOWN_MS - 1,
        suggestedSpecialty: "grief",
      },
      { createdAt: now - 2000 },
      { createdAt: now - 1000 },
    ];
    expect(isInSuggestionCooldown(history, now)).toBe(false);
  });

  // Mixed ages with a live one present — the aged-out row must not mask it.
  it("is closed when an aged-out suggestion precedes a live one", () => {
    const history = [
      {
        createdAt: now - SUGGESTION_COOLDOWN_MS - 1,
        suggestedSpecialty: "grief",
      },
      { createdAt: now - 1000, suggestedSpecialty: "anxiety" },
    ];
    expect(isInSuggestionCooldown(history, now)).toBe(true);
  });
});

describe("conversationOrigin", () => {
  it("stamps a suggestion when a recent specialty overlaps what they declare", () => {
    expect(conversationOrigin(["burnout"], ["burnout", "anxiety"])).toBe(
      "suggestion",
    );
  });

  it("stamps direct with no overlap", () => {
    expect(conversationOrigin(["burnout"], ["grief", "family"])).toBe("direct");
  });

  it("stamps direct when the xolacer declares nothing", () => {
    expect(conversationOrigin(["burnout"], undefined)).toBe("direct");
    expect(conversationOrigin(["burnout"], [])).toBe("direct");
  });

  it("matches on any of several recent specialties", () => {
    expect(conversationOrigin(["grief", "burnout"], ["burnout"])).toBe(
      "suggestion",
    );
  });
});

describe("retainedSuggestion", () => {
  it("keeps the stored suggestion when this pass declines", () => {
    expect(retainedSuggestion(undefined, "burnout", "none")).toBe("burnout");
  });

  it("takes a newly resolved suggestion over the stored one", () => {
    expect(retainedSuggestion("grief", "burnout", "none")).toBe("grief");
  });

  it("stays undefined when nothing was ever suggested", () => {
    expect(retainedSuggestion(undefined, undefined, "none")).toBeUndefined();
  });

  // The stored field is the cooldown record, so this is the case that used to
  // reopen the 7-day window: a re-classify whose resolve declined because the
  // user had, in the meantime, acted on the suggestion.
  it("survives a gentle re-classify", () => {
    expect(retainedSuggestion(undefined, "family", "gentle")).toBe("family");
  });

  for (const level of ["crisis", "elevated"] as const) {
    it(`clears a stale suggestion on ${level}`, () => {
      expect(retainedSuggestion(undefined, "burnout", level)).toBeUndefined();
    });
  }

  it("treats a missing safeguard level as safe", () => {
    expect(retainedSuggestion(undefined, "burnout", undefined)).toBe("burnout");
  });
});
