import { useTokenColors } from "@/lib/use-token-color";
import type { BodyName } from "./bodies";
import { type FaceColors, faceColors } from "./face-colors";
import type { PaletteName } from "./face-palette";

const TOKENS = [
	"foreground",
	"background",
	"accent",
	"accent-foreground",
	"muted",
	"face-blush",
	"face-brow",
	"face-highlight",
	"face-pupil",
	"face-sclera",
	"face-highlight-clear",
] as const;

export function useFaceColors(
	body: BodyName,
	palette?: PaletteName
): FaceColors {
	const [
		fg,
		bg,
		accent,
		accentFg,
		muted,
		blush,
		brow,
		highlight,
		pupil,
		sclera,
		highlightClear,
	] = useTokenColors(TOKENS);
	return faceColors({
		body,
		palette,
		tokens: {
			accent,
			accentFg,
			bg,
			blush,
			brow,
			fg,
			highlight,
			highlightClear,
			muted,
			pupil,
			sclera,
		},
	});
}
