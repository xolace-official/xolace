import { useEffect } from "react";
import Animated, {
	Easing,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { FLASH, WRITE_IN } from "../motion";
import type { Seg } from "../reflect-model";
import { QUOTE_TEXT } from "../your-words";
import { progress } from "./curves";

export type Band = {
	key: string;
	pair: number;
	x: number;
	y: number;
	w: number;
	h: number;
};
/** Board `.mk`: the band fills 70% of the line, its bottom at 88% (so from 26.4% down). */
const BAND_TOP = 0.264;
const BAND_H = 0.7;
const BAND_GROW = Easing.bezierFn(0.3, 0, 0.2, 1);
export const QUOTE_LINES = 4;

type BandProps = {
	band: Band;
	e: SharedValue<number>;
	at: number;
	/** Bumped when a line borrowing this phrase is tapped (0: never). */
	flashN: number;
	flashColor: string;
};

/** A marker band under one phrase's run on one line: it grows left to right in its turn (.45 s). */
export function MarkBand({ band, e, at, flashN, flashColor }: BandProps) {
	const flash = useSharedValue(0);
	useEffect(() => {
		if (!flashN) {
			return;
		}
		flash.set(
			withSequence(
				withTiming(1, { duration: FLASH.outMs, ...PLAY_AS_CHOSEN }),
				withTiming(0, { duration: FLASH.fadeMs, ...PLAY_AS_CHOSEN })
			)
		);
	}, [flashN, flash]);
	const grow = useAnimatedStyle(() => ({
		transform: [
			{ scaleX: BAND_GROW(progress(e.get(), at, WRITE_IN.band)) },
			{ scaleY: 1 + FLASH.grow * flash.get() },
		],
	}));
	const lit = useAnimatedStyle(() => ({ opacity: flash.get() }));
	const box = {
		height: band.h * BAND_H,
		left: band.x,
		top: band.y + band.h * BAND_TOP,
		transformOrigin: "0% 50%",
		width: band.w,
	} as const;
	return (
		<Animated.View className="absolute rounded-[3px] bg-mk" style={[box, grow]}>
			<Animated.View
				className="absolute inset-0 rounded-[3px]"
				style={[{ backgroundColor: flashColor }, lit]}
			/>
		</Animated.View>
	);
}

type InkProps = {
	segs: readonly Seg[];
	pair: number;
	e: SharedValue<number>;
	at: number;
};

/** The phrase turns ink as its band grows: a copy of the paragraph showing only that phrase. */
export function InkPhrase({ segs, pair, e, at }: InkProps) {
	const style = useAnimatedStyle(() => ({
		opacity: progress(e.get(), at, WRITE_IN.band),
	}));
	return (
		<Animated.View
			accessibilityElementsHidden
			className="absolute inset-0"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={style}
		>
			<AppText numberOfLines={QUOTE_LINES} style={QUOTE_TEXT} variant="callout">
				{segs.map(([s, p], i) => (
					<AppText
						className={p === pair ? undefined : "text-transparent"}
						key={i}
						style={QUOTE_TEXT}
						variant="callout"
					>
						{s}
					</AppText>
				))}
			</AppText>
		</Animated.View>
	);
}
