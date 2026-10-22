// @vitest-environment edge-runtime
/**
 * `dailyQuotes.reply` (#313) — the quote path's first crossing of the
 * metadata-only boundary (docs/adr/0006).
 *
 * What can silently go wrong: a reply landing on someone else's row, the
 * 500-char cap living only in the client, a flagged reply being dropped
 * instead of stored, an `escalation_events` row appearing on a path that was
 * ruled to have no verdict to record — and the wipe/deletion parity that is
 * supposed to be free, which is exactly the kind of freeness worth asserting.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { aggregatesMock, ragMock, rateLimiterMock } from "./mocks.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";

const stub = vi.hoisted(() => ({ flagged: false, unavailable: false }));
/** Keys handed to `rag.deleteByKeyAsync` — the reply purge's only evidence. */
const ragDeletes = vi.hoisted(() => [] as string[]);

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../rag", () => ragMock({}, ragDeletes));
vi.mock("../lib/rateLimits", async (orig) => ({
  ...(await orig<typeof import("../lib/rateLimits")>()),
  ...rateLimiterMock(),
}));
vi.mock("../ai/providers/moderation", async (orig) => {
  const actual = await orig<typeof import("../ai/providers/moderation")>();
  return {
    ...actual,
    moderateInput: async () =>
      stub.unavailable
        ? actual.MODERATION_UNAVAILABLE
        : {
            flagged: stub.flagged,
            categories: { ...actual.EMPTY_CATEGORIES, "self-harm": stub.flagged },
            categoryScores: {},
          },
  };
});

async function seedQuote(user: SeededUser) {
  return await user.root.run(async (ctx) =>
    ctx.db.insert("daily_quotes", {
      emotionalProfileId: user.profileId,
      date: "2026-01-01",
      type: "curated" as const,
      text: "the quote",
      isPremium: false,
      createdAt: Date.now(),
    }),
  );
}

const readQuote = (user: SeededUser, quoteId: Awaited<ReturnType<typeof seedQuote>>) =>
  user.root.run(async (ctx) => ctx.db.get("daily_quotes", quoteId));

beforeEach(() => {
  stub.flagged = false;
  stub.unavailable = false;
  ragDeletes.length = 0;
});

describe("replying to a quote", () => {
  it("stores the reply, trims it, and records that moderation ran", async () => {
    const user = await asNewUser();
    const quoteId = await seedQuote(user);

    const result = await user.t.action(api.dailyQuotes.reply, {
      quoteId,
      text: "  it is the tiredness, not the calm  ",
    });

    expect(result).toEqual({ flagged: false });
    const quote = await readQuote(user, quoteId);
    expect(quote?.reply).toBe("it is the tiredness, not the calm");
    expect(quote?.repliedAt).toBeTypeOf("number");
    expect(quote?.replyModeration?.flagged).toBe(false);
  });

  it("is one reply per quote — sending again overwrites", async () => {
    const user = await asNewUser();
    const quoteId = await seedQuote(user);

    await user.t.action(api.dailyQuotes.reply, { quoteId, text: "first" });
    await user.t.action(api.dailyQuotes.reply, { quoteId, text: "second" });

    expect((await readQuote(user, quoteId))?.reply).toBe("second");
  });

  it("caps at 500 characters and refuses an empty reply, server-side", async () => {
    const user = await asNewUser();
    const quoteId = await seedQuote(user);

    await expect(
      user.t.action(api.dailyQuotes.reply, { quoteId, text: "x".repeat(501) }),
    ).rejects.toThrow();
    await expect(
      user.t.action(api.dailyQuotes.reply, { quoteId, text: "   " }),
    ).rejects.toThrow();

    await user.t.action(api.dailyQuotes.reply, { quoteId, text: "x".repeat(500) });
    expect((await readQuote(user, quoteId))?.reply).toHaveLength(500);
  });

  it("will not write to another user's quote", async () => {
    const owner = await asNewUser();
    const other = await asNewUser(2, owner.root);
    const quoteId = await seedQuote(owner);

    await expect(
      other.t.action(api.dailyQuotes.reply, { quoteId, text: "not mine" }),
    ).rejects.toThrow();
    expect((await readQuote(owner, quoteId))?.reply).toBeUndefined();
  });

  it("stores a flagged reply and opens no escalation event", async () => {
    stub.flagged = true;
    const user = await asNewUser();
    const quoteId = await seedQuote(user);

    const result = await user.t.action(api.dailyQuotes.reply, {
      quoteId,
      text: "i do not want to be here",
    });

    expect(result).toEqual({ flagged: true });
    const quote = await readQuote(user, quoteId);
    // Stored, not dropped — the client answers it with crisis resources.
    expect(quote?.reply).toBe("i do not want to be here");
    expect(quote?.replyModeration?.flagged).toBe(true);
    expect(quote?.replyModeration?.categories).toContain("self-harm");

    const escalations = await user.root.run(async (ctx) =>
      ctx.db.query("escalation_events").collect(),
    );
    expect(escalations).toEqual([]);
  });
});

