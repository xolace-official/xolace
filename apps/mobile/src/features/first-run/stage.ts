import { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { stageFor } from "./first-run-layout";
import type { Stage } from "./first-run-motion";

export function useStage(): Stage {
	const { width, height } = useWindowDimensions();
	return stageFor(width, height, useSafeAreaInsets().top);
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
