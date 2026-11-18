import { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BOARD, type Stage } from "./first-run-motion";

export function useStage(): Stage {
	const { width, height } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	return {
		dx: (width - BOARD.w) / 2,
		dy: insets.top - BOARD.status,
		H: height,
		W: width,
	};
}

/**
 * Skia's container hands each recording to the native canvas view when the canvas commits; a
 * commit made before that view registers is dropped and the canvas stays blank until it commits
 * again. When it registers isn't observable (inside a presenting screen, or replacing another;
 * `onLayout` isn't supported on a Canvas), so its child commits again on the next frame, at
 * 300 ms and at 1 s. Use `gen` as the key of the Canvas's child.
 */
const KICKS_MS = [16, 300, 1000] as const;
export function useCanvasKick() {
	const [gen, setGen] = useState(0);
	useEffect(() => {
		const ids = KICKS_MS.map((ms, i) => setTimeout(() => setGen(i + 1), ms));
		return () => {
			for (const id of ids) {
				clearTimeout(id);
			}
		};
	}, []);
	return gen;
}
