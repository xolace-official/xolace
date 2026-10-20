import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/**
 * Starts a talk (#592): creates its session, then a single-use WebRTC token
 * for the companion agent (#591). The agent stays private (auth required in
 * its Security tab), so a talk can only start through here, behind auth and
 * Plus. The client hands `{ sessionId, talkKey }` to ElevenLabs as the
 * custom LLM extra body; our endpoint serves only turns that carry them.
 * `msLeft` is the talk's time from the start in its key, relative so the
 * client's own clock skew can't move it; it only drives the on-screen clock.
 *
 * Its own key (ElevenAgents permission only): the Vent/TTS key is scoped
 * without agents access, and should stay that way.
 *
 * The talk's ceiling is reserved from the person's weekly talk time (#596);
 * under 3 min left it throws `talk_time_used`.
 */
export const start = action({
  args: {},
  returns: v.object({ token: v.string(), sessionId: v.id("sessions"), talkKey: v.string(), msLeft: v.number() }),
  handler: async (ctx): Promise<{ token: string; sessionId: Id<"sessions">; talkKey: string; msLeft: number }> => {
    const apiKey = process.env.ELEVENLABS_AGENTS_API_KEY;
    const agentId = process.env.TALK_AGENT_ID;
    if (!apiKey || !agentId) throw new Error("Talk is not configured");

    // The key's secret comes from here, not the mutation: an action's
    // randomness is the real thing. The mutation adds the ceiling it reserved.
    const startedAt = Date.now();
    const { sessionId, talkKey, ceilingS } = await ctx.runMutation(internal.talk.session.start, {
      startedAt,
      secret: crypto.randomUUID(),
    });

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey } },
    );
    if (!res.ok) {
      console.error("[talk] token request failed", res.status, await res.text());
      // Gives the reserved talk time back at once.
      await ctx.runMutation(internal.talk.session.abandon, { sessionId });
      throw new Error("Could not start a talk");
    }
    const { token } = (await res.json()) as { token: string };
    return { token, sessionId, talkKey, msLeft: ceilingS * 1000 - (Date.now() - startedAt) };
  },
});
