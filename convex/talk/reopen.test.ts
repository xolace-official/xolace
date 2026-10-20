// @vitest-environment edge-runtime
/**
 * "Say more" reopens a talk (#604). Failure modes: the reopening's lines
 * overwrite the earlier thread (ElevenLabs numbers them from 0 again); its
 * reply lands at the wrong seq; it reserves more than 5 min or past what's
 * left; its webhook settles the first opening's charge, or finds nothing
 * and never charges; its conversation is never deleted; the mirror isn't
 * remade from the whole thread, or keeps the old mirror's audio; a reopening
 * with nothing new said remakes the mirror or holds the minutes; a talk
 * still open, or past its mirror, reopens.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
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

const SECRET = "wsec_test";
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.UTC(2026, 9, 21, 12));
  vi.stubEnv("ELEVENLABS_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("ELEVENLABS_AGENTS_API_KEY", "key");
  fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

type Line = { role: "person" | "companion"; text: string };
const key = () => ({ startedAt: Date.now(), secret: crypto.randomUUID() });
const secondsLeft = async (user: SeededUser) => (await user.t.query(api.talk.time.left, {}))?.secondsLeft;

async function sign(body: string) {
  const t = Math.floor(Date.now() / 1000);
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${t}.${body}`));
  return `t=${t},v0=${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

async function webhook(user: SeededUser, conversationId: string, durationS: number, extra: { sessionId: string; talkKey: string }) {
  const body = JSON.stringify({
    type: "post_call_transcription",
    data: {
      conversation_id: conversationId,
      metadata: { call_duration_secs: durationS },
      conversation_initiation_client_data: { custom_llm_extra_body: extra },
    },
  });
  const res = await user.root.fetch("/webhooks/elevenlabs", { method: "POST", headers: { "ElevenLabs-Signature": await sign(body) }, body });
  expect(res.status).toBe(200);
}

/** One served turn, as the endpoint makes it: the lines as it starts, the reply after. */
async function sync(user: SeededUser, sessionId: Id<"sessions">, talkKey: string, lines: Line[], reply: string) {
  const bound = await user.t.mutation(internal.talk.turns.syncLines, { sessionId, talkKey, lines });
  await user.t.mutation(internal.talk.turns.syncLines, { sessionId, talkKey, reply: { seq: lines.length, text: reply } });
  return bound;
}

/** A finished first talk, its mirror delivered and its 5 min charged: 10 min left. */
async function talkToMirror(user: SeededUser) {
  const { sessionId, talkKey } = await user.t.mutation(internal.talk.session.start, key());
  await user.t.mutation(api.talk.session.attachConversation, { sessionId, conversationId: "conv_1" });
  expect(await sync(user, sessionId, talkKey, [{ role: "person", text: "Work is too much." }], "What part weighs most?")).toBe(true);
  expect(await user.t.mutation(api.talk.session.end, { sessionId })).toBe(true);
  await webhook(user, "conv_1", 300, { sessionId, talkKey });
  const audio = await user.root.run((ctx) => ctx.storage.store(new Blob(["mp3"])));
  await user.root.run((ctx) =>
    ctx.db.patch("sessions", sessionId, { state: "mirror_delivered", mirrorText: "It's a lot.", mirrorAudioStorageId: audio }),
  );
  expect(await secondsLeft(user)).toBe(600);
  return sessionId;
}

const session = (user: SeededUser, id: Id<"sessions">) => user.root.run((ctx) => ctx.db.get("sessions", id));

describe("talk.reopen.start (#604)", () => {
  it("continues the thread, remakes the mirror from all of it, and charges its own opening", async () => {
    const user = await asNewUser();
    const sessionId = await talkToMirror(user);

    const { talkKey } = await user.t.mutation(internal.talk.reopen.start, { sessionId, ...key() });
    expect(talkKey).toMatch(/^\d+\.300\./);
    expect(await secondsLeft(user)).toBe(300);
    expect((await session(user, sessionId))?.talkMemory).toContain("Them: Work is too much.");

    await user.t.mutation(api.talk.session.attachConversation, { sessionId, conversationId: "conv_2" });
    // A new conversation numbers from 0; the earlier thread stays as it was.
    const reopened: Line[] = [{ role: "person", text: "And my sister isn't speaking to me." }];
    expect(await sync(user, sessionId, talkKey, reopened, "That's a second weight.")).toBe(true);
    expect(await user.t.query(api.talk.turns.thread, { sessionId })).toEqual([
      { role: "person", text: "Work is too much." },
      { role: "companion", text: "What part weighs most?" },
      { role: "person", text: "And my sister isn't speaking to me." },
      { role: "companion", text: "That's a second weight." },
    ]);

    expect(await user.t.mutation(api.talk.session.end, { sessionId })).toBe(true);
    const ended = await session(user, sessionId);
    expect(ended?.state).toBe("processing");
    expect(ended?.rawInput).toBe("Work is too much.\nAnd my sister isn't speaking to me.");
    expect(ended?.mirrorAudioStorageId).toBeUndefined();

    // Its webhook settles its own reservation; a redelivery of the first changes nothing.
    await webhook(user, "conv_2", 120, { sessionId, talkKey });
    expect(await secondsLeft(user)).toBe(480);
    await webhook(user, "conv_1", 300, { sessionId, talkKey: "1.900.stale" });
    expect(await secondsLeft(user)).toBe(480);
    const deleted = fetchMock.mock.calls.map(([url]) => String(url)).filter((u) => u.includes("/conversations/"));
    expect(deleted.some((u) => u.endsWith("/conv_2"))).toBe(true);
  });

  it("with nothing new said, goes back to its mirror and gives the time back", async () => {
    const user = await asNewUser();
    const sessionId = await talkToMirror(user);
    const { talkKey } = await user.t.mutation(internal.talk.reopen.start, { sessionId, ...key() });
    // The companion greeted them; they said nothing.
    await user.t.mutation(internal.talk.turns.syncLines, {
      sessionId,
      talkKey,
      reply: { seq: 0, text: "Back again?" },
    });
    expect(await user.t.mutation(api.talk.session.end, { sessionId })).toBe(true);
    expect(await user.t.query(api.talk.turns.thread, { sessionId })).toHaveLength(2);
    const back = await session(user, sessionId);
    expect(back?.state).toBe("mirror_delivered");
    expect(back?.mirrorAudioStorageId).toBeDefined();
    expect(await secondsLeft(user)).toBe(600);
  });

  it("only reopens from the mirror, and not under 3 min left", async () => {
    const user = await asNewUser();
    const { sessionId } = await user.t.mutation(internal.talk.session.start, key());
    await expect(user.t.mutation(internal.talk.reopen.start, { sessionId, ...key() })).rejects.toThrow("not_reopenable");

    const other = await asNewUser(2, user.root);
    const mirrored = await talkToMirror(other);
    // 10 min left; a second talk of 8 leaves 2.
    const { sessionId: second, talkKey } = await other.t.mutation(internal.talk.session.start, key());
    await other.t.mutation(api.talk.session.attachConversation, { sessionId: second, conversationId: "conv_3" });
    await webhook(other, "conv_3", 480, { sessionId: second, talkKey });
    expect(await secondsLeft(other)).toBe(120);
    await expect(other.t.mutation(internal.talk.reopen.start, { sessionId: mirrored, ...key() })).rejects.toThrow("talk_time_used");
  });
});
