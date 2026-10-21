// @vitest-environment edge-runtime
/**
 * The xolacer suggestion on meaning (#570, ADR 0021), end to end through the
 * read-time action. Eligibility stays the old query's rules; only the order
 * among the eligible moves. The index is faked at the rag module: the search
 * answers from `stub.hits`, keyed on the xolacer's emotional profile id.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockEmbeddingModelV3 } from "ai/test";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { seedMetadata, seedSession } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock, ragMock } from "./mocks.helpers";

const RAW_TEXT = "Work has eaten every evening this month";

const stub = vi.hoisted(() => ({
  hits: {} as Record<string, number>,
  embedFails: false,
  added: [] as { key: string; text: string }[],
  deleted: [] as string[],
}));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../presence", async (orig) => ({
  ...(await orig<typeof import("../presence")>()),
  presentProfileIds: async () => new Set(),
}));
vi.mock("../rag", () => {
  const base = ragMock();
  return {
    ...base,
    rag: {
      ...base.rag,
      options: {
        ...base.rag.options,
        textEmbeddingModel: new MockEmbeddingModelV3({
          doEmbed: async ({ values }) => {
            if (stub.embedFails) throw new Error("embeddings down");
            return { embeddings: values.map(() => [0]), warnings: [] };
          },
        }),
      },
      search: async (_ctx: unknown, args: { namespace: string }) => {
        if (args.namespace !== "xolacer") return { entries: [], results: [] };
        const keys = Object.keys(stub.hits);
        return {
          entries: keys.map((key) => ({ entryId: `e_${key}`, key, text: "" })),
          results: keys.map((key) => ({ entryId: `e_${key}`, score: stub.hits[key] })),
        };
      },
      add: async (_ctx: unknown, args: { namespace: string; key: string; text: string }) => {
        if (args.namespace === "xolacer") stub.added.push({ key: args.key, text: args.text });
      },
      deleteByKey: async (_ctx: unknown, args: { key: string }) => {
        stub.deleted.push(args.key);
      },
    },
  };
});

beforeEach(() => {
  process.env.XOLACER_CHAT_ENABLED = "true";
  stub.hits = {};
  stub.embedFails = false;
  stub.added = [];
  stub.deleted = [];
});

let nextUser = 2;
async function seedXolacer(
  seeker: SeededUser,
  fields: Partial<Doc<"xolacer_profiles">> = {},
): Promise<Id<"emotional_profiles">> {
  const { profileId } = await asNewUser(nextUser++, seeker.root);
  await seeker.root.run((ctx) =>
    ctx.db.insert("xolacer_profiles", {
      emotionalProfileId: profileId,
      displayName: `X${profileId.slice(-4)}`,
      bio: "I've sat where you are.",
      photoUrl: "https://example.com/p.png",
      specialties: ["burnout"],
      complete: true,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...fields,
    }),
  );
  return profileId;
}

async function seekerSession(metadata: Partial<Doc<"emotional_metadata">> = { suggestedSpecialty: "burnout" }) {
  const seeker = await asNewUser(1);
  const sessionId = await seedSession(seeker.root, seeker.profileId, { state: "completed", rawInput: RAW_TEXT });
  await seedMetadata(seeker.root, sessionId, seeker.profileId, metadata);
  return { seeker, sessionId };
}

const suggest = (seeker: SeededUser, sessionId: Id<"sessions">) =>
  seeker.t.action(api.ai.xolacers.suggest.sessionSuggestion, { sessionId });

/** Who the old ranker alone would pick — the fallback's expected answer. */
async function oldPick(seeker: SeededUser, sessionId: Id<"sessions">) {
  return (await seeker.t.query(api.xolacerChat.sessionSuggestion, { sessionId }))?.xolacerProfileId;
}

