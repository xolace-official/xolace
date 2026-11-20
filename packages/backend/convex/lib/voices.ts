import { type Infer, v } from "convex/values";

import { TALK_FALLBACK_VOICE, type VoiceSlug } from "./shared";

export { TALK_FALLBACK_VOICE, type VoiceSlug };

// Client-facing slugs only; the raw ElevenLabs ids are in elevenLabsVoices.ts.
// Slugs are permanent once shipped (docs/voice-naming.md).

export const voiceSlugValidator = v.union(
	v.literal("sage"),
	v.literal("wren"),
	v.literal("vesper"),
	v.literal("ash")
);

// The companion in a talk (#603, decided in #583): its own voice from the
// cast, the person's mirror/vent voice when unset, else Vesper. Pace is the
// agent's `speed` override; directness a line in our prompt. All three are
// fixed for the length of a talk.

export const talkPaceValidator = v.union(
	v.literal("slower"),
	v.literal("normal")
);
export type TalkPace = Infer<typeof talkPaceValidator>;
export const TALK_SPEED: Record<TalkPace, number> = {
	normal: 1.0,
	slower: 0.85,
};

// Unset sits between the two: no prompt line.
export const talkDirectnessValidator = v.union(
	v.literal("gentle"),
	v.literal("straight")
);
export type TalkDirectness = Infer<typeof talkDirectnessValidator>;

// How the companion looks (Talk's voice-and-look sheet): a preset by name, never the
// drawing, so the drawing stays ours to change. Unset = "xolace", the brand flame.
export const talkLookValidator = v.union(
	v.literal("xolace"),
	v.literal("tide"),
	v.literal("moss"),
	v.literal("dusk"),
	v.literal("ember"),
	v.literal("theme"),
	v.literal("chalk")
);
export type TalkLook = Infer<typeof talkLookValidator>;

// Which of a talk's two views shows: the transcript, or the companion large.
// Unset = "conversation".
export const talkViewValidator = v.union(
	v.literal("conversation"),
	v.literal("companion")
);
export type TalkView = Infer<typeof talkViewValidator>;
