// How the companion sounds in a talk (#603): voice, pace, directness. Saved
// per person; a talk reads them once, at its start. Also how it looks, and which
// of a talk's two views they last chose.

import { api } from "@xolace/backend/convex/_generated/api";
import {
	TALK_FALLBACK_VOICE,
	type TalkDirectness,
	type TalkLook,
	type TalkPace,
	type TalkView,
	VOICE_CATALOG,
	type VoiceSlug,
} from "@xolace/backend/convex/lib/voices";
import { useQuery } from "convex/react";
import { lookOf } from "@/features/talk/companion/companion-look";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";

export type Directness = TalkDirectness | "balanced";

export function useTalkStyle() {
	const prefs = useQuery(api.preferences.get);
	const update = usePreferenceMutation();
	return {
		directness: prefs?.talkDirectness ?? ("balanced" as const),
		look: lookOf(prefs?.talkLook),
		pace: prefs?.talkPace ?? "normal",
		setDirectness: (d: Directness) =>
			update({ talkDirectness: d === "balanced" ? null : d }),
		setLook: (talkLook: TalkLook) => update({ talkLook }),
		setPace: (talkPace: TalkPace) => update({ talkPace }),
		setView: (talkView: TalkView) => update({ talkView }),
		setVoice: (talkVoice: VoiceSlug) => update({ talkVoice }),
		view: prefs?.talkView ?? ("conversation" as const),
		// Unpicked, it speaks in their mirror voice, else Vesper (the server's order).
		voice: talkVoiceOf(prefs?.talkVoice, prefs?.voice),
	};
}

/** The talk's voice, else their mirror voice, else Vesper. A slug this build doesn't know
 * (a voice added after it shipped) is skipped, so the orb and preview always have one. */
export function talkVoiceOf(
	talkVoice: string | undefined,
	mirrorVoice: string | undefined
): VoiceSlug {
	return [talkVoice, mirrorVoice].find(isVoice) ?? TALK_FALLBACK_VOICE;
}

function isVoice(slug: string | undefined): slug is VoiceSlug {
	return slug !== undefined && Object.hasOwn(VOICE_CATALOG, slug);
}
