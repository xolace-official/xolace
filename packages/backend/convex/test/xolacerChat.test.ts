// @vitest-environment edge-runtime
/**
 * `myConversations` (#377): the discriminated union that adds the synthetic
 * Xolace-channel row alongside ordinary `xolacer_conversations` rows.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { XOLACE_BROADCAST_CHANNEL_TYPE, XOLACE_CHANNEL_ID } from "../lib/streamSetup";
import { seedConversation } from "./fixtures.helpers";
import { asNewUser } from "./harness.helpers";
import { aggregatesMock } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

beforeEach(() => {
  process.env.XOLACER_CHAT_ENABLED = "true";
});

describe("myConversations (#377)", () => {
  it("returns a normal conversation row and the Xolace channel row, tagged, in last-activity order", async () => {
    const user = await asNewUser();
    // "resting" so the row never touches presence (`presenceDisclosed` is
    // false for it) — not under test here.
    const conversationId = await seedConversation(user.root, user.profileId, "resting");
    const olderActivity = Date.now() - 10_000;
    await user.root.run((ctx) =>
      ctx.db.patch("xolacer_conversations", conversationId, { requestedAt: olderActivity }),
    );

    const newerActivity = Date.now();
    await user.root.run((ctx) =>
      ctx.db.insert("xolace_channel_cache", {
        text: "New this week",
        senderId: "xolace",
        sentAt: newerActivity,
      }),
    );

    const rows = await user.t.query(api.xolacerChat.myConversations, {});

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.kind)).toEqual(["broadcast", "pair"]);

    const [broadcastRow, pairRow] = rows;
    expect(broadcastRow).toMatchObject({
      kind: "broadcast",
      id: XOLACE_CHANNEL_ID,
      streamChannelId: XOLACE_CHANNEL_ID,
      channelType: XOLACE_BROADCAST_CHANNEL_TYPE,
      lastMessageAt: newerActivity,
      lastMessageText: "New this week",
    });
    expect(pairRow).toMatchObject({
      kind: "pair",
      id: conversationId,
      role: "user",
      status: "resting",
      xolacerProfileId: user.profileId,
      counterpartProfileId: user.profileId,
    });
  });

  it("still returns the Xolace channel row before any message has ever been cached", async () => {
    const user = await asNewUser();

    const rows = await user.t.query(api.xolacerChat.myConversations, {});

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "broadcast", id: XOLACE_CHANNEL_ID });
    expect(rows[0].lastMessageAt).toBeUndefined();
    expect(rows[0].lastMessageText).toBeUndefined();
  });

  it("keeps the always-on Xolace channel row when the xolacer kill switch is off, dropping only pair rows", async () => {
    const user = await asNewUser();
    await seedConversation(user.root, user.profileId, "resting");
    process.env.XOLACER_CHAT_ENABLED = "false";

    const rows = await user.t.query(api.xolacerChat.myConversations, {});

    expect(rows.map((row) => row.kind)).toEqual(["broadcast"]);
  });
});