describe("reply parity with the erasure loops", () => {
  it("goes with the row on a data wipe", async () => {
    const user = await asNewUser();
    const quoteId = await seedQuote(user);
    await user.t.action(api.dailyQuotes.reply, { quoteId, text: "mine" });

    await user.root.mutation(internal.jobs.dataWipe.wipe, {
      emotionalProfileId: user.profileId,
    });

    expect(await readQuote(user, quoteId)).toBeNull();
    // The row dying is only half of it — the embedding must die with it,
    // and this loop touches no vector on its own (ADR 0007).
    expect(ragDeletes).toContain(`reply:${quoteId}`);
  });

  it("goes with the row on account deletion", async () => {
    const user = await asNewUser();
    const quoteId = await seedQuote(user);
    await user.t.action(api.dailyQuotes.reply, { quoteId, text: "mine" });

    // Imported here, not at the top: a static import of the deletion steps
    // pulls lib/aggregates in ahead of the hoisted vi.mock above it.
    const { drainQuotes } = await import("../jobs/accountDeletionSteps");
    await user.root.run(async (ctx) => drainQuotes(ctx, user.profileId));

    expect(await readQuote(user, quoteId)).toBeNull();
    expect(ragDeletes).toContain(`reply:${quoteId}`);
  });
});

describe("loadRecentReplies (#314)", () => {
  it("reads replies inside the window, skips flagged ones and quotes never replied to", async () => {
    const user = await asNewUser();
    const now = new Date("2026-01-08T00:00:00Z").getTime();
    const day = 24 * 60 * 60 * 1000;

    const seedReplied = async (
      date: string,
      reply: string | undefined,
      repliedAt?: number,
      flagged = false,
    ) =>
      user.root.run(async (ctx) =>
        ctx.db.insert("daily_quotes", {
          emotionalProfileId: user.profileId,
          date,
          type: "curated" as const,
          text: "the quote",
          isPremium: false,
          createdAt: now,
          ...(reply === undefined
            ? {}
            : {
                reply,
                repliedAt,
                replyModeration: { flagged, categories: [], checkedAt: repliedAt! },
              }),
        }),
      );

    await seedReplied("2026-01-07", "yesterday", now - day);
    await seedReplied("2026-01-06", "flagged one", now - 2 * day, true);
    await seedReplied("2026-01-05", "three days back", now - 3 * day);
    await seedReplied("2026-01-04", undefined);
    // Outside the 7-day date window entirely.
    await seedReplied("2025-12-20", "long ago", now - 19 * day);

    const replies = await user.root.query(internal.ai.quotesDistiller.loadRecentReplies, {
      emotionalProfileId: user.profileId,
      referenceDate: now,
    });

    expect(replies.map((r) => r.text)).toEqual(["yesterday", "three days back"]);
  });

  it("keeps a reply written while moderation was down, but withholds it from the prompt", async () => {
    stub.unavailable = true;
    const user = await asNewUser();
    // Dated today so the row is inside loadRecentReplies' window — the
    // exclusion under test has to be the moderation state, not the date.
    const quoteId = await user.root.run(async (ctx) =>
      ctx.db.insert("daily_quotes", {
        emotionalProfileId: user.profileId,
        date: new Date().toISOString().slice(0, 10),
        type: "curated" as const,
        text: "the quote",
        isPremium: false,
        createdAt: Date.now(),
      }),
    );

    await user.t.action(api.dailyQuotes.reply, { quoteId, text: "unchecked words" });

    const quote = await readQuote(user, quoteId);
    expect(quote?.reply).toBe("unchecked words");
    expect(quote?.replyModeration?.unavailable).toBe(true);

    const replies = await user.root.query(internal.ai.quotesDistiller.loadRecentReplies, {
      emotionalProfileId: user.profileId,
      referenceDate: quote!.repliedAt!,
    });
    expect(replies).toEqual([]);
  });
});
