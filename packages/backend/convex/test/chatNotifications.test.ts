// @vitest-environment edge-runtime
/**
 * The icon badge rides on the chat push (#343): `send` forwards whatever
 * `badge` the message path fetched from Stream, and the lifecycle types —
 * which never have one — leave the icon alone.
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import { seedConversation } from "./fixtures.helpers";
import { asNewUser } from "./harness.helpers";
import { aggregatesMock } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

const unread = vi.hoisted(() => ({ value: 0 as number | Error }));
vi.mock("../integrations/stream", async (orig) => ({
  ...(await orig<typeof import("../integrations/stream")>()),
  getStreamUnreadCount: async () => {
    if (unread.value instanceof Error) throw unread.value;
    return unread.value;
  },
}));

type Sent = { notification: { badge?: number; title?: string; body?: string } };
const sent = vi.hoisted(() => [] as Sent[]);
vi.mock("../lib/pushNotifications", () => ({
  sendPushToProfile: async (_ctx: unknown, args: Sent) => {
    sent.push(args);
  },
}));

async function recipient() {
  const user = await asNewUser();
  await user.root.run(async (ctx) => {
    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId))
      .unique();
    await ctx.db.patch("preferences", prefs!._id, {
      notifications: { ...prefs!.notifications, enabled: true },
    });
  });
  const conversationId = await seedConversation(user.root, user.profileId);
  return { user, conversationId };
}

describe("chatNotifications.send", () => {
  it("a lifecycle push has no badge", async () => {
    sent.length = 0;
    const { user, conversationId } = await recipient();
    await user.root.mutation(internal.chatNotifications.send, {
      emotionalProfileId: user.profileId,
      type: "chat_request",
      counterpartName: "Camper",
      conversationId,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].notification.badge).toBeUndefined();
  });
});

describe("chatNotifications.sendMessagePush", () => {
  it("asks Stream for the recipient's total and sends it as the badge", async () => {
    sent.length = 0;
    unread.value = 5;
    const { user, conversationId } = await recipient();
    await user.root.action(internal.chatNotifications.sendMessagePush, {
      emotionalProfileId: user.profileId,
      counterpartName: "Camper",
      conversationId,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].notification.badge).toBe(5);
  });

  it("Stream down: the push still goes, without a badge", async () => {
    sent.length = 0;
    unread.value = new Error("stream 503");
    const { user, conversationId } = await recipient();
    await user.root.action(internal.chatNotifications.sendMessagePush, {
      emotionalProfileId: user.profileId,
      counterpartName: "Camper",
      conversationId,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].notification.badge).toBeUndefined();
  });

  it("silent (inside the suppression window): badge only, nothing to display", async () => {
    sent.length = 0;
    unread.value = 2;
    const { user, conversationId } = await recipient();
    await user.root.action(internal.chatNotifications.sendMessagePush, {
      emotionalProfileId: user.profileId,
      counterpartName: "",
      conversationId,
      silent: true,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].notification).toMatchObject({ badge: 2 });
    expect(sent[0].notification.title).toBeUndefined();
    expect(sent[0].notification.body).toBeUndefined();
  });

  it("silent with Stream down sends nothing at all", async () => {
    sent.length = 0;
    unread.value = new Error("stream 503");
    const { user, conversationId } = await recipient();
    await user.root.action(internal.chatNotifications.sendMessagePush, {
      emotionalProfileId: user.profileId,
      counterpartName: "",
      conversationId,
      silent: true,
    });
    expect(sent).toHaveLength(0);
  });
});
