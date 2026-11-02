// The Xolace face in the overall dial. Steadiness shows as calm vs restless motion only; its
// expression never changes with the score (steadiness isn't happiness). Before a score, it
// waits with soft eyes.

import { useIsFocused } from "expo-router/react-navigation";
import { useEffect } from "react";
import { PRESETS, poseForSteadiness } from "@/features/xolace-face/pose";
import { useFace } from "@/features/xolace-face/use-face";
import { XolaceFace } from "@/features/xolace-face/xolace-face";

// It settles into its steadiness pose about when the ticks finish filling.
const SETTLE_MS = 900;

export function SteadinessFace({
	overall,
	size,
}: {
	overall: number | null;
	size: number;
}) {
	// Off screen (a pushed screen, the face sheet over it) its clock stops.
	const face = useFace(PRESETS.waiting, useIsFocused());
	const { to } = face;

	useEffect(() => {
		if (overall === null) {
			return;
		}
		const timer = setTimeout(() => to(poseForSteadiness(overall)), SETTLE_MS);
		return () => clearTimeout(timer);
	}, [overall, to]);

	return <XolaceFace face={face} size={size} />;
}
