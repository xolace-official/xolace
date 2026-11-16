import { useState } from "react";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import type { SessionColors } from "../session-colors";
import { LAYOUT, T2 } from "../session-look";
import { appear, cardRise } from "../timeline";
import { EdgeGlow, FloorLight } from "./card-light";
import { captionAt, lastWordAt } from "./quote-timing";
import { ShareQuote } from "./share-quote";
import { ShareRow } from "./share-row";
import { useCardHold } from "./use-card-hold";
import type { Hold, Share } from "./use-send";

const C = LAYOUT.card;

type Props = {
	/** The distilled words. */
	words: string;
	c2: SharedValue<number>;
	cs: SharedValue<number>;
	/** 0 resting, 1 held, 2 ready (React hears the changes; the visuals read `holdSv`). */
	hold: Hold;
	holdSv: SharedValue<number>;
	share: Share;
	colors: SessionColors;
	reduced: boolean;
	/** The card can be held (moment 2, nothing answered yet). */
	holdable: boolean;
	onHold: (h: Hold) => void;
	onLeave: (how: "tap" | "hold") => void;
	onKeep: () => void;
	/** Where the quote's middle sits, in the card's own space (the point of light starts there). */
	onQuoteMid: (y: number) => void;
};

/**
 * "Leave it for someone?" (board `.lv`, `.cd`): You're not alone's card (Peers'), rising 28 pt at .82 s. Hold the
 * card itself (not its buttons) and it lifts and warms from below; at 700 ms it's ready, and letting go
 * sends it (paper-lantern-confirm's hold, on Gesture Handler 3's long press). VoiceOver uses the buttons.
 */
export function ShareCard({
	words,
	c2,
	cs,
	hold,
	holdSv,
	share,
	colors,
	reduced,
	holdable,
	onHold,
	onLeave,
	onKeep,
	onQuoteMid,
}: Props) {
	const line = useTokenColor("separator");
	const drop = useTokenColor("after-card-shadow");
	const last = lastWordAt(words);
	const [size, setSize] = useState({ h: 0, w: 0 });
	const rowTop = useSharedValue(Number.MAX_VALUE);
	const lineCount = useSharedValue(0);
	const lastFrac = useSharedValue(1);
	const { press, card, readyStyle, edge, floor } = useCardHold({
		cs,
		hold,
		holdable,
		holdSv,
		onHold,
		onLeave,
		reduced,
		rowTop,
	});

	const wrap = useAnimatedStyle(() =>
		cardRise(
			c2.get(),
			T2.card.at,
			T2.card.ms,
			T2.card.rise,
			T2.card.opaqueAt,
			reduced
		)
	);
	const caption = useAnimatedStyle(() => ({
		opacity: appear(
			c2.get(),
			captionAt(lineCount.get(), lastFrac.get(), last),
			T2.caption.ms,
			reduced
		).opacity,
	}));
	const row = useAnimatedStyle(() => ({
		opacity: appear(
			c2.get(),
			captionAt(lineCount.get(), lastFrac.get(), last) + T2.row.after,
			T2.row.ms,
			reduced
		).opacity,
	}));

	return (
		<Animated.View style={[{ marginTop: C.top }, wrap]}>
			{size.w > 0 ? (
				<EdgeGlow colors={colors.edge} h={size.h} on={edge} w={size.w} />
			) : null}
			<GestureDetector gesture={press}>
				<Animated.View style={card}>
					<Animated.View
						className="absolute inset-0 border-continuous"
						pointerEvents="none"
						style={[
							{
								borderRadius: C.radius,
								boxShadow: `0 0 0 1px ${colors.ready[0]}, 0 16px 34px -14px ${colors.ready[1]}`,
							},
							readyStyle,
						]}
					/>
					<View
						className="overflow-hidden border-continuous bg-surface"
						onLayout={(e) =>
							setSize({
								h: e.nativeEvent.layout.height,
								w: e.nativeEvent.layout.width,
							})
						}
						style={{
							borderRadius: C.radius,
							boxShadow: `0 0 0 1px ${line}, 0 10px 28px -16px ${drop}`,
							paddingBottom: C.padBottom,
							paddingHorizontal: C.padX,
							paddingTop: C.padTop,
						}}
					>
						{size.w > 0 ? (
							<FloorLight
								colors={colors.floor}
								h={size.h}
								on={floor}
								radius={C.radius}
								w={size.w}
							/>
						) : null}
						<View
							onLayout={(e) =>
								onQuoteMid(
									e.nativeEvent.layout.y + e.nativeEvent.layout.height / 2
								)
							}
						>
							<ShareQuote
								c2={c2}
								cs={cs}
								gleam={colors.gleam}
								lastFrac={lastFrac}
								lineCount={lineCount}
								reduced={reduced}
								text={words}
							/>
						</View>
						<Animated.View style={[{ marginTop: C.capTop }, caption]}>
							<AppText
								color="subtle"
								maxFontSizeMultiplier={1.4}
								style={{ fontSize: C.cap, lineHeight: C.capLine }}
								variant="caption"
							>
								{COPY.share.caption}
							</AppText>
						</Animated.View>
						<Animated.View
							onLayout={(e) => rowTop.set(e.nativeEvent.layout.y + C.rowTop)}
							style={row}
						>
							<ShareRow
								colors={colors}
								cs={cs}
								hold={hold}
								onKeep={onKeep}
								onLeave={() => onLeave("tap")}
								reduced={reduced}
								share={share}
							/>
						</Animated.View>
					</View>
				</Animated.View>
			</GestureDetector>
		</Animated.View>
	);
}
