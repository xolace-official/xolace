import { useEffect, useRef } from "react";
import { type LayoutRectangle, PixelRatio, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { BODY_MAX_SCALE } from "@/design/type";
import { useVentScreen } from "@/features/vent/vent-data";
import { LitWord } from "@/features/vent/words/lit-word";

/** Centred, 48 pt sides, 17 pt on a 25 pt line, 5 pt between words (handoff §9). */
const SIDE = 48;
const FONT = 17;
const LINE = 25;
const GAP = 5;
const SIDES = { left: SIDE, right: SIDE } as const;
const WORD_GAP = { columnGap: GAP } as const;

/**
 * The reply, lit as it's spoken (v2): each word catches amber when the voice reaches it, then
 * cools to cream. Its layout is reported once, so the burn can draw the same words in the same
 * places. One accessible element; the flow announces it once the voice has finished.
 */
export function ReplyWords() {
	const { state, actions } = useVentScreen();
	const { words, starts } = state.reply;
	const shown = state.field.wordsShown;
	const k = Math.min(PixelRatio.getFontScale(), BODY_MAX_SCALE);
	const wrap = useRef<LayoutRectangle | null>(null);
	const boxes = useRef<(LayoutRectangle | null)[]>(words.map(() => null));
	const sent = useRef(false);
	const style = useAnimatedStyle(() => ({ opacity: shown.get() }));

	const report = () => {
		const w = wrap.current;
		if (sent.current || !w || boxes.current.some((b) => b === null)) {
			return;
		}
		sent.current = true;
		const rects = boxes.current.map((b, i) => ({
			h: b?.height ?? 0,
			w: b?.width ?? 0,
			word: words[i] ?? "",
			x: w.x + (b?.x ?? 0),
			y: w.y + (b?.y ?? 0),
		}));
		actions.onWordsLaidOut(rects, FONT * k, LINE * k);
	};
	useEffect(() => {
		report();
	});

	return (
		<Animated.View
			className="absolute inset-y-0 z-3 justify-center"
			pointerEvents="none"
			style={[SIDES, style]}
		>
			<View
				accessibilityLabel={words.join(" ")}
				accessible
				className="flex-row flex-wrap content-center justify-center"
				onLayout={(e) => {
					const l = e.nativeEvent.layout;
					wrap.current = { ...l, x: l.x + SIDE };
					report();
				}}
				style={WORD_GAP}
			>
				{words.map((word, i) => (
					<LitWord
						fontSize={FONT}
						key={`${i}-${word}`}
						lineHeight={LINE}
						onLayout={(b) => {
							boxes.current[i] = b;
							report();
						}}
						reduced={state.reduced}
						startMs={starts?.[i] ?? null}
						word={word}
					/>
				))}
			</View>
		</Animated.View>
	);
}
