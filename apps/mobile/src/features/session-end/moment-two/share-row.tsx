import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "../copy";
import type { SessionColors } from "../session-colors";
import { LAYOUT, REDUCED_MS, TS } from "../session-look";
import { clamp01 } from "../timeline";
import { HoldLabels } from "./hold-labels";
import type { Hold, Share } from "./use-send";

const C = LAYOUT.card;
const LABEL_MAX = 1.4;

type Props = {
	hold: Hold;
	share: Share;
	cs: SharedValue<number>;
	colors: SessionColors;
	reduced: boolean;
	onLeave: () => void;
	onKeep: () => void;
};

/**
 * Board `.row`: "Leave it" (ink) and "Not this time" (well), and in the same 46 pt the status once
 * answered: a glowing dot and "Left for someone." as your star lands, or "Kept just for you." Nothing
 * moves. While the card is held, "Leave it" rolls to "Keep holding…", then "Let go".
 */
export function ShareRow({
	hold,
	share,
	cs,
	colors,
	reduced,
	onLeave,
	onKeep,
}: Props) {
	const buttons = useSharedValue(share ? 0 : 1);
	const kept = useSharedValue(share === "no" ? 1 : 0);
	useEffect(() => {
		buttons.set(
			withTiming(share ? 0 : 1, { duration: TS.buttons, ...PLAY_AS_CHOSEN })
		);
		kept.set(
			withTiming(share === "no" ? 1 : 0, {
				duration: TS.status,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [share, buttons, kept]);
	const bt = useAnimatedStyle(() => ({ opacity: buttons.get() }));
	const left = useAnimatedStyle(() => {
		const land = reduced ? TS.reducedLand : TS.land;
		return {
			opacity:
				cs.get() < 0
					? 0
					: clamp01((cs.get() - land) / (reduced ? REDUCED_MS : TS.status)),
		};
	});
	const keptStyle = useAnimatedStyle(() => ({ opacity: kept.get() }));
	const [c0, c1, c2] = colors.you;

	return (
		<View style={{ marginTop: C.rowTop, minHeight: C.row }}>
			<Animated.View
				accessibilityElementsHidden={!!share}
				className="flex-row"
				importantForAccessibility={share ? "no-hide-descendants" : "auto"}
				pointerEvents={share ? "none" : "auto"}
				style={[{ gap: C.gap }, bt]}
			>
				<PressScale
					accessibilityLabel={COPY.share.leave}
					className="flex-1 items-center justify-center overflow-hidden rounded-full bg-foreground"
					onPress={onLeave}
					style={{ minHeight: C.row }}
				>
					<HoldLabels hold={hold} reduced={reduced} />
				</PressScale>
				<PressScale
					accessibilityLabel={COPY.share.keep}
					className="flex-1 items-center justify-center rounded-full bg-surface-secondary"
					onPress={onKeep}
					style={{ minHeight: C.row }}
				>
					<AppText
						maxFontSizeMultiplier={LABEL_MAX}
						style={{ fontSize: C.button }}
						variant="callout"
						weight="semibold"
					>
						{COPY.share.keep}
					</AppText>
				</PressScale>
			</Animated.View>
			{share === "yes" ? (
				<Animated.View
					accessibilityLiveRegion="polite"
					accessible
					className={STATUS}
					style={[STATUS_GAP, left]}
				>
					<View
						className="rounded-full"
						style={{
							boxShadow: `0 0 10px 2px ${colors.dotGlow}`,
							experimental_backgroundImage: `radial-gradient(circle at 38% 34%, ${c0}, ${c1} 48%, ${c2})`,
							height: C.dot,
							width: C.dot,
						}}
					/>
					<AppText
						maxFontSizeMultiplier={LABEL_MAX}
						style={{ fontSize: C.button }}
						variant="callout"
						weight="semibold"
					>
						{COPY.share.left}
					</AppText>
				</Animated.View>
			) : null}
			{share === "no" ? (
				<Animated.View
					accessible
					className={STATUS}
					style={[STATUS_GAP, keptStyle]}
				>
					<AppText
						color="muted"
						maxFontSizeMultiplier={LABEL_MAX}
						style={{ fontSize: C.button }}
						variant="callout"
						weight="medium"
					>
						{COPY.share.kept}
					</AppText>
				</Animated.View>
			) : null}
		</View>
	);
}

const STATUS = "absolute inset-0 flex-row items-center justify-center";
const STATUS_GAP = { gap: C.dotGap } as const;
