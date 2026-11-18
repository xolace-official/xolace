import MaskedViewClass from "@react-native-masked-view/masked-view";
import type { ComponentType, ReactElement } from "react";
import { View, type ViewProps } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Image, LinearGradient } from "@/components/shared/styled";
import { FONTS } from "@/design/type";
import { STORY } from "../copy";
import { BOARD_TEXT_MAX } from "../first-run-layout";
import { ease, seg } from "../first-run-motion";
import { css, ink, STORY_COLORS } from "../first-run-palette";
import { BeatSection, Figure, useIn } from "./beat-parts";
import { ageOf, bIf, type SEng, WE } from "./story-scene";

const MIRROR = require("@/assets/images/flux/mirror-v2-bg.png");
const F1 = { height: 220, left: 214, top: 382, width: 141 };
const WATER = 598;
const RF = { height: 92, left: 214, top: 599, width: 141 };
// The package's class typings predate React 19's JSX types (as in today/band-blur.tsx).
const MaskedView = MaskedViewClass as unknown as ComponentType<
	ViewProps & { maskElement: ReactElement }
>;

/** 2 · The Mirror: the waterline draws, the reflection reads the feeling back; touch it to ripple. */
export function BeatMirror({ eng }: { eng: SharedValue<SEng> }) {
	const line = useAnimatedStyle(() => {
		const e = eng.get();
		const bb = bIf(e, 1);
		return {
			opacity: e.rm ? 1 : ease(seg(bb, 600, 1100)),
			transform: [{ scaleX: e.rm ? 1 : 0.2 + 0.8 * ease(seg(bb, 600, 1300)) }],
		};
	});
	const reflection = useAnimatedStyle(() => {
		const e = eng.get();
		const bb = bIf(e, 1);
		const ra = ageOf(e, e.ripAt);
		const wob =
			ra >= 0 && !e.rm ? Math.sin(ra / 70) * 5 * (1 - seg(ra, 0, 1100)) : 0;
		return {
			opacity: e.rm ? 1 : ease(seg(bb, 980, 1740)),
			transform: [{ skewX: `${wob}deg` }],
		};
	});
	const words = useAnimatedStyle(() => {
		const e = eng.get();
		const bb = bIf(e, 1);
		const ra = ageOf(e, e.ripAt);
		const swap = e.rm
			? 1
			: Math.min(
					ease(seg(bb, 1500, 1950)),
					1 - Math.sin(Math.PI * seg(ra < 0 ? 99_999 : ra, 0, 500)) * 0.85
				);
		return {
			opacity: swap,
			transform: [
				{ translateY: e.rm ? 0 : 6 * (1 - ease(seg(bb, 1500, 1950))) },
			],
		};
	});
	return (
		<BeatSection eng={eng} i={1}>
			<Figure box={F1} eng={eng} i={1} source={MIRROR} />
			<Animated.View
				className="absolute -left-10 h-px w-[470px]"
				style={[{ backgroundColor: STORY_COLORS.water, top: WATER }, line]}
			/>
			<Animated.View
				className="absolute"
				pointerEvents="none"
				style={[{ ...RF, transformOrigin: "50% 0%" }, reflection]}
			>
				<MaskedView
					maskElement={
						<LinearGradient
							className="flex-1"
							colors={STORY_COLORS.reflectMask}
						/>
					}
					style={{ flex: 1 }}
				>
					<Image
						accessible={false}
						blurRadius={2}
						className="absolute top-0 mt-0 h-55"
						contentFit="contain"
						source={MIRROR}
						style={{ transform: [{ scaleY: -1 }], width: RF.width }}
					/>
				</MaskedView>
			</Animated.View>
			<Animated.View
				className="absolute top-155 left-8 gap-1"
				pointerEvents="none"
				style={words}
			>
				<AppText
					className="text-[10px] uppercase leading-[12px] tracking-[1.8px]"
					maxFontSizeMultiplier={BOARD_TEXT_MAX}
					style={{ color: css(STORY_COLORS.mirrorWord, 0.6) }}
					weight="semibold"
				>
					{STORY.mirrorLabel}
				</AppText>
				<View className="h-7.5">
					{STORY.mirrorWords.map((w, k) => (
						<MirrorWord eng={eng} k={k} key={w} word={w} />
					))}
				</View>
			</Animated.View>
		</BeatSection>
	);
}

function MirrorWord({
	eng,
	k,
	word,
}: {
	eng: SharedValue<SEng>;
	k: number;
	word: string;
}) {
	const style = useAnimatedStyle(() => ({
		opacity: eng.get().mwi === k ? 1 : 0,
	}));
	return (
		<Animated.View className="absolute top-0 left-0" style={style}>
			<AppText
				className="w-75 text-[24px] leading-[30px] tracking-[-0.48px]"
				maxFontSizeMultiplier={BOARD_TEXT_MAX}
				numberOfLines={1}
				style={{
					color: css(STORY_COLORS.mirrorWord),
					fontFamily: FONTS.displaySemi,
				}}
			>
				{word}
			</AppText>
		</Animated.View>
	);
}
