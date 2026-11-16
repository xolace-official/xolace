import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { KEYBOARD_GAP } from "@/lib/keyboard/keyboard-lift-math";
import type { TalkGeometry } from "../motion/talk-geometry";
import { LAYOUT } from "../motion/talk-motion";

/** Production's smallest stage face when the keyboard leaves little room. */
const MIN_STAGE_SCALE = 64 / LAYOUT.stageFace;
/** The face's top never comes closer than this to the switch's bottom. */
const SWITCH_GAP = 12;
/** The caption's room: its name (16 + 6) and at most four lines of 27 (`stage/talk-stage.tsx`). */
const CAPTION_H = 16 + 6 + 4 * 27;
/** The caption's last line keeps this much air above the composer. */
const COMPOSER_GAP = 12;
/** With no room for the presence word, the caption sits this close under the face. */
const TIGHT_GAP = 14;

/** How far the keyboard lifts the composer from its place 8 pt above the safe area. */
export function composerLift(keyboard: number, insetBottom: number) {
	"worklet";
	return Math.max(
		0,
		keyboard + KEYBOARD_GAP - (insetBottom + LAYOUT.composerGap)
	);
}

/**
 * Where the stage sits as the keyboard rises, frame by frame on its curve. The stage lives
 * in the band between the switch and the composer: the caption keeps its full four lines
 * just above the composer, and the face shrinks (to production's 64 pt at the least) into
 * what's left above it. On a short phone the presence word folds away before the face would
 * reach the switch. With the keyboard down it's the board's layout exactly. Shared by the
 * hero, the presence word and the caption.
 */
export function useStageFrame(
	geo: TalkGeometry,
	keyboard: SharedValue<number>
) {
	const half = LAYOUT.stageFace / 2;
	const minFace = MIN_STAGE_SCALE * LAYOUT.stageFace;
	const toPresence = LAYOUT.captionBelow - LAYOUT.presenceBelow;
	const underFace = LAYOUT.presenceBelow - half;
	const roomy = underFace + toPresence;
	const top = geo.switchTop + LAYOUT.switchH + SWITCH_GAP;
	return useDerivedValue(() => {
		const lift = composerLift(keyboard.get(), geo.insets.bottom);
		const composerTop = geo.composerTop - lift;
		// The face's smallest stack, with no presence word, decides the caption's highest place.
		const captionTop = Math.max(
			top + minFace + TIGHT_GAP,
			Math.min(geo.captionTop, composerTop - COMPOSER_GAP - CAPTION_H)
		);
		// 1 while the presence word fits under a 64 pt face, folding to 0 as the room runs out.
		const room = captionTop - top - minFace;
		const presence = Math.min(
			1,
			Math.max(0, (room - TIGHT_GAP) / (roomy - TIGHT_GAP))
		);
		const faceBottom =
			captionTop - (TIGHT_GAP + (roomy - TIGHT_GAP) * presence);
		const scale = Math.max(
			MIN_STAGE_SCALE,
			Math.min(1, (faceBottom - top) / LAYOUT.stageFace)
		);
		return {
			captionTop,
			lift,
			presence,
			presenceTop: faceBottom + underFace,
			scale,
			y: faceBottom - half * scale,
		};
	});
}

export type StageFrame = ReturnType<typeof useStageFrame>;
