import { useState } from "react";
import { type TextLayoutEvent, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { type InkPalette, textShadow } from "../chrome/quote-ink";
import { EASE, slice, T, useQuoteMotion } from "../motion/quote-motion";
import { numberWords } from "../quotes-model";
import { POSTER_MEDIUM } from "./quote-type";

type TextLayoutLine = TextLayoutEvent["nativeEvent"]["lines"][number];

const TRACKING = -0.02;
const WORD_GAP = 0.24;
const BALANCE_SLACK = 1.06;

type Props = {
	text: string;
	size: number;
	lineHeight: number;
	width: number;
	ink: InkPalette;
	shadowColor: string;
};

export function QuoteWords({
	text,
	size,
	lineHeight,
	width,
	ink,
	shadowColor,
}: Props) {
	const [lines, setLines] = useState<string[] | null>(null);
	const [pass, setPass] = useState<{ width: number; full: string[] } | null>(
		null
	);
	const style = {
		fontFamily: POSTER_MEDIUM,
		fontSize: size,
		letterSpacing: size * TRACKING,
		lineHeight: Math.round(size * lineHeight),
	};

	const onFull = (all: TextLayoutLine[]) => {
		if (all.length <= 1) {
			setLines([text]);
			return;
		}
		const total = all.reduce((w, l) => w + l.width, 0);
		setPass({
			full: all.map((l) => l.text.trim()),
			width: Math.min(width, Math.ceil((total / all.length) * BALANCE_SLACK)),
		});
	};
	const onBalanced = (all: TextLayoutLine[]) => {
		if (!pass) {
			return;
		}
		setLines(
			all.length === pass.full.length
				? all.map((l) => l.text.trim())
				: pass.full
		);
	};

	if (!lines) {
		return (
			<View
				accessibilityElementsHidden
				className="absolute opacity-0"
				pointerEvents="none"
				style={{ width }}
			>
				<AppText
					allowFontScaling={false}
					onTextLayout={(e) => !pass && onFull(e.nativeEvent.lines)}
					style={[style, { width }]}
					variant="poster"
				>
					{text}
				</AppText>
				{pass && (
					<AppText
						allowFontScaling={false}
						className="absolute"
						onTextLayout={(e) => onBalanced(e.nativeEvent.lines)}
						style={[style, { width: pass.width }]}
						variant="poster"
					>
						{text}
					</AppText>
				)}
			</View>
		);
	}

	const shadow = ink.shadow ? textShadow(shadowColor) : null;
	const wordStyle = [style, { color: ink.text }, shadow];
	return (
		<View className="items-center" style={{ width }}>
			{numberWords(lines).map((line, li) => (
				<View
					className="flex-row justify-center"
					key={`${li}-${lines[li]}`}
					style={{ gap: size * WORD_GAP }}
				>
					{line.map(({ index, word }) => (
						<Word
							index={index}
							key={`${index}-${word}`}
							style={wordStyle}
							word={word}
						/>
					))}
				</View>
			))}
		</View>
	);
}

function Word({
	word,
	index,
	style,
}: {
	word: string;
	index: number;
	style: object;
}) {
	const m = useQuoteMotion();
	const anim = useAnimatedStyle(() => {
		const clock = m.clock.get();
		if (m.reduced) {
			return {
				opacity: slice(clock, 0, T.reduced),
				transform: [{ translateY: 0 }],
			};
		}
		const p = slice(
			clock,
			T.word.at + index * T.word.gap,
			T.word.ms,
			EASE.word
		);
		return { opacity: p, transform: [{ translateY: T.word.rise * (1 - p) }] };
	});
	return (
		<Animated.View style={anim}>
			<AppText allowFontScaling={false} style={style} variant="poster">
				{word}
			</AppText>
		</Animated.View>
	);
}