describe("xolacer suggestion on meaning", () => {
  it("suggests the closest in meaning among those who declare the specialty", async () => {
    const { seeker, sessionId } = await seekerSession();
    const a = await seedXolacer(seeker);
    const b = await seedXolacer(seeker);
    const ranked = await oldPick(seeker, sessionId);
    const other = ranked === a ? b : a;
    stub.hits = { [ranked!]: 0.31, [other]: 0.62 };

    expect(await suggest(seeker, sessionId)).toMatchObject({ xolacerProfileId: other, specialty: "burnout" });
  });

  it("below the floor, the old ranker alone", async () => {
    const { seeker, sessionId } = await seekerSession();
    const a = await seedXolacer(seeker);
    const b = await seedXolacer(seeker);
    const ranked = await oldPick(seeker, sessionId);
    stub.hits = { [ranked === a ? b : a]: 0.29 };

    expect((await suggest(seeker, sessionId))?.xolacerProfileId).toBe(ranked);
  });

  it("a failed embed falls back to the old ranker", async () => {
    const { seeker, sessionId } = await seekerSession();
    const a = await seedXolacer(seeker);
    const b = await seedXolacer(seeker);
    const ranked = await oldPick(seeker, sessionId);
    stub.hits = { [ranked === a ? b : a]: 0.9 };
    stub.embedFails = true;

    expect((await suggest(seeker, sessionId))?.xolacerProfileId).toBe(ranked);
  });

  it("no specialty, no suggestion", async () => {
    const { seeker, sessionId } = await seekerSession({ suggestedSpecialty: undefined });
    const a = await seedXolacer(seeker);
    stub.hits = { [a]: 0.9 };

    expect(await suggest(seeker, sessionId)).toBeNull();
  });

  it("meaning never lets an ineligible xolacer through", async () => {
    const { seeker, sessionId } = await seekerSession();
    const paused = await seedXolacer(seeker, { active: false });
    const otherSpecialty = await seedXolacer(seeker, { specialties: ["grief"] });
    const lowRated = await seedXolacer(seeker, { ratingCount: 5, ratingSum: 10 });
    const alreadyAsked = await seedXolacer(seeker);
    await seeker.root.run((ctx) =>
      ctx.db.insert("xolacer_conversations", {
        userProfileId: seeker.profileId,
        xolacerProfileId: alreadyAsked,
        status: "closed",
        requestedAt: Date.now(),
      }),
    );
    const eligible = await seedXolacer(seeker);
    stub.hits = { [paused]: 0.9, [otherSpecialty]: 0.9, [lowRated]: 0.9, [alreadyAsked]: 0.9, [eligible]: 0.31 };

    expect((await suggest(seeker, sessionId))?.xolacerProfileId).toBe(eligible);
  });

  it("a refined session offers no one", async () => {
    const { seeker, sessionId } = await seekerSession();
    const a = await seedXolacer(seeker);
    stub.hits = { [a]: 0.9 };
    await seeker.root.run((ctx) =>
      ctx.db.insert("session_turns", {
        sessionId,
        turnNumber: 1,
        userFeedback: "say_more",
        userInput: "and also",
        revisedMirrorText: "…",
        modelVersion: "test",
        createdAt: Date.now(),
      }),
    );

    expect(await suggest(seeker, sessionId)).toBeNull();
  });

  it("stores nothing", async () => {
    const { seeker, sessionId } = await seekerSession();
    const a = await seedXolacer(seeker);
    stub.hits = { [a]: 0.9 };
    const snapshot = () =>
      seeker.root.run(async (ctx) => ({
        session: await ctx.db.get("sessions", sessionId),
        metadata: await ctx.db.query("emotional_metadata").collect(),
        conversations: await ctx.db.query("xolacer_conversations").collect(),
        xolacers: await ctx.db.query("xolacer_profiles").collect(),
      }));
    const before = await snapshot();

    expect(await suggest(seeker, sessionId)).not.toBeNull();
    expect(await snapshot()).toEqual(before);
  });
});

describe("xolacer meaning index", () => {
  it("embeds a published xolacer's bio and specialties, and removes them when paused", async () => {
    const { seeker } = await seekerSession();
    const a = await seedXolacer(seeker, { bio: "Ten years of night shifts.", specialties: ["burnout", "sleep"] });

    await seeker.root.action(internal.ai.xolacers.embed.indexXolacer, { emotionalProfileId: a });
    expect(stub.added).toEqual([{ key: a, text: "Ten years of night shifts.\nListens to: burnout, sleep" }]);

    await seeker.root.run(async (ctx) => {
      const row = await ctx.db.query("xolacer_profiles").withIndex("by_profile", (q) => q.eq("emotionalProfileId", a)).unique();
      await ctx.db.patch("xolacer_profiles", row!._id, { active: false });
    });
    await seeker.root.action(internal.ai.xolacers.embed.indexXolacer, { emotionalProfileId: a });
    expect(stub.deleted).toEqual([a]);
  });

  it("the backfill indexes the complete and clears the rest", async () => {
    const { seeker } = await seekerSession();
    const live = await seedXolacer(seeker);
    const draft = await seedXolacer(seeker, { complete: false });

    await seeker.root.action(internal.ai.xolacers.embed.indexAll, {});
    expect(stub.added.map((x) => x.key)).toEqual([live]);
    expect(stub.deleted).toEqual([draft]);
  });
});
