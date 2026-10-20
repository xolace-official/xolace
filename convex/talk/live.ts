import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAuth } from "../lib/auth";
import { requirePremium } from "../lib/premium";

export const assertCanTalk = internalQuery({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    await requirePremium(ctx, profile, "talk");
    return null;
  },
});

/**
 * A single-use WebRTC token for the companion agent (#591). The agent stays
 * private (auth required in its Security tab), so a talk can only start
 * through here, behind auth and Plus.
 *
 * Its own key (ElevenAgents permission only): the Vent/TTS key is scoped
 * without agents access, and should stay that way.
 *
 * ponytail: no usage cap or talk ledger yet; a Plus tester can talk until
 * the agent's 1,560 s backstop. The weekly cap ticket adds the reserve here.
 */
export const conversationToken = action({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    await ctx.runQuery(internal.talk.live.assertCanTalk, {});
    const apiKey = process.env.ELEVENLABS_AGENTS_API_KEY;
    const agentId = process.env.TALK_AGENT_ID;
    if (!apiKey || !agentId) throw new Error("Talk is not configured");

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey } },
    );
    if (!res.ok) {
      console.error("[talk] token request failed", res.status, await res.text());
      throw new Error("Could not start a talk");
    }
    const { token } = (await res.json()) as { token: string };
    return token;
  },
});
