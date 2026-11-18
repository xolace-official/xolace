import { useState } from "react";
import { type SharedValue, useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { COPY } from "@/features/lantern/copy";
import { minutesLeft } from "@/features/lantern/reader/reader-model";

/** Capped like the rest of the bar, so it stays one row. */
const BAR_MAX_SCALE = 1.5;

/** "4 min left", once past the fold. React hears only when the number changes. */
export function MinutesLeft({
	readMin,
	y,
	maxScroll,
	from,
}: {
	readMin: number;
	y: SharedValue<number>;
	maxScroll: number;
	from: number;
}) {
	const [left, setLeft] = useState<number | null>(null);
	useAnimatedReaction(
		() => {
			const v = y.get();
			return v <= from || maxScroll <= 0
				? null
				: minutesLeft(readMin, v, maxScroll);
		},
		(now, prev) => {
			if (now !== prev) {
				scheduleOnRN(setLeft, now);
			}
		}
	);
	if (left === null) {
		return null;
	}
	return (
		<AppText
			className="text-[12px] text-cover-ink/78 leading-[15px]"
			maxFontSizeMultiplier={BAR_MAX_SCALE}
			variant="caption"
			weight="medium"
		>
			{COPY.reader.minutesLeft(left)}
		</AppText>
	);
}
