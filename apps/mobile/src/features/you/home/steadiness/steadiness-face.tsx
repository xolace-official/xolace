import { useIsFocused } from "expo-router/react-navigation";
import { useEffect } from "react";
import { PRESETS, poseForSteadiness } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";

/** It settles into its steadiness pose about when the ticks finish filling. */
const SETTLE_MS = 900;

/**
 * The Xolace face in the fan, as production's `steadiness-face.tsx` draws it: it waits with
 * soft eyes, then about 900 ms after the score is known takes `poseForSteadiness`. Steadiness
 * shows as calm or restless motion only; the expression never changes with the score
 * (steadiness isn't happiness). Its clock stops off screen.
 */
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
