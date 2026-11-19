import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { QUOTE_COPY } from "../copy";
import { EASE, slice, T, useQuoteMotion } from "../motion/quote-motion";
import { QuoteGlass } from "./quote-glass";
import { QuoteIcon } from "./quote-icons";
import { type InkPalette, textShadow, useQuoteInk } from "./quote-ink";

/** The row sits inset + 62 above the bottom; the link inset + 12. */
const ROW_ABOVE_INSET = 62;
const LINK_ABOVE_INSET = 12;
const HIDE_DROP = 24;
const PRESSED = 0.92;
const A11Y = QUOTE_COPY.accessibility;

type Props = {
	ink: InkPalette;
	hidden: boolean;
	/** When the words end: the actions rise then. */
	arriveAt: number;
	writeLabel: string;
	res: boolean;
	keptCount: number;
	onWrite: () => void;
	onHeart: () => void;
	onShare: () => void;
	onKept: () => void;
};

/** Write back, the heart and share; under them, Words you kept. */
export function QuoteActions(p: Props) {
	const m = useQuoteMotion();
	const { resonate, shadowColor } = useQuoteInk();
	const insets = useSafeAreaInsets();
	const row = useAnimatedStyle(() => {
		const clock = m.clock.get();
		const a = m.reduced
			? slice(clock, 0, T.reduced)
			: slice(clock, p.arriveAt, T.acts.ms, EASE.stage);
		const shown = m.acts.get();
		return {
			opacity: a * shown * m.chrome.get(),
			transform: [
				{
					translateY:
						(m.reduced ? 0 : T.acts.rise * (1 - a)) + HIDE_DROP * (1 - shown),
				},
			],
		};
	});
	const link = useAnimatedStyle(() => {
		const a = m.reduced
			? slice(m.clock.get(), 0, T.reduced)
			: slice(m.clock.get(), p.arriveAt, T.fade);
		return { opacity: a * m.acts.get() * m.chrome.get() };
	});
	const events = p.hidden ? "none" : "box-none";
	const shadow = p.ink.shadow ? textShadow(shadowColor) : null;

	return (
		<>
			<Animated.View
				className="absolute right-0 left-0 flex-row justify-center gap-3"
				pointerEvents={events}
				style={[{ bottom: insets.bottom + ROW_ABOVE_INSET }, row]}
			>
				<PressScale
					accessibilityLabel={p.writeLabel}
					accessibilityRole="button"
					onPress={p.onWrite}
					scaleTo={PRESSED}
				>
					<QuoteGlass
						className="h-13 flex-row items-center gap-[9px] rounded-full px-5.5"
						ink={p.ink}
					>
						<QuoteIcon color={p.ink.glassIcon} name="pencil" size={18} />
						<AppText
							className="text-[15.5px]"
							style={{ color: p.ink.glassIcon }}
							variant="callout"
							weight="semibold"
						>
							{p.writeLabel}
						</AppText>
					</QuoteGlass>
				</PressScale>
				<PressScale
					accessibilityLabel={A11Y.heart(p.res)}
					accessibilityRole="button"
					accessibilityState={{ selected: p.res }}
					onPress={p.onHeart}
					scaleTo={PRESSED}
				>
					<QuoteGlass
						className="size-13 items-center justify-center rounded-full"
						ink={p.ink}
					>
						<QuoteIcon
							color={p.res ? resonate : p.ink.glassIcon}
							filled={p.res}
							name="heart"
							size={22}
						/>
					</QuoteGlass>
				</PressScale>
				<PressScale
					accessibilityLabel={A11Y.share}
					accessibilityRole="button"
					onPress={p.onShare}
					scaleTo={PRESSED}
				>
					<QuoteGlass
						className="size-13 items-center justify-center rounded-full"
						ink={p.ink}
					>
						<QuoteIcon color={p.ink.glassIcon} name="share" size={20} />
					</QuoteGlass>
				</PressScale>
			</Animated.View>
			<Animated.View
				className="absolute right-0 left-0 items-center"
				pointerEvents={events}
				style={[{ bottom: insets.bottom + LINK_ABOVE_INSET }, link]}
			>
				<Pressable
					accessibilityLabel={A11Y.keptLink(p.keptCount)}
					accessibilityRole="button"
					className="h-9 flex-row items-center gap-1.5 px-3.5"
					onPress={p.onKept}
				>
					<AppText
						className="text-[13.5px]"
						style={[{ color: p.ink.text2 }, shadow]}
						variant="footnote"
						weight="medium"
					>
						{QUOTE_COPY.keptLink(p.keptCount)}
					</AppText>
					<View>
						<QuoteIcon color={p.ink.text2} name="chevronRight" size={13} />
					</View>
				</Pressable>
			</Animated.View>
		</>
	);
}
