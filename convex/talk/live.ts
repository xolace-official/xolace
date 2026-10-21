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
 *
 * `voiceId` and `speed` are this talk's voice and pace (#603), for the
 * client's `overrides.tts`; they're fixed once the talk starts. The agent's
 * Security tab must allow the voice and speed overrides.
 *
 * `reopen`: "Say more" on that talk's mirror (#604), for up to 5 more minutes.
 */
export const start = action({
  args: { reopen: v.optional(v.id("sessions")) },
  returns: v.object({
    token: v.string(),
    sessionId: v.id("sessions"),
    talkKey: v.string(),
    msLeft: v.number(),
    ceilingS: v.number(),
    voiceId: v.string(),
    speed: v.number(),
  }),
  handler: async (
    ctx,
    { reopen },
  ): Promise<{ token: string; sessionId: Id<"sessions">; talkKey: string; msLeft: number; ceilingS: number; voiceId: string; speed: number }> => {
    const apiKey = process.env.ELEVENLABS_AGENTS_API_KEY;
    const agentId = process.env.TALK_AGENT_ID;
    if (!apiKey || !agentId) throw new Error("Talk is not configured");

    // The key's secret comes from here, not the mutation: an action's
    // randomness is the real thing. The mutation adds the ceiling it reserved.
    const startedAt = Date.now();
    const key = { startedAt, secret: crypto.randomUUID() };
    const { sessionId, talkKey, ceilingS, voiceId, speed } = reopen
      ? await ctx.runMutation(internal.talk.reopen.start, { sessionId: reopen, ...key })
      : await ctx.runMutation(internal.talk.session.start, key);

    let token: string;
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
        { headers: { "xi-api-key": apiKey } },
      );
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      ({ token } = (await res.json()) as { token: string });
    } catch (e) {
      console.error("[talk] token request failed", e);
      // Gives the reserved talk time back at once (a reopening goes back to its mirror).
      await ctx.runMutation(internal.talk.session.abandon, { sessionId });
      throw new Error("Could not start a talk");
    }
    return { token, sessionId, talkKey, msLeft: ceilingS * 1000 - (Date.now() - startedAt), ceilingS, voiceId, speed };
  },
});
