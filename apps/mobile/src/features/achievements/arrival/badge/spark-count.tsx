import { useState } from "react";
import { type SharedValue, useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import {
	age,
	type Eng,
	PH,
	RV,
} from "@/features/achievements/arrival/arrival-motion";
import { COPY } from "@/features/achievements/copy";
import { easeOut, seg } from "@/features/achievements/motion-math";

const SPARKS_COUNT_MS = 700;

/** "+10 sparks", counting up over 700 ms from 760 ms: one small render per number. */
export function SparkCount({
	eng,
	i,
	sparks,
	color,
}: {
	eng: SharedValue<Eng>;
	i: number;
	sparks: number;
	color: string;
}) {
	const [shown, setShown] = useState(sparks);
	useAnimatedReaction(
		() => {
			const e = eng.get();
			if (e.rm || e.phase !== PH.badge || e.step !== i) {
				return sparks;
			}
			const p = easeOut(
				seg(age(e, e.ta), RV.sparks, RV.sparks + SPARKS_COUNT_MS)
			);
			return Math.round(sparks * p);
		},
		(v, was) => {
			if (v !== was) {
				scheduleOnRN(setShown, v);
			}
		}
	);
	return (
		<AppText
			accessibilityElementsHidden
			center
			className="text-[15px] tabular-nums leading-5"
			importantForAccessibility="no-hide-descendants"
			style={{ color }}
			variant="body"
			weight="semibold"
		>
			{COPY.arrival.counting(shown, sparks)}
		</AppText>
	);
}
