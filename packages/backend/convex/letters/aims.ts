/**
 * Which letter aim a session points to (spec §5.5): the one place the
 * writing screen's "For" list meets the session vocabulary. Pure.
 *
 * The most specific signal wins: the session's own emotion, then its themes,
 * then the emotion's broad family (so `homesickness` with `isolation` reads
 * as loneliness, and `disappointment` alone as low).
 */
import {
	emotionFamily,
	type PrimaryEmotion,
	type ThematicTag,
} from "../lib/understandingVocab";
import type { LetterAim } from "./validators";

const EMOTION_AIM: Partial<Record<PrimaryEmotion, LetterAim>> = {
	anxiety: "anxiety",
	demotivation: "low",
	exhaustion: "sleep",
	fear: "anxiety",
	grief: "grief",
	hopelessness: "low",
	loneliness: "loneliness",
	"not-belonging": "loneliness",
	numbness: "low",
	overwhelm: "anxiety",
	sadness: "low",
	stress: "anxiety",
};

const THEME_AIM: Partial<Record<ThematicTag, LetterAim>> = {
	isolation: "loneliness",
	loss: "grief",
	sleep: "sleep",
};

function aimOf<K extends string>(
	table: Partial<Record<K, LetterAim>>,
	key: string
): LetterAim | undefined {
	return Object.hasOwn(table, key) ? table[key as K] : undefined;
}

export function letterAimOf(metadata: {
	primaryEmotion: string;
	thematicTags: readonly string[];
}): LetterAim | undefined {
	const [own, ...family] = emotionFamily(
		metadata.primaryEmotion.trim().toLowerCase()
	);
	const exact = own === undefined ? undefined : aimOf(EMOTION_AIM, own);
	if (exact) {
		return exact;
	}
	for (const tag of metadata.thematicTags) {
		const aim = aimOf(THEME_AIM, tag.toLowerCase());
		if (aim) {
			return aim;
		}
	}
	for (const parent of family) {
		const aim = aimOf(EMOTION_AIM, parent);
		if (aim) {
			return aim;
		}
	}
	return undefined;
}
