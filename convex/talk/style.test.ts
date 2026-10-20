// @vitest-environment edge-runtime
/**
 * How the companion sounds in a talk (#603). Failure modes: the voice isn't
 * the person's companion pick, then their mirror voice, then Vesper; pace
 * or directness don't reach the talk; a settings change moves a talk already
 * running; "slow down" doesn't stick for the next talk, or lands through
 * someone else's talk or a closed one.
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, posthogMock, ragMock, rateLimiterMock, revenuecatMock } from "../test/mocks.helpers";
import { VOICE_CATALOG } from "../lib/voices";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../rag", () => ragMock());
vi.mock("../lib/rateLimits", async (orig) => ({
  ...(await orig<typeof import("../lib/rateLimits")>()),
  ...rateLimiterMock(),
}));
vi.mock("../revenuecat", () => revenuecatMock(() => true));

const startTalk = (user: SeededUser) =>
  user.t.mutation(internal.talk.session.start, { startedAt: Date.now(), secret: crypto.randomUUID() });

const key = ({ sessionId, talkKey }: { sessionId: string; talkKey: string }) => ({ sessionId, talkKey });

const style = async (user: SeededUser, talk: { sessionId: string; talkKey: string }) =>
  (await user.root.query(internal.talk.remember.forTurn, key(talk)))?.style;

const setPrefs = (user: SeededUser, patch: Partial<Doc<"preferences">>) =>
  user.root.run(async (ctx) => {
    const p = await ctx.db.query("preferences").withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId)).unique();
    await ctx.db.patch("preferences", p!._id, patch);
  });

const end = (user: SeededUser, sessionId: Doc<"sessions">["_id"]) =>
  user.t.mutation(internal.talk.session.abandon, { sessionId });

describe("the companion's voice, pace and directness", () => {
  it("voice: companion pick, else the mirror voice, else Vesper", async () => {
    const user = await asNewUser();
    const first = await startTalk(user);
    expect(first.voiceId).toBe(VOICE_CATALOG.vesper.elevenLabsId);
    await end(user, first.sessionId);
    await setPrefs(user, { voice: "ash" });
    const second = await startTalk(user);
    expect(second.voiceId).toBe(VOICE_CATALOG.ash.elevenLabsId);
    await end(user, second.sessionId);
    await setPrefs(user, { talkVoice: "wren" });
    expect((await startTalk(user)).voiceId).toBe(VOICE_CATALOG.wren.elevenLabsId);
  });

  it("pace and directness are read at start and fixed for the talk", async () => {
    const user = await asNewUser();
    await setPrefs(user, { talkPace: "slower", talkDirectness: "straight" });
    const talk = await startTalk(user);
    expect(talk.speed).toBe(0.85);
    expect(await style(user, talk)).toEqual({ directness: "straight", slowed: false });
    await setPrefs(user, { talkDirectness: "gentle" });
    expect(await style(user, talk)).toEqual({ directness: "straight", slowed: false });
  });

  it("defaults to normal pace and no directness line", async () => {
    const user = await asNewUser();
    const talk = await startTalk(user);
    expect(talk.speed).toBe(1);
    expect(await style(user, talk)).toEqual({ directness: undefined, slowed: false });
  });

  it("\"slow down\" slows this talk and saves the pace for the next", async () => {
    const user = await asNewUser();
    const talk = await startTalk(user);
    expect(await user.root.mutation(internal.talk.companion.slowDown, key(talk))).toEqual({ ok: true });
    expect((await style(user, talk))?.slowed).toBe(true);
    await end(user, talk.sessionId);
    const next = await startTalk(user);
    expect(next.speed).toBe(0.85);
    expect((await style(user, next))?.slowed).toBe(false);
  });

  it("slow down refuses a wrong key and a closed talk", async () => {
    const user = await asNewUser();
    const talk = await startTalk(user);
    expect((await user.root.mutation(internal.talk.companion.slowDown, { ...key(talk), talkKey: "nope" })).ok).toBe(false);
    await end(user, talk.sessionId);
    expect((await user.root.mutation(internal.talk.companion.slowDown, key(talk))).ok).toBe(false);
    expect((await startTalk(user)).speed).toBe(1);
  });
});
