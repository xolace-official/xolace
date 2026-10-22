// @vitest-environment edge-runtime
/**
 * The `message.new` webhook seam (#344): what a signed Stream event schedules.
 * Both scheduled callees are stubbed to no-ops — the push would ask Stream for
 * an unread count and the moderation job would call the model — so the
 * assertions read the scheduler at the enqueue boundary.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { XOLACE_CHANNEL_ID } from "../lib/streamSetup";
import { seedConversation } from "./fixtures.helpers";
import { scheduledCalls } from "./fixtures.helpers";
import { asNewUser } from "./harness.helpers";
import { aggregatesMock, noopJob } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../chatNotifications", () => ({ sendMessagePush: noopJob(), send: noopJob() }));
vi.mock("../xolaceChannelNotifications", () => ({
  broadcastXolaceChannelPush: noopJob(),
  sendXolaceChannelPush: noopJob(),
}));
vi.mock("../ai/chat/moderate", async (orig) => ({
  ...(await orig<typeof import("../ai/chat/moderate")>()),
  moderateChatMessage: noopJob(),
}));

const SECRET = "test-stream-secret";

async function sign(body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

beforeEach(() => {
  process.env.STREAM_API_KEY = "test-key";
  process.env.STREAM_API_SECRET = SECRET;
  process.env.XOLACER_CHAT_ENABLED = "true";
});

async function setup() {
  const user = await asNewUser();
  // Both seats are this user — the row is the seam, identity is not under test.
  const conversationId = await seedConversation(user.root, user.profileId);
  await user.root.run(async (ctx) => {
    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId))
      .unique();
    await ctx.db.patch("preferences", prefs!._id, {
      notifications: { ...prefs!.notifications, enabled: true },
    });
  });
  const deliver = async (
    message: { id: string; text: string; kind?: string },
    webhookId = "wh_1",
  ) => {
    const body = JSON.stringify({
      type: "message.new",
      channel_id: `xolacer_${conversationId}`,
      user: { id: user.profileId },
      message,
    });
    return user.root.fetch("/webhooks/stream", {
      method: "POST",
      headers: { "x-signature": await sign(body), "x-webhook-id": webhookId },
      body,
    });
  };
  return { user, conversationId, deliver };
}

describe("streamEvents", () => {
  it("a message schedules the push and then the moderation job with the message, not the payload", async () => {
    const { user, conversationId, deliver } = await setup();
    const response = await deliver({ id: "msg_1", text: "i really can't do this anymore" });
    expect(response.status).toBe(200);

    const calls = await scheduledCalls(user.root);
    expect(calls.map((c) => c.name)).toEqual([
      "chatNotifications:sendMessagePush",
      "ai/chat/moderate:moderateChatMessage",
    ]);
    expect(calls[1].args).toEqual({
      conversationId,
      senderRole: "user",
      streamChannelId: `xolacer_${conversationId}`,
      streamMessageId: "msg_1",
      text: "i really can't do this anymore",
    });
  });

  it("a one-word message is pushed but never moderated", async () => {
    const { user, deliver } = await setup();
    await deliver({ id: "msg_1", text: "thanks" });
    const calls = await scheduledCalls(user.root);
    expect(calls.map((c) => c.name)).toEqual(["chatNotifications:sendMessagePush"]);
  });

  it("a redelivered webhook id schedules no second moderation job", async () => {
    const { user, deliver } = await setup();
    await deliver({ id: "msg_1", text: "i really can't do this anymore" }, "wh_1");
    await deliver({ id: "msg_1", text: "i really can't do this anymore" }, "wh_1");
    const calls = await scheduledCalls(user.root);
    expect(calls.filter((c) => c.name.endsWith("moderateChatMessage"))).toHaveLength(1);
  });

  it("our own resources card is neither counted, pushed, nor moderated", async () => {
    const { user, conversationId, deliver } = await setup();
    await deliver({ id: "sys_1", text: "Support is available", kind: "crisis_resources" });
    expect(await scheduledCalls(user.root)).toEqual([]);
    const row = await user.root.run((ctx) => ctx.db.get("xolacer_conversations", conversationId));
    expect(row?.messageCount ?? 0).toBe(0);
  });
});

describe("Xolace channel cache (#376)", () => {
  async function deliverXolace(
    user: Awaited<ReturnType<typeof asNewUser>>,
    message: { id: string; text: string },
    webhookId = "wh_xolace_1",
  ) {
    const body = JSON.stringify({
      type: "message.new",
      channel_id: XOLACE_CHANNEL_ID,
      user: { id: user.profileId },
      message,
    });
    return user.root.fetch("/webhooks/stream", {
      method: "POST",
      headers: { "x-signature": await sign(body), "x-webhook-id": webhookId },
      body,
    });
  }

  it("a Xolace-channel message updates the cache and schedules the broadcast push (#378)", async () => {
    const user = await asNewUser();
    const before = Date.now();
    const response = await deliverXolace(user, { id: "msg_1", text: "New this week" });
    expect(response.status).toBe(200);

    const cache = await user.root.run((ctx) => ctx.db.query("xolace_channel_cache").first());
    expect(cache).toMatchObject({ text: "New this week", senderId: user.profileId });
    expect(cache!.sentAt).toBeGreaterThanOrEqual(before);
    expect(cache!.lastNotifiedAt).toBe(cache!.sentAt);

    expect(await scheduledCalls(user.root)).toEqual([
      {
        name: "xolaceChannelNotifications:broadcastXolaceChannelPush",
        args: { excludeProfileId: user.profileId, silent: false },
      },
    ]);
  });

  it("a second Xolace-channel message inside the suppression window fans out silently", async () => {
    const user = await asNewUser();
    await deliverXolace(user, { id: "msg_1", text: "first" }, "wh_xolace_a");
    const firstCache = await user.root.run((ctx) => ctx.db.query("xolace_channel_cache").first());

    await deliverXolace(user, { id: "msg_2", text: "second" }, "wh_xolace_b");
    const secondCache = await user.root.run((ctx) => ctx.db.query("xolace_channel_cache").first());
    expect(secondCache?.text).toBe("second");
    // The window is unchanged by a suppressed message, only the text/time ride through.
    expect(secondCache?.lastNotifiedAt).toBe(firstCache?.lastNotifiedAt);

    const calls = await scheduledCalls(user.root);
    expect(calls.filter((c) => c.name === "xolaceChannelNotifications:broadcastXolaceChannelPush")).toEqual([
      { name: "xolaceChannelNotifications:broadcastXolaceChannelPush", args: { excludeProfileId: user.profileId, silent: false } },
      { name: "xolaceChannelNotifications:broadcastXolaceChannelPush", args: { excludeProfileId: user.profileId, silent: true } },
    ]);
  });

  it("does not create or modify any xolacer_conversations row", async () => {
    const { user, conversationId, deliver } = await setup();
    await deliverXolace(user, { id: "msg_1", text: "New this week" });

    const conversations = await user.root.run((ctx) =>
      ctx.db.query("xolacer_conversations").collect(),
    );
    expect(conversations).toHaveLength(1);
    expect(conversations[0]._id).toBe(conversationId);
    expect(conversations[0].messageCount ?? 0).toBe(0);

    // The regression case: a normal conversation message on the same
    // deployment still resolves through the existing path, unaffected.
    await deliver({ id: "msg_2", text: "hey" });
    const row = await user.root.run((ctx) => ctx.db.get("xolacer_conversations", conversationId));
    expect(row?.messageCount).toBe(1);
  });

  it("updates the cache even while the xolacer peer-chat kill switch is off", async () => {
    process.env.XOLACER_CHAT_ENABLED = "false";
    const user = await asNewUser();
    await deliverXolace(user, { id: "msg_1", text: "New this week" });

    const cache = await user.root.run((ctx) => ctx.db.query("xolace_channel_cache").first());
    expect(cache?.text).toBe("New this week");
  });

  it("the x-webhook-id dedupe guard prevents a replayed Xolace event from overwriting the cache", async () => {
    const user = await asNewUser();
    await deliverXolace(user, { id: "msg_1", text: "first" }, "wh_xolace_1");
    await deliverXolace(user, { id: "msg_1", text: "first" }, "wh_xolace_1");

    const rows = await user.root.run((ctx) => ctx.db.query("xolace_channel_cache").collect());
    expect(rows).toHaveLength(1);

    // A genuinely new event (different webhook id) still updates the cache.
    await deliverXolace(user, { id: "msg_2", text: "second" }, "wh_xolace_2");
    const cache = await user.root.run((ctx) => ctx.db.query("xolace_channel_cache").first());
    expect(cache?.text).toBe("second");
  });
});
