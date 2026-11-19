import { type ComponentRef, useRef } from "react";
import type { LayoutChangeEvent, ScrollView } from "react-native";

/** Under the fold: the seal (34 pt) and the hint 40 pt below it, with room to read. */
const BELOW_FOLD = 72;
type Frame = { y: number; height: number };

/**
 * The sealed letter grows with Dynamic Type, and scrolling is off until it opens: at large sizes
 * its fold and seal could sit under the Open bar. While sealed, the reader scrolls its middle
 * third into view (the seal and the hint under it), never past the top of that third.
 */
export function useSealedInView(sealed: boolean, top: number) {
	const ref = useRef<ComponentRef<typeof ScrollView>>(null);
	const viewport = useRef(0);
	const letter = useRef<Frame | null>(null);
	const place = () => {
		const l = letter.current;
		if (!(sealed && l && viewport.current > 0)) {
			return;
		}
		const third = l.height / 3;
		const need = l.y + third * 2 + BELOW_FOLD - viewport.current;
		const y = Math.max(0, Math.min(need, l.y + third - top));
		ref.current?.scrollTo({ animated: false, y });
	};
	return {
		onLetter: (e: LayoutChangeEvent) => {
			const { y, height } = e.nativeEvent.layout;
			letter.current = { height, y };
			place();
		},
		onViewport: (e: LayoutChangeEvent) => {
			viewport.current = e.nativeEvent.layout.height;
			place();
		},
		ref,
	};
}
