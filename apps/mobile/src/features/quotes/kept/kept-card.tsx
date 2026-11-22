import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { LinearGradient } from "@/components/shared/styled";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { BackgroundLayer } from "../background/background-layer";
import { QuoteGlass } from "../chrome/quote-glass";
import { textShadow, useQuoteInk } from "../chrome/quote-ink";
import { QUOTE_COPY } from "../copy";
import { EASE, T } from "../motion/quote-motion";
import type { KeptCard as Card, QuoteBackground } from "../quotes-model";
import { scrimOf } from "../quotes-palette";
import { POSTER_MEDIUM } from "../stage/quote-type";

export const CARD = { h: 430, radius: 30, w: 300 } as const;
export const CARD_IN_STACK = 16;
const STEP = { scale: 0.06, y: 14 } as const;
const GONE = { rotate: -8, x: -1.25 } as const;
const BEHIND_SHOWN = 2;
const CARD_DROP = 0.55;

export function KeptCard({
	card,
	background,
	d,
	left,
	reduced,
}: {
	card: Card;
	background: QuoteBackground;
	d: number;
	left: number;
	reduced: boolean;
}) {
	const q = useQuoteInk();
	const ink = q.inks[background.ink];
	const gradient = scrimOf(background);
	const pos = useSharedValue(d);
	useEffect(() => {
		pos.set(
			withTiming(d, {
				duration: reduced ? T.reduced : T.card,
				easing: EASE.stage,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [d, reduced, pos]);
	const style = useAnimatedStyle(() => {
		const p = pos.get();
		if (p < 0) {
			const g = Math.min(1, -p);
			return {
				opacity: 1 - g,
				transform: [
					{ translateX: GONE.x * CARD.w * g },
					{ translateY: 0 },
					{ rotate: `${GONE.rotate * g}deg` },
					{ scale: 1 },
				],
			};
		}
		const s = Math.min(p, BEHIND_SHOWN);
		return {
			opacity: p > BEHIND_SHOWN ? Math.max(0, BEHIND_SHOWN + 1 - p) : 1,
			transform: [
				{ translateX: 0 },
				{ translateY: -STEP.y * s },
				{ rotate: "0deg" },
				{ scale: 1 - STEP.scale * s },
			],
		};
	});
	const kept = QUOTE_COPY.keptWith(background.name);
	return (
		<Animated.View
			accessibilityElementsHidden={d !== 0}
			accessibilityLabel={`${card.day}. ${card.text}. ${kept}`}
			accessible={d === 0}
			className="absolute"
			importantForAccessibility={d === 0 ? "yes" : "no-hide-descendants"}
			style={[
				{
					height: CARD.h,
					left,
					shadowColor: q.drop,
					shadowOffset: { height: 18, width: 0 },
					shadowOpacity: CARD_DROP,
					shadowRadius: 20,
					top: CARD_IN_STACK,
					width: CARD.w,
					zIndex: 10 - Math.abs(d),
				},
				style,
			]}
		>
			<View
				className="flex-1 overflow-hidden border-[0.5px] border-continuous border-white/20"
				style={{ borderRadius: CARD.radius }}
			>
				<BackgroundLayer background={background} play={false} />
				{gradient && (
					<LinearGradient
						className="absolute inset-0"
						colors={gradient.colors}
						locations={gradient.locations}
					/>
				)}
				<QuoteGlass
					className="absolute top-3.5 left-3.5 h-7 justify-center rounded-full px-[11px]"
					ink={ink}
				>
					<AppText
						className="text-[12px]"
						style={{ color: ink.glassIcon }}
						variant="caption"
						weight="semibold"
					>
						{card.day}
					</AppText>
				</QuoteGlass>
				<AppText
					allowFontScaling={false}
					className="absolute right-5.5 bottom-12.5 left-5.5 text-[25px] leading-[29px] tracking-[-0.5px]"
					numberOfLines={9}
					style={[
						{ color: ink.text, fontFamily: POSTER_MEDIUM },
						ink.shadow ? textShadow(q.shadowColor) : null,
					]}
					variant="poster"
				>
					{card.text}
				</AppText>
				<AppText
					className="absolute bottom-5.5 left-5.5 text-[12px]"
					style={{ color: ink.text2 }}
					variant="caption"
					weight="medium"
				>
					{kept}
				</AppText>
			</View>
		</Animated.View>
	);
}
