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
