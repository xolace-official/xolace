// @vitest-environment edge-runtime
/**
 * Weekly talk time (#596). Failure modes: a new Plus person has no time to
 * start; the weekly top-up runs twice, or a talk open at reset eats into
 * the new week, or its refund (or a sweep) pushes the balance past 15 min; a
 * talk starts with under 3 min left, or reserves more
 * than is left; a webhook redelivery charges twice; a duration past the
 * reservation over-refunds, a 0 s talk throws on a 0 refund; a lost webhook
 * holds the minutes forever; a talk that never connected blocks the retry; a
 * long non-crisis talk raises no alert.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { dayStartMs } from "../streaks/activityLog";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, posthogMock, ragMock, rateLimiterMock, revenuecatMock } from "../test/mocks.helpers";

const stub = vi.hoisted(() => ({ capture: vi.fn(async () => {}) }));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => ({ ...posthogMock(), posthog: { capture: stub.capture } }));
vi.mock("../rag", () => ragMock());
vi.mock("../lib/rateLimits", async (orig) => ({
  ...(await orig<typeof import("../lib/rateLimits")>()),
  ...rateLimiterMock(),
}));
vi.mock("../revenuecat", () => revenuecatMock(() => true));

const SECRET = "wsec_test";
const HOUR = 60 * 60 * 1000;
// Wednesday 2026-10-21, noon UTC (test users have no timezone → UTC).
const WED = Date.UTC(2026, 9, 21, 12);
const NEXT_MON = Date.UTC(2026, 9, 26, 0, 30);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(WED);
  stub.capture.mockClear();
  vi.stubEnv("ELEVENLABS_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("ELEVENLABS_AGENTS_API_KEY", "key");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const left = async (user: SeededUser) => {
  const time = await user.t.query(api.talk.time.left, { now: Date.now() });
  return time && { secondsLeft: time.secondsLeft };
};

async function startTalk(user: SeededUser) {
  const { sessionId, talkKey } = await user.t.mutation(internal.talk.session.start, {
    startedAt: Date.now(),
    secret: crypto.randomUUID(),
  });
  return { sessionId, talkKey };
}

async function attach(user: SeededUser, sessionId: Id<"sessions">, conversationId: string) {
  await user.t.mutation(api.talk.session.attachConversation, { sessionId, conversationId });
}

async function sign(body: string) {
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${t},v0=${hex}`;
}

async function webhook(
  user: SeededUser,
  conversationId: string,
  durationS: number,
  extraBody?: { sessionId: string; talkKey: string },
) {
  const body = JSON.stringify({
    type: "post_call_transcription",
    data: {
      conversation_id: conversationId,
      metadata: { call_duration_secs: durationS },
      conversation_initiation_client_data: extraBody && { custom_llm_extra_body: extraBody },
    },
  });
  const res = await user.root.fetch("/webhooks/elevenlabs", {
    method: "POST",
    headers: { "ElevenLabs-Signature": await sign(body) },
    body,
  });
  expect(res.status).toBe(200);
}

describe("dayStartMs", () => {
  it("lands on local midnight either side of a DST change", () => {
    expect(dayStartMs("2026-10-26", "UTC")).toBe(Date.UTC(2026, 9, 26));
    expect(dayStartMs("2026-10-26", "America/New_York")).toBe(Date.UTC(2026, 9, 26, 4)); // EDT
    expect(dayStartMs("2026-11-02", "America/New_York")).toBe(Date.UTC(2026, 10, 2, 5)); // EST
    expect(dayStartMs("2026-10-26", "Asia/Tokyo")).toBe(Date.UTC(2026, 9, 25, 15));
  });
});

describe("weekly talk time (#596)", () => {
  it("a new Plus person has 15 min, and a talk reserves its ceiling", async () => {
    const user = await asNewUser();
    expect(await left(user)).toEqual({ secondsLeft: 900 });
    const { talkKey } = await startTalk(user);
    expect(talkKey).toMatch(/^\d+\.900\./);
    expect(await left(user)).toEqual({ secondsLeft: 0 });
  });

  it("charges the reported duration and refunds the rest, once", async () => {
    const user = await asNewUser();
    const { sessionId } = await startTalk(user);
    await attach(user, sessionId, "conv_1");
    await webhook(user, "conv_1", 300.4);
    expect(await left(user)).toEqual({ secondsLeft: 599 });
    await webhook(user, "conv_1", 300.4);
    expect(await left(user)).toEqual({ secondsLeft: 599 });
  });

  it("releases a talk with nothing used, and never refunds past the reservation", async () => {
    const user = await asNewUser();
    const a = await startTalk(user);
    await attach(user, a.sessionId, "conv_a");
    await webhook(user, "conv_a", 0);
    expect(await left(user)).toEqual({ secondsLeft: 900 });

    const b = await startTalk(user);
    await attach(user, b.sessionId, "conv_b");
    await webhook(user, "conv_b", 1200);
    expect(await left(user)).toEqual({ secondsLeft: 0 });
  });

  it("limits a talk to what's left, and refuses one under 3 min", async () => {
    const user = await asNewUser();
    const a = await startTalk(user);
    await attach(user, a.sessionId, "conv_a");
    await webhook(user, "conv_a", 600);
    const b = await startTalk(user);
    expect(b.talkKey).toMatch(/^\d+\.300\./);
    await attach(user, b.sessionId, "conv_b");
    await webhook(user, "conv_b", 150);
    expect(await left(user)).toEqual({ secondsLeft: 150 });
    await expect(startTalk(user)).rejects.toThrow(/talk_time_used/);
  });

  it("tops up to 15 min on the local Monday; last week's open talk neither counts nor refunds", async () => {
    const user = await asNewUser();
    const a = await startTalk(user);
    await attach(user, a.sessionId, "conv_a");
    await webhook(user, "conv_a", 600);
    const b = await startTalk(user); // holds the remaining 300
    await attach(user, b.sessionId, "conv_b");

    vi.setSystemTime(NEXT_MON);
    expect(await left(user)).toEqual({ secondsLeft: 900 });
    await webhook(user, "conv_b", 100);
    // Its unused 200 was last week's: forfeited, not added to the new 900.
    expect(await left(user)).toEqual({ secondsLeft: 900 });

    // A second read the same week doesn't top up again.
    const c = await startTalk(user);
    await attach(user, c.sessionId, "conv_c");
    await webhook(user, "conv_c", 60);
    expect(await left(user)).toEqual({ secondsLeft: 840 });
  });

  it("a lost webhook from last week is swept without landing on the new week", async () => {
    const user = await asNewUser();
    const { sessionId } = await startTalk(user);
    await attach(user, sessionId, "conv_lost_sun");
    vi.setSystemTime(NEXT_MON + 3 * HOUR);
    await user.root.mutation(internal.talk.time.sweep, {});
    expect(await left(user)).toEqual({ secondsLeft: 900 });
  });

  it("the sweeper releases a reservation whose webhook never came", async () => {
    const user = await asNewUser();
    const { sessionId } = await startTalk(user);
    await attach(user, sessionId, "conv_lost");
    vi.setSystemTime(WED + 3 * HOUR);
    await user.root.mutation(internal.talk.time.sweep, {});
    expect(await left(user)).toEqual({ secondsLeft: 900 });
  });

  it("a talk that closes without connecting gives its time back at once", async () => {
    const user = await asNewUser();
    const { sessionId } = await startTalk(user); // no conversation, nothing said
    expect(await user.t.mutation(api.talk.session.end, { sessionId })).toBe(false);
    expect(await left(user)).toEqual({ secondsLeft: 900 });
    const retry = await startTalk(user);
    expect(retry.talkKey).toMatch(/^\d+\.900\./);
  });

  it("charges a talk the client never attached, from the echoed extra body", async () => {
    const user = await asNewUser();
    const { sessionId, talkKey } = await startTalk(user);
    await webhook(user, "conv_unattached", 120, { sessionId: "nope", talkKey });
    expect(await left(user)).toEqual({ secondsLeft: 0 }); // a wrong id charges nothing
    await webhook(user, "conv_unattached", 120, { sessionId, talkKey: "wrong" });
    expect(await left(user)).toEqual({ secondsLeft: 0 }); // nor a wrong key
    await webhook(user, "conv_unattached", 120, { sessionId, talkKey });
    expect(await left(user)).toEqual({ secondsLeft: 780 });
    // The key also attaches it, so their copy is deleted (not left forever).
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("conv_unattached"), expect.objectContaining({ method: "DELETE" }));
    expect(await user.t.query(internal.talk.provider.isPending, { conversationId: "conv_unattached" })).toBe(false);
  });

  it("a late webhook still gets a released talk's copy deleted", async () => {
    const user = await asNewUser();
    const { sessionId, talkKey } = await startTalk(user); // app died before attaching
    await user.t.mutation(api.talk.session.end, { sessionId }); // idle close releases it
    await webhook(user, "conv_late", 120, { sessionId, talkKey });
    expect(await left(user)).toEqual({ secondsLeft: 900 }); // nothing left to charge
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("conv_late"), expect.objectContaining({ method: "DELETE" }));
  });

  it("says a talk's charge is still settling once it has ended", async () => {
    const user = await asNewUser();
    const { sessionId } = await startTalk(user);
    await attach(user, sessionId, "conv_s");
    expect((await user.t.query(api.talk.time.left, { now: Date.now() }))?.settling).toBe(false);
    await user.t.mutation(api.talk.session.end, { sessionId });
    expect((await user.t.query(api.talk.time.left, { now: Date.now() }))?.settling).toBe(true);
    await webhook(user, "conv_s", 60);
    expect(await user.t.query(api.talk.time.left, { now: Date.now() })).toEqual({
      secondsLeft: 840,
      week: "2026-10-19",
      resetsAt: Date.UTC(2026, 9, 26),
      settling: false,
    });
  });

  it("alerts on a talk reported past 16 min", async () => {
    const user = await asNewUser();
    const { sessionId } = await startTalk(user);
    await attach(user, sessionId, "conv_long");
    await webhook(user, "conv_long", 17 * 60);
    expect(stub.capture).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event: "talk_duration_alert" }),
    );
  });
});
