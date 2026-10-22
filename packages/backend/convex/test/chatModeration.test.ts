// @vitest-environment edge-runtime
/**
 * The post-delivery moderation lane (#344), from `moderateChatMessage` down:
 * the model provider and the two Stream writes are stubbed, everything else
 * — verdict row, dedupe, resource-set choice — runs for real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import { CRISIS_RESOURCES, SUPPORT_RESOURCES } from "../ai/safeguard";
import { seedConversation } from "./fixtures.helpers";
import { asNewUser } from "./harness.helpers";
import { aggregatesMock, anthropicMock } from "./mocks.helpers";

const stub = vi.hoisted(() => ({
  reply: "" as string | Error,
  calls: 0,
  systemMessages: [] as { channelId: string; message: Record<string, unknown> }[],
  flags: [] as { messageId: string; reason: string }[],
  sendFailures: 0,
}));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../ai/providers/anthropic", async (orig) => ({
  ...(await orig<typeof import("../ai/providers/anthropic")>()),
  ...anthropicMock(() => {
    stub.calls++;
    return stub.reply;
  }),
}));
vi.mock("../integrations/stream", async (orig) => ({
  ...(await orig<typeof import("../integrations/stream")>()),
  sendStreamSystemMessage: async (channelId: string, message: Record<string, unknown>) => {
    if (stub.sendFailures > 0) {
      stub.sendFailures--;
      throw new Error("Stream POST /message failed (503): down");
    }
    stub.systemMessages.push({ channelId, message });
  },
  flagStreamMessage: async (messageId: string, reason: string) => {
    stub.flags.push({ messageId, reason });
  },
}));

const verdict = (v: Record<string, unknown>) =>
  JSON.stringify({ crisis: "none", harassment: false, spam: false, contact: false, confidence: 0.9, ...v });

async function moderate(text: string, streamMessageId = "msg_1") {
  const user = await asNewUser();
  const conversationId = await seedConversation(user.root, user.profileId);
  const args = {
    conversationId,
    senderRole: "user" as const,
    streamChannelId: `xolacer_${conversationId}`,
    streamMessageId,
    text,
  };
  await user.root.action(internal.ai.chat.moderate.moderateChatMessage, args);
  const rows = await user.root.run((ctx) => ctx.db.query("chat_moderation_events").collect());
  return { user, args, rows };
}

beforeEach(() => {
  stub.reply = verdict({});
  stub.calls = 0;
  stub.systemMessages.length = 0;
  stub.flags.length = 0;
  stub.sendFailures = 0;
});

describe("moderateChatMessage", () => {
  it("records a verdict without the message text", async () => {
    const { rows, args } = await moderate("i've been feeling really low all week");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      conversationId: args.conversationId,
      streamMessageId: "msg_1",
      senderRole: "user",
      level: "none",
      categories: [],
      confidence: 0.9,
    });
    expect(JSON.stringify(rows[0])).not.toContain("feeling really low");
    expect(stub.systemMessages).toHaveLength(0);
    expect(stub.flags).toHaveLength(0);
  });

  it("crisis → one silent resources card with the crisis set, no flag", async () => {
    stub.reply = verdict({ crisis: "crisis", confidence: 0.95 });
    const { args } = await moderate("i don't want to be here anymore");
    expect(stub.systemMessages).toHaveLength(1);
    expect(stub.systemMessages[0].channelId).toBe(args.streamChannelId);
    expect(stub.systemMessages[0].message).toMatchObject({
      kind: "crisis_resources",
      level: "crisis",
      resources: CRISIS_RESOURCES,
    });
    expect(stub.flags).toHaveLength(0);
    // Deterministic id: a retried send is a Stream duplicate, not a second card.
    expect(stub.systemMessages[0].message.id).toBe("crisis_resources_msg_1");
  });

  it("a Stream failure records no verdict and hands the delivery to a retry", async () => {
    stub.reply = verdict({ crisis: "crisis" });
    stub.sendFailures = 1;
    const { user, args, rows } = await moderate("i don't want to be here anymore");
    expect(rows).toHaveLength(0);
    expect(stub.systemMessages).toHaveLength(0);

    // The scheduled retry, run by hand.
    await user.root.action(internal.ai.chat.moderate.retryDelivery, {
      conversationId: args.conversationId,
      streamMessageId: args.streamMessageId,
      streamChannelId: args.streamChannelId,
      senderRole: args.senderRole,
      level: "crisis",
      categories: [],
      confidence: 0.9,
      attempt: 1,
    });
    expect(stub.systemMessages).toHaveLength(1);
    const after = await user.root.run((ctx) => ctx.db.query("chat_moderation_events").collect());
    expect(after).toHaveLength(1);
    expect(stub.calls).toBe(1);
  });

  it("elevated → the support set", async () => {
    stub.reply = verdict({ crisis: "elevated" });
    await moderate("sometimes i wish i wouldn't wake up");
    expect(stub.systemMessages[0].message.resources).toEqual(SUPPORT_RESOURCES);
  });

  it("harassment → flagged once, nothing sent into the thread", async () => {
    stub.reply = verdict({ harassment: true });
    await moderate("you're pathetic and nobody would miss you");
    expect(stub.flags).toEqual([{ messageId: "msg_1", reason: "harassment" }]);
    expect(stub.systemMessages).toHaveLength(0);
  });

  it("a second delivery of the same message spends no model call and sends no second card", async () => {
    stub.reply = verdict({ crisis: "crisis" });
    const { user, args } = await moderate("i have the pills next to me");
    await user.root.action(internal.ai.chat.moderate.moderateChatMessage, args);
    const rows = await user.root.run((ctx) => ctx.db.query("chat_moderation_events").collect());
    expect(rows).toHaveLength(1);
    expect(stub.calls).toBe(1);
    expect(stub.systemMessages).toHaveLength(1);
  });

  it("account deletion takes the verdict rows down with the conversation", async () => {
    stub.reply = verdict({ crisis: "crisis" });
    const { user, args } = await moderate("i have the pills next to me");
    // Loaded late: a static import would resolve before the aggregates mock above.
    const { drainConversations } = await import("../jobs/accountDeletionFinalize");
    await user.root.run((ctx) => drainConversations(ctx, user.profileId));
    expect(await user.root.run((ctx) => ctx.db.get("xolacer_conversations", args.conversationId))).toBeNull();
    expect(await user.root.run((ctx) => ctx.db.query("chat_moderation_events").collect())).toHaveLength(0);
  });
});
