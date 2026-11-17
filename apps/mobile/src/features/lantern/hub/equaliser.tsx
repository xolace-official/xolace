import { View } from "react-native";
import { EASING, EaseView } from "@/design/ease";
import { rest } from "@/design/ease-loops";

/** native-cook's `EqualiserBar`, as the board draws it: four bars on their own slow loops. */
const BAR = { gap: 2.5, h: 16, r: 1.5, w: 3 } as const;
const LOW = 0.38;
/** Each bar's full cycle, in ms; their different lengths keep them out of step. */
const PERIODS = [2200, 1900, 2500, 2050] as const;
/** Reduce Motion: the bars stand still at rising heights. */
const STILL = [0.5, 0.625, 0.75, 0.875] as const;

/**
 * The playing mark: bars that rise and fall while a track plays. An Ease loop each (nothing per
 * frame); every other bar starts high, so they never move together. Mount it only while playing.
 */
export function Equaliser({ reduced }: { reduced: boolean }) {
	return (
		<View
			accessibilityElementsHidden
			className="flex-row items-center"
			importantForAccessibility="no-hide-descendants"
			style={{ gap: BAR.gap, height: BAR.h }}
		>
			{PERIODS.map((ms, i) => {
				const [from, to] = i % 2 === 0 ? [LOW, 1] : [1, LOW];
				const ease = reduced
					? rest({ scaleY: STILL[i] })
					: {
							animate: { scaleY: to },
							initialAnimate: { scaleY: from },
							transition: {
								duration: ms / 2,
								easing: EASING.sineInOut,
								loop: "reverse" as const,
								type: "timing" as const,
							},
						};
				return (
					<EaseView
						className="bg-cover-ink"
						key={ms}
						style={{ borderRadius: BAR.r, height: BAR.h, width: BAR.w }}
						{...ease}
					/>
				);
			})}
		</View>
	);
}
