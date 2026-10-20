// @vitest-environment edge-runtime
/**
 * Deleting ElevenLabs' copy of a talk (#595). Failure modes: an unsigned or
 * replayed-stale request triggers a DELETE; a delivered talk is never
 * stamped, or is re-deleted forever; a lost webhook is never retried; a wipe
 * purges the session and with it the only record of the id to DELETE.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { scheduledCalls } from "../test/fixtures.helpers";
import { aggregatesMock, ragMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../rag", () => ragMock());

const SECRET = "wsec_test";
const HOUR = 60 * 60 * 1000;
let elevenlabs: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("ELEVENLABS_AGENTS_API_KEY", "key");
  vi.stubEnv("ELEVENLABS_WEBHOOK_SECRET", SECRET);
  elevenlabs = vi.fn(async () => new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", elevenlabs);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function sign(body: string, t = Math.floor(Date.now() / 1000)) {
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

async function seedTalk(user: SeededUser, conversationId: string, createdAt = Date.now()) {
  return user.root.run((ctx) =>
    ctx.db.insert("sessions", {
      emotionalProfileId: user.profileId,
      state: "abandoned",
      entryType: "talk",
      kept: true,
      elevenLabsConversationId: conversationId,
      createdAt,
      updatedAt: createdAt,
    }),
  );
}

const stampOf = (user: SeededUser, id: Id<"sessions">) =>
  user.root.run(async (ctx) => (await ctx.db.get("sessions", id))?.providerDeletedAt ?? null);

function deliver(user: SeededUser, conversationId: string, signature?: string) {
  const body = JSON.stringify({
    type: "post_call_transcription",
    data: { conversation_id: conversationId, transcript: [{ role: "user", message: "hi" }] },
  });
  return (async () =>
    user.root.fetch("/webhooks/elevenlabs", {
      method: "POST",
      headers: { "ElevenLabs-Signature": signature ?? (await sign(body)) },
      body,
    }))();
}

describe("post_call_transcription webhook", () => {
  it("refuses a bad or stale signature without a DELETE", async () => {
    const user = await asNewUser();
    await seedTalk(user, "conv_1");
    expect((await deliver(user, "conv_1", "t=1,v0=00")).status).toBe(401);
    const stale = await sign("{}", Math.floor(Date.now() / 1000) - 2 * HOUR / 1000);
    expect((await deliver(user, "conv_1", stale)).status).toBe(401);
    expect(elevenlabs).not.toHaveBeenCalled();
  });

  it("deletes their copy and stamps the talk, once", async () => {
    const user = await asNewUser();
    const sessionId = await seedTalk(user, "conv_1");
    expect((await deliver(user, "conv_1")).status).toBe(200);
    expect(elevenlabs).toHaveBeenCalledWith(
      "https://api.elevenlabs.io/v1/convai/conversations/conv_1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(await stampOf(user, sessionId)).toBeTypeOf("number");

    elevenlabs.mockClear();
    expect((await deliver(user, "conv_1")).status).toBe(200);
    expect(elevenlabs).not.toHaveBeenCalled();
  });
});

describe("sweeper", () => {
  it("retries unstamped talks older than an hour; a 404 counts as deleted", async () => {
    const user = await asNewUser();
    const old = await seedTalk(user, "conv_old", Date.now() - 2 * HOUR);
    const young = await seedTalk(user, "conv_young");
    elevenlabs.mockImplementation(async () => new Response(null, { status: 404 }));

    await user.root.action(internal.talk.provider.sweep, {});

    expect(elevenlabs).toHaveBeenCalledTimes(1);
    expect(await stampOf(user, old)).toBeTypeOf("number");
    expect(await stampOf(user, young)).toBeNull();
  });

  it("leaves a talk unstamped when the DELETE fails", async () => {
    const user = await asNewUser();
    const old = await seedTalk(user, "conv_old", Date.now() - 2 * HOUR);
    elevenlabs.mockImplementation(async () => new Response(null, { status: 500 }));
    await user.root.action(internal.talk.provider.sweep, {});
    expect(await stampOf(user, old)).toBeNull();
  });
});

describe("data wipe", () => {
  it("schedules the provider DELETE for every unstamped talk it purges", async () => {
    const user = await asNewUser();
    await seedTalk(user, "conv_1");
    const done = await seedTalk(user, "conv_done");
    await user.root.run((ctx) => ctx.db.patch("sessions", done, { providerDeletedAt: 1 }));

    await user.root.mutation(internal.jobs.dataWipe.wipe, { emotionalProfileId: user.profileId });

    const calls = (await scheduledCalls(user.root)).filter((c) =>
      c.name.endsWith("talk/provider:deleteConversations"),
    );
    expect(calls).toEqual([
      expect.objectContaining({ args: expect.objectContaining({ conversationIds: ["conv_1"] }) }),
    ]);
  });
});
