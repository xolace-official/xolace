import { View } from "react-native";
import Animated, { Easing } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { fadeUp } from "@/design/entering";
import { playSoftPress } from "@/lib/haptics";
import { COPY } from "../copy";
import { MORPH } from "../motion";
import type { ResourceRow } from "../reflect-model";

/** S11 chip-morph-menu's list: items rise 10 pt over .4 s on bezier(.23,1,.32,1), 150 ms after, 60 ms apart. */
const RISE_EASE = Easing.bezier(0.23, 1, 0.32, 1);
/** The 34 pt pill reaches 44 pt to the finger. */
const PILL_HIT_SLOP = { bottom: 5, top: 5 };

type Props = {
	rows: readonly ResourceRow[];
	onOpen: (row: ResourceRow) => void;
	reduced: boolean;
};

/**
 * People who answer (production's escalation list, from the session): crisis lines first. Each
 * row says what it does, and VoiceOver reads its written-out readout. A row you only read (text)
 * has no verb and isn't a button.
 */
export function Resources({ rows, onOpen, reduced }: Props) {
	return (
		<View className="gap-2">
			{rows.map((row, i) => {
				const act = COPY.care.act[row.kind];
				const opens = act !== "" && row.href !== null;
				return (
					<Animated.View
						className="flex-row items-center gap-3 rounded-[18px] bg-surface-secondary py-3 pr-3 pl-3.5"
						entering={fadeUp(
							MORPH.rowsAfterMs + i * MORPH.rowStaggerMs,
							MORPH.rowMs,
							MORPH.rise,
							reduced,
							RISE_EASE
						)}
						key={row.key}
					>
						<View
							accessibilityLabel={opens ? `${row.name}, ${row.sub}` : row.a11y}
							accessible
							className="flex-1 gap-0.5"
						>
							<AppText
								className="text-[15px]"
								variant="callout"
								weight="semibold"
							>
								{row.name}
							</AppText>
							<AppText
								className="text-[12.5px]"
								color="muted"
								variant="caption"
							>
								{row.sub}
							</AppText>
						</View>
						{opens ? (
							<PressScale
								accessibilityLabel={row.a11y}
								accessibilityRole={row.kind === "url" ? "link" : "button"}
								className="h-8.5 justify-center rounded-full bg-danger-wash px-3.5"
								haptic={playSoftPress}
								hitSlop={PILL_HIT_SLOP}
								onPress={() => onOpen(row)}
							>
								<AppText
									className="text-[13.5px]"
									color="dangerInk"
									variant="footnote"
									weight="semibold"
								>
									{act}
								</AppText>
							</PressScale>
						) : null}
					</Animated.View>
				);
			})}
		</View>
	);
}
