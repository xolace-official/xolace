import type { Doc } from "@xolace/backend/dataModel";
import { MIRROR_COPY as C, TONES } from "@/features/settings/mirror/copy";
import {
	type TALK_CAST,
	VOICE_OPTIONS,
	type VoiceValue,
} from "@/lib/talk/voice-options";

export type MirrorTone = Doc<"preferences">["mirrorTone"];
export type VoiceSlug = (typeof TALK_CAST)[number]["value"];

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

export const shownTone = (saved: MirrorTone, plus: Entitlement): MirrorTone =>
	saved === "witnessed" && plus === "free" ? "adaptive" : saved;

export const shownVoice = (saved: VoiceValue, plus: Entitlement): VoiceValue =>
	plus === "free" ? "auto" : saved;

export const toneById = (id: MirrorTone) =>
	TONES.find((t) => t.id === id) ?? TONES[0];

export const voiceById = (id: VoiceValue) =>
	VOICE_OPTIONS.find((v) => v.value === id) ?? VOICE_OPTIONS[0];

export const cardName = (id: MirrorTone) => {
	const t = toneById(id);
	return t.plus ? C.plusName(t.label) : t.label;
};

export function toneTap(
	tone: MirrorTone,
	saved: MirrorTone,
	plus: Entitlement
): "choose" | "peek" | "wait" | "none" {
	if (!toneById(tone).plus || plus === "plus") {
		return tone === saved ? "none" : "choose";
	}
	return plus === "free" ? "peek" : "wait";
}

export type OrbTap = {
	choose: VoiceValue | null;
	preview: { play: VoiceSlug } | "stop";
	focus: VoiceValue | null;
};

export function orbTap(
	id: VoiceValue,
	s: {
		voice: VoiceValue;
		saved: { voice: VoiceValue };
		playing: VoiceSlug | null;
		plus: Entitlement;
	}
): OrbTap {
	if (id === "auto") {
		return {
			choose: s.saved.voice === "auto" ? null : "auto",
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

export const talkTap = (
	id: VoiceSlug,
	s: { voice: VoiceSlug; playing: VoiceSlug | null }
) => ({
	choose: id !== s.voice,
	preview: s.playing === id ? ("stop" as const) : { play: id },
});

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

export const orbA11y = (id: VoiceValue, plus: Entitlement) =>
	id !== "auto" && plus === "free"
		? `${voiceById(id).label}, ${C.plusSpoken}`
		: voiceById(id).label;

export type CardInk = {
	ink: string;
	chip: "on-light" | "on-dark" | "on-direct-dark";
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

const LAST_PILL_IN_VIEW = 3;
export const opensAtEnd = (tone: MirrorTone) =>
	TONES.findIndex((t) => t.id === tone) >= LAST_PILL_IN_VIEW;
