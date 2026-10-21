// @vitest-environment edge-runtime
/**
 * What the companion calls the person (#602). Failure modes: the ask runs on
 * a later talk too, or never on the first; a Clerk name is offered instead
 * of displayName; the tool touches the public displayName (only Settings
 * may, #602 review); a bad name is saved; a
 * name is saved through someone else's talk or a closed one; the private
 * name outlives a data wipe.
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, posthogMock, ragMock, rateLimiterMock, revenuecatMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../rag", () => ragMock());
vi.mock("../lib/rateLimits", async (orig) => ({
  ...(await orig<typeof import("../lib/rateLimits")>()),
  ...rateLimiterMock(),
}));
vi.mock("../revenuecat", () => revenuecatMock(() => true));

async function startTalk(user: SeededUser) {
  const { sessionId, talkKey } = await user.t.mutation(internal.talk.session.start, {
    startedAt: Date.now(),
    secret: crypto.randomUUID(),
  });
  return { sessionId, talkKey };
}

const person = async (user: SeededUser, talk: { sessionId: string; talkKey: string }) =>
  (await user.root.query(internal.talk.remember.forTurn, talk))?.person;

const prefs = (user: SeededUser) =>
  user.root.run(async (ctx) =>
    ctx.db.query("preferences").withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId)).unique(),
  );

const setDisplayName = (user: SeededUser, displayName: string) =>
  user.root.run(async (ctx) => {
    const p = await ctx.db.query("preferences").withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId)).unique();
    await ctx.db.patch("preferences", p!._id, { displayName });
  });

describe("the person's name in a talk", () => {
  it("asks in the first talk only, offering displayName", async () => {
    const user = await asNewUser();
    await setDisplayName(user, "Fern");
    const first = await startTalk(user);
    expect(await person(user, first)).toEqual({ name: "Fern", ask: true });
    // A talk that dropped before a word doesn't use up the ask.
    await user.t.mutation(internal.talk.session.abandon, { sessionId: first.sessionId });
    const retry = await startTalk(user);
    expect(await person(user, retry)).toEqual({ name: "Fern", ask: true });
    await user.root.mutation(internal.talk.companion.setPersonName, { ...retry, name: "Fern" });
    await user.t.mutation(internal.talk.session.abandon, { sessionId: retry.sessionId });
    const second = await startTalk(user);
    expect(await person(user, second)).toEqual({ name: "Fern", ask: false });
  });

  it("a private name is used by the companion and leaves displayName alone", async () => {
    const user = await asNewUser();
    await setDisplayName(user, "Fern");
    const talk = await startTalk(user);
    const result = await user.root.mutation(internal.talk.companion.setPersonName, { ...talk, name: " Sam " });
    expect(result).toEqual({ ok: true, name: "Sam" });
    expect(await person(user, talk)).toEqual({ name: "Sam", ask: false });
    expect(await prefs(user)).toMatchObject({ displayName: "Fern", preferredName: "Sam" });
    await user.t.mutation(internal.talk.session.abandon, { sessionId: talk.sessionId });
    expect(await person(user, await startTalk(user))).toEqual({ name: "Sam", ask: false });
  });

  it("never touches the public displayName, whatever the model sends", async () => {
    const user = await asNewUser();
    await setDisplayName(user, "Fern");
    const talk = await startTalk(user);
    await user.root.mutation(internal.talk.companion.setPersonName, { ...talk, name: "Sam" });
    await user.root.mutation(internal.talk.companion.setPersonName, { ...talk, name: "Sammy" });
    const p = await prefs(user);
    expect(p?.displayName).toBe("Fern");
    expect(p?.preferredName).toBe("Sammy");
    expect(await person(user, talk)).toEqual({ name: "Sammy", ask: false });
  });

  it("rejects a bad name, a wrong key and a closed talk", async () => {
    const user = await asNewUser();
    const talk = await startTalk(user);
    const set = (args: { sessionId: string; talkKey: string; name: string }) =>
      user.root.mutation(internal.talk.companion.setPersonName, args);
    expect((await set({ ...talk, name: "   " })).ok).toBe(false);
    expect((await set({ ...talk, name: "x".repeat(31) })).ok).toBe(false);
    expect((await set({ ...talk, talkKey: "nope", name: "Sam" })).ok).toBe(false);
    await user.t.mutation(internal.talk.session.abandon, { sessionId: talk.sessionId });
    expect((await set({ ...talk, name: "Sam" })).ok).toBe(false);
    expect((await prefs(user))?.preferredName).toBeUndefined();
  });

  it("a data wipe forgets the private name", async () => {
    const user = await asNewUser();
    const talk = await startTalk(user);
    await user.root.mutation(internal.talk.companion.setPersonName, { ...talk, name: "Sam" });
    await user.root.mutation(internal.jobs.dataWipe.wipe, { emotionalProfileId: user.profileId });
    expect((await prefs(user))?.preferredName).toBeUndefined();
  });
});
