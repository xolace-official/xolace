import { type ReactNode, useEffect } from "react";
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
import type { NextCards, NextParts } from "../session-end-data";
import { type NextKey, slotEmpty } from "../session-end-model";
import { LAYOUT, REDUCED_MS, T2 } from "../session-look";
import { appear, cardRise } from "../timeline";
import { NextArt, Shimmer } from "./next-art";
import { InsightBody, XolacerBody } from "./next-extras";
import { nextLabel, nextText } from "./next-text";

const N = LAYOUT.next;
const CHEVRON = { android: "chevron_right", ios: "chevron.right" } as const;
const CHEVRON_SCALE = 0.8;
const LABEL_MAX = 1.4;

type Props = {
	k: NextKey;
	cards: NextCards;
	parts: NextParts;
	letterTile: ReactNode;
	c2: SharedValue<number>;
	colors: SessionColors;
	reduced: boolean;
	noneTop: boolean;
	onPress: () => void;
};

export function NextCard({
	k,
	cards,
	parts,
	letterTile,
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
	const text = nextText(k, cards, parts.partName);

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
					accessibilityLabel={nextLabel(k, cards, text)}
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
					<NextArt
						cards={cards}
						colors={colors}
						k={k}
						letterTile={letterTile}
						parts={parts}
						reduced={reduced}
					/>
					{k === "loading" ? (
						<View className="flex-1 gap-[7px]">
							<Shimmer reduced={reduced} width="100%" />
							<Shimmer reduced={reduced} width="70%" />
						</View>
					) : k === "listener" && cards.listener && text ? (
						<XolacerBody listener={cards.listener} title={text.title} />
					) : (k === "unlock" || k === "upsell") && text ? (
						<InsightBody kind={k} text={text} />
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
