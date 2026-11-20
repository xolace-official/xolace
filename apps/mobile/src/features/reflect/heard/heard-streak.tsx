import { useEffect } from "react";
import { View } from "react-native";
import {
	ReduceMotion,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Flame } from "@/components/shared/flame";
import { QUICK_ROLL_MS, RollDigits } from "@/components/shared/roll-digits";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useClock } from "@/lib/motion/clock";
import { COPY } from "../copy";
import { HEARD_MOTION } from "../motion";

/** The flame's ignite (flame.tsx): 0 → 1 over .9 s. */
const IGNITE_MS = 900;
/** The count's line: 15 pt callout, 20 tall. */
const COUNT_LINE = 20;

/**
 * The streak chip under Heard: a lit flame and the day count, which the server has already
 * counted for this session. The flame ignites as the chip arrives.
 */
export function HeardStreak({
	streak,
	live,
	reduced,
}: {
	streak: number;
	live: boolean;
	reduced: boolean;
}) {
	const clock = useClock(live);
	const ignite = useSharedValue(1);

	useEffect(() => {
		if (reduced) {
			ignite.set(1);
			return;
		}
		ignite.set(0);
		ignite.set(
			withDelay(
				HEARD_MOTION.chipDelayMs,
				withTiming(1, { duration: IGNITE_MS, ...PLAY_AS_CHOSEN }),
				ReduceMotion.Never
			)
		);
	}, [reduced, ignite]);

	return (
		<View
			accessibilityLabel={`${streak} ${COPY.heard.days}`}
			accessible
			className="h-[38px] flex-row items-center gap-[5px] rounded-full bg-ember-wash pr-3 pl-[9px]"
		>
			<Flame clock={clock} ignite={ignite} reduced={reduced} running={live} />
			{/* Plain views: the chip rises in, and a SwiftUI-hosted number is left behind by it. */}
			<RollDigits
				className="text-ember-ink tabular-nums"
				durationMs={QUICK_ROLL_MS}
				lineHeight={COUNT_LINE}
				maxScale={1}
				rollIn={false}
				value={streak}
				variant="callout"
				weight="bold"
			/>
			<AppText
				className="ml-0.5 text-[15px]"
				color="emberInk"
				variant="callout"
				weight="semibold"
			>
				{COPY.heard.days}
			</AppText>
		</View>
	);
}
