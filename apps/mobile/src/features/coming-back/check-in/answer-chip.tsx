import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { cn } from "@/lib/cn";
import { useTokenColors } from "@/lib/use-token-color";
import { ANSWER_LABEL, type CheckInPick } from "../copy";

/** Board `.achip`: 36 tall, 12 under the headline; rises from 30 / .9, .45 s from .12 s. */
export const CHIP_GAP = 12;
const T = { at: 120, fade: 250, from: 30, ms: 450, scale: 0.9 } as const;
const EASE = Easing.bezier(0.2, 0.85, 0.25, 1);
const CHIP_TEXT = { fontSize: 14 } as const;
const GLYPH = 14;

/**
 * Board `.a-*` tints, on themed tokens so the chip follows light and dark. Still has no blue
 * wash/ink pair: frost at 14% under a frost icon, the label in foreground.
 */
const CHIP: Record<
	CheckInPick,
	{ bg: string; text: string; icon: IconName; tint: string }
> = {
	heavier: {
		bg: "bg-heavy-wash",
		icon: { android: "rainy", ios: "cloud.drizzle" },
		text: "text-heavy-ink",
		tint: "heavy-ink",
	},
	lighter: {
		bg: "bg-success-wash",
		icon: { android: "light_mode", ios: "sun.max" },
		text: "text-success-ink",
		tint: "success-ink",
	},
	processed: {
		bg: "bg-ember-wash",
		icon: { android: "verified", ios: "checkmark.seal" },
		text: "text-ember-ink",
		tint: "ember-ink",
	},
	still_here: {
		bg: "bg-frost/14",
		icon: { android: "cloud", ios: "cloud" },
		text: "text-foreground",
		tint: "frost",
	},
};

/** Your answer, under the question once you've picked. */
export function AnswerChip({
	picked,
	reduced,
}: {
	picked: CheckInPick | null;
	reduced: boolean;
}) {
	const c = picked ? CHIP[picked] : null;
	const [tint] = useTokenColors([c?.tint ?? "foreground"]);
	const chip = useSharedValue(picked ? 1 : 0);
	const chipFade = useSharedValue(picked ? 1 : 0);

	useEffect(() => {
		if (!picked) {
			return;
		}
		if (reduced) {
			chip.set(1);
			chipFade.set(
				withTiming(1, { duration: REDUCED_FADE_MS, ...PLAY_AS_CHOSEN })
			);
			return;
		}
		chip.set(
			withDelay(
				T.at,
				withTiming(1, { duration: T.ms, easing: EASE, ...PLAY_AS_CHOSEN })
			)
		);
		chipFade.set(
			withDelay(T.at, withTiming(1, { duration: T.fade, ...PLAY_AS_CHOSEN }))
		);
	}, [picked, reduced, chip, chipFade]);

	const chipStyle = useAnimatedStyle(() => ({
		opacity: chipFade.get(),
		transform: [
			{ translateY: T.from * (1 - chip.get()) },
			{ scale: T.scale + (1 - T.scale) * chip.get() },
		],
	}));

	return (
		<View className="ml-5.5 h-9 flex-row" style={{ marginTop: CHIP_GAP }}>
			{c && picked ? (
				<Animated.View
					className={cn(
						"h-9 flex-row items-center gap-[7px] rounded-full pr-3.5 pl-1.5",
						c.bg
					)}
					style={chipStyle}
				>
					<View className="size-6.5 items-center justify-center rounded-full bg-surface/75">
						<Icon color={tint ?? ""} name={c.icon} size={GLYPH} />
					</View>
					<AppText
						className={c.text}
						style={CHIP_TEXT}
						variant="callout"
						weight="bold"
					>
						{ANSWER_LABEL[picked]}
					</AppText>
				</Animated.View>
			) : null}
		</View>
	);
}
