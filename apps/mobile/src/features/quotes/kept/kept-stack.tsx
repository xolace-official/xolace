import { useWindowDimensions, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { BlurView } from "@/components/shared/styled";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { cn } from "@/lib/cn";
import { QuoteIcon } from "../chrome/quote-icons";
import { useQuoteInk } from "../chrome/quote-ink";
import { QUOTE_COPY } from "../copy";
import { T } from "../motion/quote-motion";
import {
	type KeptCard as Card,
	KEPT_WINDOW,
	keptBackground,
	type QuoteBackground,
} from "../quotes-model";
import { CARD, CARD_IN_STACK, KeptCard } from "./kept-card";
import { KeptHeader, KeptNav } from "./kept-nav";

const STACK_BELOW_TOP = 76;
const BELOW_CARD = 26;
const SWIPE = 50;
const PAN_SLOP = 12;
const ENTER_MS = 350;
const REPLY_BLUR = 20;
const A11Y = QUOTE_COPY.accessibility;

type Props = {
	cards: readonly Card[];
	total: number;
	index: number;
	backgrounds: readonly QuoteBackground[];
	reduced: boolean;
	onIndex: (i: number) => void;
	onBack: () => void;
	onReflect: (c: Card) => void;
};

export function KeptStack(p: Props) {
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const q = useQuoteInk();
	const top = insets.top + 6;
	const stackTop = top + STACK_BELOW_TOP;
	const last = p.cards.length - 1;
	const index = Math.min(p.index, Math.max(0, last));
	const card = p.cards[index];
	const older = () => p.onIndex(Math.min(last, index + 1));
	const newer = () => p.onIndex(Math.max(0, index - 1));
	const pan = usePanGesture({
		activeOffsetX: [-PAN_SLOP, PAN_SLOP],
		onDeactivate: (e) => {
			if (e.translationX < -SWIPE) {
				older();
			} else if (e.translationX > SWIPE) {
				newer();
			}
		},
		runOnJS: true,
	});
	const soft = { backgroundColor: q.keptSoft };
	const onKept = { color: q.keptInk };

	return (
		<Animated.View
			accessibilityViewIsModal
			className="absolute inset-0"
			entering={FadeIn.duration(p.reduced ? T.reduced : ENTER_MS).reduceMotion(
				PLAY_AS_CHOSEN.reduceMotion
			)}
			style={{ backgroundColor: q.keptVeil }}
		>
			<KeptHeader
				ink={q.keptInk}
				onBack={p.onBack}
				position={card ? QUOTE_COPY.position(index + 1, p.total) : ""}
				soft={q.keptSoft}
				top={top}
			/>
			{card ? (
				<>
					<GestureDetector gesture={pan}>
						<View
							className="absolute right-0 left-0"
							style={{ height: CARD.h + CARD_IN_STACK + 6, top: stackTop }}
						>
							{p.cards.map((c, i) => {
								const d = i - index;
								if (d < -KEPT_WINDOW.behind || d > KEPT_WINDOW.ahead) {
									return null;
								}
								return (
									<KeptCard
										background={keptBackground(c.background, p.backgrounds)}
										card={c}
										d={d}
										key={c.id}
										left={(width - CARD.w) / 2}
										reduced={p.reduced}
									/>
								);
							})}
						</View>
					</GestureDetector>
					<View
						className="absolute right-6 left-6 gap-3.5"
						style={{ top: stackTop + CARD_IN_STACK + CARD.h + BELOW_CARD }}
					>
						{card.reply && (
							<View className="overflow-hidden rounded-[20px] border-continuous">
								<BlurView
									className="absolute inset-0"
									intensity={REPLY_BLUR}
									tint="default"
								/>
								<View className="gap-1 rounded-[20px] border-[0.5px] border-white/14 bg-white/10 px-3.5 py-3">
									<AppText
										className="text-[11px] tracking-[0.88px] opacity-70"
										style={onKept}
										variant="caption"
										weight="bold"
									>
										{QUOTE_COPY.wroteBack}
									</AppText>
									<AppText
										className="text-[15px] leading-[21px]"
										numberOfLines={4}
										style={onKept}
										variant="callout"
									>
										{card.reply}
									</AppText>
								</View>
							</View>
						)}
						<View className="flex-row items-center gap-3">
							<KeptNav
								disabled={index === 0}
								icon="chevronLeft"
								ink={q.keptInk}
								label={A11Y.newer}
								onPress={newer}
								soft={q.keptSoft}
							/>
							<PressScale
								accessibilityLabel={QUOTE_COPY.reflect}
								accessibilityRole="button"
								className="h-12 flex-1 items-center justify-center rounded-full"
								onPress={() => p.onReflect(card)}
								style={{ backgroundColor: q.keptInk }}
							>
								<AppText
									className="text-[15.5px]"
									style={{ color: q.keptPillInk }}
									variant="callout"
									weight="semibold"
								>
									{QUOTE_COPY.reflect}
								</AppText>
							</PressScale>
							<KeptNav
								disabled={index >= last}
								icon="chevronRight"
								ink={q.keptInk}
								label={A11Y.older}
								onPress={older}
								soft={q.keptSoft}
							/>
						</View>
					</View>
				</>
			) : (
				<View
					className="absolute right-10 left-10 items-center"
					style={{ top: stackTop + CARD.h / 2 }}
				>
					<AppText
						center
						className="text-[15.5px] leading-[22px]"
						style={onKept}
						variant="callout"
					>
						{QUOTE_COPY.noneKept}
					</AppText>
				</View>
			)}
		</Animated.View>
	);
}
