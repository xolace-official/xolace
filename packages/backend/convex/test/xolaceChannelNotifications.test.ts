// @vitest-environment edge-runtime
/**
 * The Xolace-channel push fan-out (#378): same badge behavior as any other
 * chat push, titled "Xolace" since there is no counterpart, sent to every
 * member but the sender.
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import { scheduledCalls } from "./fixtures.helpers";
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

async function enableChatNotifications(user: Awaited<ReturnType<typeof asNewUser>>) {
  await user.root.run(async (ctx) => {
    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", user.profileId))
      .unique();
    await ctx.db.patch("preferences", prefs!._id, {
      notifications: { ...prefs!.notifications, enabled: true },
    });
  });
}

describe("xolaceChannelNotifications.sendXolaceChannelPush", () => {
  it("titles the push 'Xolace', with no counterpart to name", async () => {
    sent.length = 0;
    unread.value = 4;
    const user = await asNewUser();
    await enableChatNotifications(user);
    await user.root.action(internal.xolaceChannelNotifications.sendXolaceChannelPush, {
      emotionalProfileId: user.profileId,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].notification).toMatchObject({ title: "Xolace", badge: 4 });
  });

  it("silent (inside the suppression window): badge only", async () => {
    sent.length = 0;
    unread.value = 6;
    const user = await asNewUser();
    await enableChatNotifications(user);
    await user.root.action(internal.xolaceChannelNotifications.sendXolaceChannelPush, {
      emotionalProfileId: user.profileId,
      silent: true,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].notification).toMatchObject({ badge: 6 });
    expect(sent[0].notification.title).toBeUndefined();
  });
});

describe("xolaceChannelNotifications.broadcastXolaceChannelPush", () => {
  it("schedules a push for every member but the sender", async () => {
    const sender = await asNewUser();
    // Same root as `sender`, per `asNewUser`'s doc comment — a second member
    // on the same data rather than an isolated backend of their own.
    const other = await asNewUser(2, sender.root);

    await sender.root.mutation(internal.xolaceChannelNotifications.broadcastXolaceChannelPush, {
      excludeProfileId: sender.profileId,
    });

    const calls = (await scheduledCalls(sender.root)).filter(
      (c) => c.name === "xolaceChannelNotifications:sendXolaceChannelPush",
    );
    expect(calls.map((c) => c.args.emotionalProfileId)).toContain(other.profileId);
    expect(calls.map((c) => c.args.emotionalProfileId)).not.toContain(sender.profileId);
  });
});
