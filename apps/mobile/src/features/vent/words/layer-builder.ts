/**
 * When to draw the reply into the burn image (`word-layer.ts`). The image needs the words' layout
 * and the theme's body face, which Skia loads from its asset and may not have yet. So it is drawn
 * as soon as the words are laid out (with whatever face is there), and drawn again once if the
 * face arrives later, unless the words have already started to burn: then the image they burn
 * from stays as it is.
 */
export type LayerBuilder<L, F> = {
	laidOut: (layout: L) => void;
	faceLoaded: (face: F) => void;
	/** The words have started to burn. */
	burning: () => void;
};

export function layerBuilder<L, F>(
	build: (layout: L, face: F | null) => void
): LayerBuilder<L, F> {
	let layout: L | null = null;
	let face: F | null = null;
	let builtWithFace = false;
	let locked = false;
	const draw = () => {
		if (layout === null) {
			return;
		}
		builtWithFace = face !== null;
		build(layout, face);
	};
	return {
		burning: () => {
			locked = true;
		},
		faceLoaded: (next) => {
			face = next;
			if (!(locked || builtWithFace)) {
				draw();
			}
		},
		laidOut: (next) => {
			layout = next;
			draw();
		},
	};
}
