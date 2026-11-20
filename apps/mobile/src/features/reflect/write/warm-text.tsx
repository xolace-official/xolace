import { type ReactNode, useEffect, useState } from "react";
import { type TextStyle, View } from "react-native";
import Animated, {
	ReduceMotion,
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColors } from "@/lib/use-token-color";
import { a11yHidden } from "@/lib/utils";
import { SPEAK, WARM } from "../motion";
import { FIELD_TEXT } from "./field-type";

/** Which word (0-based, counting words only) a layer warms, and a stamp that replays it. */
export type Warmth = { word: number; stamp: number };

type Drop = { at: number; n: number; waiting: boolean };

const fade = (ms: number) => ({
	duration: ms,
	easing: WARM.ease,
	...PLAY_AS_CHOSEN,
});

/** Splits text into words and the whitespace between them, numbering the words. */
function tokens(text: string) {
	let n = -1;
	let at = 0;
	return text.split(/(\s+)/).map((t) => {
		const word = t.length > 0 && !/^\s+$/.test(t);
		if (word) {
			n += 1;
		}
		const token = { at, n: word ? n : -1, t };
		at += t.length;
		return token;
	});
}

/** The field's type, unseen: it holds a span's place so the visible ones wrap as the field does. */
function Clear({ children }: { children: string }) {
	return (
		<AppText className="text-transparent" style={FIELD_TEXT} variant="compose">
			{children}
		</AppText>
	);
}

/**
 * The words you see, drawn over a TextInput whose own text is transparent (S1a): each finished
 * word warms to ember with a soft glow, holds .45 s and cools over .4 s. The warm word is drawn
 * in its place on a copy of the paragraph whose other words are clear, and that copy's opacity
 * is its tint; two copies take turns, so a word still cooling isn't cut off by the next.
 *
 * A Plus (Scribe) take's words wait unseen while listening, then arrive as one block from 12 pt
 * above on the underdamped spring (S2: ω 18, ζ .55). An on-device take's words show as they come.
 */
export function WarmText({
	text,
	warm,
	drop,
}: {
	text: string;
	warm: Warmth | null;
	drop: Drop;
}) {
	const [ember, glow] = useTokenColors(["reflect-warm", "reflect-warm-glow"]);
	const [layers, setLayers] = useState<[Warmth | null, Warmth | null]>([
		null,
		null,
	]);
	const tintA = useSharedValue(0);
	const tintB = useSharedValue(0);
	const dropY = useSharedValue(0);
	const dropOpacity = useSharedValue(1);

	// A newly finished word takes the layer the last one didn't, then holds and cools.
	const [seen, setSeen] = useState(-1);
	if (warm && warm.stamp !== seen) {
		setSeen(warm.stamp);
		setLayers((l) => (warm.stamp % 2 === 0 ? [warm, l[1]] : [l[0], warm]));
	}
	useEffect(() => {
		if (!warm) {
			return;
		}
		const [mine, other] =
			warm.stamp % 2 === 0 ? [tintA, tintB] : [tintB, tintA];
		mine.set(1);
		mine.set(
			withDelay(
				WARM.holdMs,
				withTiming(0, fade(WARM.fadeMs)),
				ReduceMotion.Never
			)
		);
		other.set(withTiming(0, fade(WARM.fadeMs)));
	}, [warm, tintA, tintB]);

	useEffect(() => {
		if (drop.n === 0) {
			return;
		}
		dropY.set(-SPEAK.dropFrom);
		dropY.set(withSpring(0, { ...SPEAK.dropSpring, ...PLAY_AS_CHOSEN }));
		dropOpacity.set(0);
		dropOpacity.set(withTiming(1, fade(WARM.fadeMs)));
	}, [drop.n, dropY, dropOpacity]);

	const dropStyle = useAnimatedStyle(() => ({
		opacity: dropOpacity.get(),
		transform: [{ translateY: dropY.get() }],
	}));

	const toks = tokens(text);
	const split = drop.at >= 0 && drop.at <= text.length;
	const warmSpan: TextStyle = {
		...FIELD_TEXT,
		color: ember,
		textShadowColor: glow,
		textShadowRadius: WARM.glowR,
	};
	const warmLayer = (layer: Warmth | null, tint: SharedValue<number>) =>
		layer ? (
			<Tinted tint={tint}>
				{toks.map((k) =>
					k.n === layer.word ? (
						<AppText key={k.at} style={warmSpan} variant="compose">
							{k.t}
						</AppText>
					) : (
						<Clear key={k.at}>{k.t}</Clear>
					)
				)}
			</Tinted>
		) : null;

	return (
		<View
			className="absolute inset-0"
			pointerEvents="none"
			{...a11yHidden(true)}
		>
			<AppText style={FIELD_TEXT} variant="compose">
				{split ? text.slice(0, drop.at) : text}
				{split ? <Clear>{text.slice(drop.at)}</Clear> : null}
			</AppText>
			{split && !drop.waiting ? (
				<Animated.View className="absolute inset-0" style={dropStyle}>
					<AppText style={FIELD_TEXT} variant="compose">
						<Clear>{text.slice(0, drop.at)}</Clear>
						{text.slice(drop.at)}
					</AppText>
				</Animated.View>
			) : null}
			{warmLayer(layers[0], tintA)}
			{warmLayer(layers[1], tintB)}
		</View>
	);
}

/** One warm copy of the paragraph; its opacity is the word's tint. */
function Tinted({
	tint,
	children,
}: {
	tint: SharedValue<number>;
	children: ReactNode;
}) {
	const style = useAnimatedStyle(() => ({ opacity: tint.get() }));
	return (
		<Animated.View className="absolute inset-0" style={style}>
			<AppText
				className="text-transparent"
				style={FIELD_TEXT}
				variant="compose"
			>
				{children}
			</AppText>
		</Animated.View>
	);
}
