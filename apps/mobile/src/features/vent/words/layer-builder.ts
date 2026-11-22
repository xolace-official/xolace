export type LayerBuilder<L, F> = {
	laidOut: (layout: L) => void;
	faceLoaded: (face: F) => void;
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
