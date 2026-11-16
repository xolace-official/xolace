import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import type { SessionColors } from "../session-colors";
import type { ListenerCard } from "../session-end-data";
import { type NextKey, slotEmpty } from "../session-end-model";
import { LAYOUT, REDUCED_MS, T2 } from "../session-look";
import { appear, cardRise } from "../timeline";
import { NextArt, Shimmer } from "./next-art";

const N = LAYOUT.next;
const CHEVRON = { android: "chevron_right", ios: "chevron.right" } as const;
const CHEVRON_SCALE = 0.8;
const LABEL_MAX = 1.4;

/** The card's title and sub for a key; null while loading or empty. */
function textOf(
	k: NextKey,
	listener: ListenerCard | null
): { title: string; sub: string } | null {
	if (k === "listener" && listener) {
		return {
			sub: COPY.next.listener.sub,
			title: COPY.next.listener.title(listener.name, listener.listensTo),
		};
	}
	if (
		k === "kindling" ||
		k === "kindlingSettingUp" ||
		k === "kfree" ||
		k === "listen"
	) {
		return COPY.next[k];
	}
	return null;
}

type Props = {
	k: NextKey;
	listener: ListenerCard | null;
	c2: SharedValue<number>;
	colors: SessionColors;
	reduced: boolean;
	/** Nothing to share: the label sits a little lower (board `.nxl` 30). */
	noneTop: boolean;
	onPress: () => void;
};

/**
 * One next step (board `.nxl`, `.nxc`): "Next, if you want it", then one 76 pt
 * card. With nothing to offer, the label and the slot fade away (.35 s, 6 pt
 * down) and the pinned buttons don't move. VoiceOver: one button, title then sub.
 */
export function NextCard({
	k,
	listener,
	c2,
	colors,
	reduced,
	noneTop,
	onPress,
}: Props) {
	const line = useTokenColor("separator");
	const subtle = useTokenColor("subtle");
	const empty = slotEmpty(k);
	const gone = useSharedValue(empty ? 1 : 0);
	useEffect(() => {
		gone.set(
			withTiming(empty ? 1 : 0, {
				duration: reduced ? REDUCED_MS : T2.none.ms,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [empty, reduced, gone]);
	const label = useAnimatedStyle(() => ({
		opacity:
			appear(c2.get(), T2.nextLabel.at, T2.nextLabel.ms, reduced).opacity *
			(1 - gone.get()),
		transform: [{ translateY: reduced ? 0 : T2.none.drop * gone.get() }],
	}));
	const card = useAnimatedStyle(() => {
		const r = cardRise(
			c2.get(),
			T2.next.at,
			T2.next.ms,
			T2.next.rise,
			0.4,
			reduced
		);
		const drop = reduced ? 0 : T2.none.drop * gone.get();
		return {
			opacity: r.opacity * (1 - gone.get()),
			transform: [{ translateY: r.transform[0].translateY + drop }],
		};
	});
	const text = textOf(k, listener);

	return (
		<View
			accessibilityElementsHidden={empty}
			importantForAccessibility={empty ? "no-hide-descendants" : "auto"}
			pointerEvents={empty ? "none" : "auto"}
		>
			<Animated.View
				style={[
					{
						marginHorizontal: N.labelSide,
						marginTop: noneTop ? N.labelNoneTop : N.labelTop,
					},
					label,
				]}
			>
				<AppText
					className="leading-[18px]"
					color="muted"
					maxFontSizeMultiplier={LABEL_MAX}
					style={{ fontSize: N.label }}
					variant="footnote"
					weight="semibold"
				>
					{COPY.nextLabel}
				</AppText>
			</Animated.View>
			<Animated.View style={[{ marginTop: N.top }, card]}>
				<PressScale
					accessibilityLabel={
						text ? `${text.title}. ${text.sub}` : COPY.next.loading
					}
					card
					className="flex-row items-center border-continuous bg-surface py-2"
					disabled={!text}
					haptic={playSoftPress}
					onPress={onPress}
					style={{
						borderRadius: N.radius,
						boxShadow: `0 0 0 1px ${line}`,
						gap: N.gap,
						minHeight: N.height,
						paddingHorizontal: N.padX,
					}}
				>
					<NextArt colors={colors} k={k} listener={listener} />
					{k === "loading" ? (
						<View className="flex-1 gap-[7px]">
							<Shimmer reduced={reduced} width="100%" />
							<Shimmer reduced={reduced} width="70%" />
						</View>
					) : (
						<View className="min-w-0 flex-1 gap-0.5">
							<AppText
								style={{ fontSize: N.title, lineHeight: N.titleLine }}
								variant="subhead"
								weight="semibold"
							>
								{text?.title}
							</AppText>
							<AppText
								color={k === "kfree" ? "accentInk" : "muted"}
								numberOfLines={1}
								style={{ fontSize: N.sub, lineHeight: N.subLine }}
								variant="detail"
							>
								{text?.sub}
							</AppText>
						</View>
					)}
					{k === "loading" ? null : (
						<Icon
							color={subtle}
							name={CHEVRON}
							size={N.chevron * CHEVRON_SCALE}
							style={{ height: N.chevron, width: N.chevron }}
							weight="semibold"
						/>
					)}
				</PressScale>
			</Animated.View>
		</View>
	);
}
