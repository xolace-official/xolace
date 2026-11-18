/** Settings › Mirror: what the card, the pills, the orbs and their line show, and what a tap
 * does. Pure. */
import type { Doc } from "@xolace/backend/dataModel";
import { MIRROR_COPY as C, TONES } from "@/features/settings/mirror/copy";
import {
	type TALK_CAST,
	VOICE_OPTIONS,
	type VoiceValue,
} from "@/lib/talk/voice-options";

/** Production's tone ids, as the backend's `mirrorToneValidator` has them. */
export type MirrorTone = Doc<"preferences">["mirrorTone"];
export type VoiceSlug = (typeof TALK_CAST)[number]["value"];

/** Plus, free, or not known yet (production locks nothing and lets no one choose while it loads). */
export type Entitlement = "plus" | "free" | "loading";

export function entitlementOf(
	isPlus: boolean,
	isLoading: boolean
): Entitlement {
	if (isPlus) {
		return "plus";
	}
	return isLoading ? "loading" : "free";
}

/** The server mirrors a free account in Adaptive, whatever is saved (`resolveMirrorTone`). */
export const shownTone = (saved: MirrorTone, plus: Entitlement): MirrorTone =>
	saved === "witnessed" && plus === "free" ? "adaptive" : saved;

/** A free account speaks in its tone's voice, whatever is saved (the generation-time re-check). */
export const shownVoice = (saved: VoiceValue, plus: Entitlement): VoiceValue =>
	plus === "free" ? "auto" : saved;

export const toneById = (id: MirrorTone) =>
	TONES.find((t) => t.id === id) ?? TONES[0];

export const voiceById = (id: VoiceValue) =>
	VOICE_OPTIONS.find((v) => v.value === id) ?? VOICE_OPTIONS[0];

/** The tone's name on the card: "Witnessed · Xolace+". */
export const cardName = (id: MirrorTone) => {
	const t = toneById(id);
	return t.plus ? C.plusName(t.label) : t.label;
};

/**
 * A tone pill's tap: choose it; or, for Witnessed on a free account, show it on the card with
 * the Plus strip and leave the tone as it is (`peek`); while Plus loads, nothing (`wait`).
 */
export function toneTap(
	tone: MirrorTone,
	chosen: MirrorTone,
	plus: Entitlement
): "choose" | "peek" | "wait" | "none" {
	if (!toneById(tone).plus || plus === "plus") {
		return tone === chosen ? "none" : "choose";
	}
	return plus === "free" ? "peek" : "wait";
}

export type OrbTap = {
	/** The voice to save, if this tap saves one. */
	choose: VoiceValue | null;
	preview: { play: VoiceSlug } | "stop";
	/** The voice the line underneath describes; null follows the chosen one. */
	focus: VoiceValue | null;
};

/**
 * A voice orb's tap. Auto: chosen, and any clip stops. A named voice on Plus: chosen and
 * played, or on the chosen one, stopped or played again. Off Plus (or while it loads) it only
 * plays, and the line underneath describes it.
 */
export function orbTap(
	id: VoiceValue,
	s: { voice: VoiceValue; playing: VoiceSlug | null; plus: Entitlement }
): OrbTap {
	if (id === "auto") {
		return {
			choose: s.voice === "auto" ? null : "auto",
			focus: null,
			preview: "stop",
		};
	}
	const toggle = s.playing === id ? "stop" : { play: id };
	if (s.plus !== "plus") {
		return { choose: null, focus: id, preview: toggle };
	}
	if (s.voice === id) {
		return { choose: null, focus: null, preview: toggle };
	}
	return { choose: id, focus: null, preview: { play: id } };
}

/** Talk's voice: picking one plays it; the chosen one, playing, stops (production's picker). */
export const talkTap = (
	id: VoiceSlug,
	s: { voice: VoiceSlug; playing: VoiceSlug | null }
) => ({
	choose: id !== s.voice,
	preview: s.playing === id ? ("stop" as const) : { play: id },
});

/** The line under the orbs: Auto names the tone's voice; a voice, its description. */
export function voiceLine(
	focus: VoiceValue,
	tone: MirrorTone,
	plus: Entitlement
): { name: string; text: string; seePlus: boolean } {
	const v = voiceById(focus);
	if (focus === "auto") {
		return {
			name: v.label,
			seePlus: false,
			text: C.autoLine(toneById(tone).label),
		};
	}
	const locked = plus === "free";
	return {
		name: v.label,
		seePlus: locked,
		text: v.description + (locked ? C.locked : ""),
	};
}

/** A tone pill for VoiceOver: "Witnessed, Xolace+, locked". */
export const toneA11y = (id: MirrorTone, plus: Entitlement) => {
	const t = toneById(id);
	return [
		t.label,
		t.plus && C.plusSpoken,
		t.plus && plus === "free" && "locked",
	]
		.filter(Boolean)
		.join(", ");
};

/** A voice orb for VoiceOver: "Sage, Xolace+" off Plus (the radio state says the rest). */
export const orbA11y = (id: VoiceValue, plus: Entitlement) =>
	id !== "auto" && plus === "free"
		? `${voiceById(id).label}, ${C.plusSpoken}`
		: voiceById(id).label;

/** Which `--color-*` token the card's words take, and what sits under its chip and edge. */
export type CardInk = {
	ink: string;
	/** The light cards (Gentle, Direct by day): the chip is ink at 8%. */
	chip: "on-light" | "on-dark" | "on-direct-dark";
	/** Direct's hairline edge; the coloured cards have none. */
	edge: "on-light" | "on-dark" | null;
};

export function cardInk(tone: MirrorTone, dark: boolean): CardInk {
	if (tone === "gentle") {
		return { chip: "on-light", edge: null, ink: "mirror-ink-gentle" };
	}
	if (tone === "direct") {
		return dark
			? {
					chip: "on-direct-dark",
					edge: "on-dark",
					ink: "mirror-ink-direct-dark",
				}
			: { chip: "on-light", edge: "on-light", ink: "mirror-ink-direct" };
	}
	return { chip: "on-dark", edge: null, ink: "on-art" };
}

/** The pill row opens at its end when the shown tone sits past the edge (Direct, Witnessed). */
const LAST_PILL_IN_VIEW = 3;
export const opensAtEnd = (tone: MirrorTone) =>
	TONES.findIndex((t) => t.id === tone) >= LAST_PILL_IN_VIEW;
