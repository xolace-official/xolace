import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { KEYBOARD_GAP } from "@/lib/keyboard/keyboard-lift-math";
import type { TalkGeometry } from "../motion/talk-geometry";
import { LAYOUT } from "../motion/talk-motion";

const MIN_STAGE_SCALE = 64 / LAYOUT.stageFace;
const SWITCH_GAP = 12;
const CAPTION_H = 16 + 6 + 4 * 27;
const COMPOSER_GAP = 12;
const TIGHT_GAP = 14;

export function composerLift(keyboard: number, insetBottom: number) {
	"worklet";
	return Math.max(
		0,
		keyboard + KEYBOARD_GAP - (insetBottom + LAYOUT.composerGap)
	);
}

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
		const captionTop = Math.max(
			top + minFace + TIGHT_GAP,
			Math.min(geo.captionTop, composerTop - COMPOSER_GAP - CAPTION_H)
		);
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
