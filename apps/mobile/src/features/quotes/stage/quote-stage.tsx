import {
	Pressable,
	type StyleProp,
	type TextStyle,
	useWindowDimensions,
	View,
} from "react-native";
import {
	GestureDetector,
	useExclusiveGestures,
	useLongPressGesture,
	useTapGesture,
} from "react-native-gesture-handler";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { type InkPalette, textShadow } from "../chrome/quote-ink";
import { QUOTE_COPY } from "../copy";
import {
	EASE,
	slice,
	T,
	useQuoteMotion,
	wordsEnd,
} from "../motion/quote-motion";
import type { Reason } from "../quotes-model";
import { QuoteReason } from "./quote-reason";
import { QuoteState } from "./quote-state";
import { POSTER_SEMI } from "./quote-type";
import { QuoteWords } from "./quote-words";

const STAGE = { bottom: 220, gap: 18, side: 30, top: 120 } as const;
const TYPING = { shrink: 0.24, y: 62 } as const;
const TITLE_TRACKING = 2.4;

type Props = {
	title?: string;
	text: string;
	size: number;
	lineHeight: number;
	ink: InkPalette;
	shadowColor: string;
	reason: Reason;
	status: "ready" | "loading" | "error";
	onDouble: () => void;
	onHold: () => void;
	onTap: () => void;
	onGate: () => void;
	onRetry: () => void;
};

export function QuoteStage(p: Props) {
	const m = useQuoteMotion();
	const { width } = useWindowDimensions();
	const end = wordsEnd(p.text.split(" ").length);

	const { progress: kb } = useReanimatedKeyboardAnimation();
	const stage = useAnimatedStyle(() => {
		const t = EASE.stage(Math.min(1, m.sheet.get()));
		const k = kb.get();
		return {
			opacity: m.stage.get(),
			transform: [
				{ translateY: -m.liftY.get() * t - TYPING.y * k },
				{
					scale: m.reduced
						? 1
						: 1 - (1 - m.liftScale.get()) * t - TYPING.shrink * k,
				},
			],
		};
	});
	const titleStyle = useAnimatedStyle(() => ({
		opacity:
			m.chrome.get() *
			(m.reduced
				? slice(m.clock.get(), 0, T.reduced)
				: slice(m.clock.get(), T.title.at, T.title.ms)),
	}));
	const reasonStyle = useAnimatedStyle(() => ({
		opacity:
			m.chrome.get() *
			(m.reduced
				? slice(m.clock.get(), 0, T.reduced)
				: slice(m.clock.get(), end - T.reasonLead, T.fade)),
	}));

	const double = useTapGesture({
		numberOfTaps: 2,
		onActivate: p.onDouble,
		runOnJS: true,
	});
	const single = useTapGesture({ onActivate: p.onTap, runOnJS: true });
	const hold = useLongPressGesture({
		minDuration: T.longPress,
		onActivate: p.onHold,
		runOnJS: true,
	});
	const gesture = useExclusiveGestures(hold, double, single);

	const shadow = p.ink.shadow ? textShadow(p.shadowColor) : null;
	const small = [{ color: p.ink.text2 }, shadow];
	const label = p.title ? `${p.title}. ${p.text}` : p.text;

	return (
		<Animated.View
			className="absolute top-0 bottom-0 items-center justify-center"
			pointerEvents="box-none"
			style={[
				{
					gap: STAGE.gap,
					left: STAGE.side,
					paddingBottom: STAGE.bottom,
					paddingTop: STAGE.top,
					right: STAGE.side,
				},
				stage,
			]}
		>
			{p.status === "ready" ? (
				<>
					<GestureDetector gesture={gesture}>
						<View
							accessibilityActions={[
								{ label: QUOTE_COPY.accessibility.clear, name: "clear" },
							]}
							accessibilityLabel={label}
							accessible
							className="items-center"
							onAccessibilityAction={(e) =>
								e.nativeEvent.actionName === "clear" && p.onHold()
							}
							style={{ gap: STAGE.gap }}
						>
							{p.title ? (
								<Animated.View style={titleStyle}>
									<AppText
										allowFontScaling={false}
										center
										className="text-[12px] uppercase"
										style={[
											{
												fontFamily: POSTER_SEMI,
												letterSpacing: TITLE_TRACKING,
											},
											...small,
										]}
										variant="caption"
									>
										{p.title}
									</AppText>
								</Animated.View>
							) : null}
							<QuoteWords
								ink={p.ink}
								lineHeight={p.lineHeight}
								shadowColor={p.shadowColor}
								size={p.size}
								text={p.text}
								width={width - STAGE.side * 2}
							/>
						</View>
					</GestureDetector>
					<Animated.View style={reasonStyle}>
						<QuoteReason onGate={p.onGate} reason={p.reason} style={small} />
					</Animated.View>
				</>
			) : (
				<QuoteState
					ink={p.ink}
					onRetry={p.onRetry}
					reduced={m.reduced}
					shadowColor={p.shadowColor}
					status={p.status}
				/>
			)}
		</Animated.View>
	);
}
