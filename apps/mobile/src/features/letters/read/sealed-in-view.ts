import { type ComponentRef, useEffect, useRef } from "react";
import type { LayoutChangeEvent, ScrollView } from "react-native";

const BELOW_FOLD = 72;
type Frame = { y: number; height: number };

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
	const was = useRef(sealed);
	useEffect(() => {
		if (sealed && !was.current) {
			place();
		}
		was.current = sealed;
	});
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
