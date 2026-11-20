import { useEffect } from "react";
import { View } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { QUOTE_COPY } from "../copy";
import { EASE, slice, T, useQuoteMotion } from "../motion/quote-motion";
import { QuoteGlass } from "./quote-glass";
import { QuoteIcon, type QuoteIconName } from "./quote-icons";
import { type InkPalette, useQuoteInk } from "./quote-ink";

const PRESSED = 0.92;
const STAR_DIP = 0.78;
const STAR_DIP_AT = 0.35;
const A11Y = QUOTE_COPY.accessibility;

type Props = {
	ink: InkPalette;
	hidden: boolean;
	showPause: boolean;
	showSound: boolean;
	paused: boolean;
	soundOn: boolean;
	saved: boolean;
	locked: boolean;
	onClose: () => void;
	onPause: () => void;
	onSound: () => void;
	onThemes: () => void;
	onStar: () => void;
};

export function QuoteTopBar(p: Props) {
	const m = useQuoteMotion();
	const { plus, plusInk } = useQuoteInk();
	const gone = useSharedValue(p.hidden ? 1 : 0);
	const star = useSharedValue(1);

	useEffect(() => {
		gone.set(
			withTiming(p.hidden ? 1 : 0, { duration: T.chrome, ...PLAY_AS_CHOSEN })
		);
	}, [p.hidden, gone]);
	useEffect(() => {
		if (!p.saved || m.reduced) {
			return;
		}
		const ms = T.starPop;
		const step = { easing: EASE.stage, ...PLAY_AS_CHOSEN };
		star.set(
			withSequence(
				withTiming(STAR_DIP, { duration: ms * STAR_DIP_AT, ...step }),
				withTiming(1, { duration: ms * (1 - STAR_DIP_AT), ...step })
			)
		);
	}, [p.saved, m.reduced, star]);

	const { progress: kb } = useReanimatedKeyboardAnimation();
	const bar = useAnimatedStyle(() => ({
		opacity:
			m.chrome.get() *
			(1 - gone.get()) *
			(1 - kb.get()) *
			slice(m.clock.get(), 0, m.reduced ? T.reduced : T.top),
	}));
	const starStyle = useAnimatedStyle(() => ({
		transform: [{ scale: star.get() }],
	}));

	return (
		<Animated.View
			className="absolute top-safe-offset-[6px] right-4 left-4 flex-row gap-2.5"
			pointerEvents={p.hidden ? "none" : "box-none"}
			style={bar}
		>
			<Round
				icon="close"
				ink={p.ink}
				label={A11Y.close}
				onPress={p.onClose}
				size={18}
			/>
			<View className="flex-1" />
			{p.showSound && (
				<Round
					icon={p.soundOn ? "soundOn" : "soundOff"}
					ink={p.ink}
					label={A11Y.sound(p.soundOn)}
					onPress={p.onSound}
					selected={p.soundOn}
					size={20}
				/>
			)}
			{p.showPause && (
				<Round
					icon={p.paused ? "play" : "pause"}
					ink={p.ink}
					label={A11Y.pause(p.paused)}
					onPress={p.onPause}
					size={16}
				/>
			)}
			<Round
				icon="palette"
				ink={p.ink}
				label={A11Y.background}
				onPress={p.onThemes}
				size={20}
			/>
			<Animated.View style={starStyle}>
				<Round
					filled={p.saved}
					icon="star"
					ink={p.ink}
					label={A11Y.star(p.saved, p.locked)}
					onPress={p.onStar}
					selected={p.saved}
					size={20}
				/>
				{p.locked && (
					<View
						className="absolute -right-[3px] -bottom-[3px] h-[17px] min-w-[17px] items-center justify-center rounded-[9px] px-1"
						pointerEvents="none"
						style={{ backgroundColor: plus }}
					>
						<AppText
							className="text-[11px] leading-[17px]"
							style={{ color: plusInk }}
							variant="caption"
							weight="bold"
						>
							+
						</AppText>
					</View>
				)}
			</Animated.View>
		</Animated.View>
	);
}

function Round(p: {
	ink: InkPalette;
	icon: QuoteIconName;
	size: number;
	label: string;
	onPress: () => void;
	filled?: boolean;
	selected?: boolean;
}) {
	return (
		<PressScale
			accessibilityLabel={p.label}
			accessibilityRole="button"
			accessibilityState={
				p.selected === undefined ? undefined : { selected: p.selected }
			}
			hitSlop={4}
			onPress={p.onPress}
			scaleTo={PRESSED}
		>
			<QuoteGlass
				className="size-11 items-center justify-center rounded-full"
				ink={p.ink}
			>
				<QuoteIcon
					color={p.ink.glassIcon}
					filled={p.filled}
					name={p.icon}
					size={p.size}
				/>
			</QuoteGlass>
		</PressScale>
	);
}
