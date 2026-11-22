import { useIsFocused } from "expo-router/react-navigation";
import { useEffect } from "react";
import { PRESETS, poseForSteadiness } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";

const SETTLE_MS = 900;

export function SteadinessFace({
	score,
	size,
}: {
	score: number | null;
	size: number;
}) {
	const face = useFace(PRESETS.waiting, useIsFocused());
	const { to } = face;

	useEffect(() => {
		if (score === null) {
			return;
		}
		const timer = setTimeout(() => to(poseForSteadiness(score)), SETTLE_MS);
		return () => clearTimeout(timer);
	}, [score, to]);

	return <XolaceFace face={face} size={size} />;
}
