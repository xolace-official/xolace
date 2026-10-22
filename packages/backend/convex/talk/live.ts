import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";

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
 * Security tab must allow the voice and speed overrides. `firstMessage` is the
 * greeting in the companion's name (#583), for `overrides.agent`; the Security
 * tab must allow the first message override too.
 *
 * `reopen`: "Say more" on that talk's mirror (#604), for up to 5 more minutes.
 */
export const start = action({
	args: { reopen: v.optional(v.id("sessions")) },
	handler: async (
		ctx,
		{ reopen }
	): Promise<{
		token: string;
		sessionId: Id<"sessions">;
		talkKey: string;
		msLeft: number;
		ceilingS: number;
		voiceId: string;
		speed: number;
		firstMessage: string;
	}> => {
		const apiKey = process.env.ELEVENLABS_AGENTS_API_KEY;
		const agentId = process.env.TALK_AGENT_ID;
		if (!(apiKey && agentId)) {
			throw new Error("Talk is not configured");
		}

		// The key's secret comes from here, not the mutation: an action's
		// randomness is the real thing. The mutation adds the ceiling it reserved.
		const startedAt = Date.now();
		const key = { secret: crypto.randomUUID(), startedAt };
		const { sessionId, talkKey, ceilingS, voiceId, speed, firstMessage } =
			reopen
				? await ctx.runMutation(internal.talk.reopen.start, {
						sessionId: reopen,
						...key,
					})
				: await ctx.runMutation(internal.talk.session.start, key);

		let token: string;
		try {
			const res = await fetch(
				`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
				{ headers: { "xi-api-key": apiKey } }
			);
			if (!res.ok) {
				throw new Error(`${res.status} ${await res.text()}`);
			}
			({ token } = (await res.json()) as { token: string });
		} catch (e) {
			console.error("[talk] token request failed", e);
			// Gives the reserved talk time back at once (a reopening goes back to its mirror).
			await ctx.runMutation(internal.talk.session.abandon, { sessionId });
			throw new Error("Could not start a talk");
		}
		return {
			ceilingS,
			firstMessage,
			msLeft: ceilingS * 1000 - (Date.now() - startedAt),
			sessionId,
			speed,
			talkKey,
			token,
			voiceId,
		};
	},
	returns: v.object({
		ceilingS: v.number(),
		firstMessage: v.string(),
		msLeft: v.number(),
		sessionId: v.id("sessions"),
		speed: v.number(),
		talkKey: v.string(),
		token: v.string(),
		voiceId: v.string(),
	}),
});
