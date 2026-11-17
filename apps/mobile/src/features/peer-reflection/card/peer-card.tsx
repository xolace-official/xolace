import { useState } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useSharedValue,
} from "react-native-reanimated";
import { useTokenColor } from "@/lib/use-token-color";
import { cardStart } from "../arrival/arrival-time";
import type { PeerCard as Card } from "../peer-reflection-model";
import type { PeersColors } from "../peers-colors";
import { LAYOUT } from "../peers-look";
import { CardMenu } from "./card-menu";
import { FeltChip } from "./felt-chip";
import { PeerEdgeGlow, PeerInnerLight } from "./peer-light";
import { Quote } from "./quote";
import { useCardMotion } from "./use-card-motion";
import { useCardWrite } from "./use-card-write";

const C = LAYOUT.card;

type Props = {
	card: Card;
	index: number;
	late: boolean;
	reduced: boolean;
	colors: PeersColors;
	arrive: SharedValue<number>;
	/** Where the arrival value stops. */
	arriveEnd: number;
	/** The scroll's offset and the window's height: a card writes when it comes into view. */
	scrollY: SharedValue<number>;
	viewH: number;
	/** Where the card list starts in the scroll's content. */
	listTop: SharedValue<number>;
	breath: SharedValue<number>;
	onToggle: () => void;
	onReport: () => void;
	onHide: () => void;
};

/**
 * One reflection (board `.cw`, `.cd`): rises 28 pt on its turn (from the shared
 * arrival value), writes its words in when it's in view, lights from the chip
 * when you've felt it too (the floor light and edge glow, mounted on its first
 * lighting), and folds away when reported or hidden (.42 s, the sheet curve).
 */
export function PeerCard({
	card,
	index,
	late,
	reduced,
	colors,
	arrive,
	arriveEnd,
	scrollY,
	viewH,
	listTop,
	breath,
	onToggle,
	onReport,
	onHide,
}: Props) {
	const { on, gone } = card;
	const drop = useTokenColor("separator");
	// Each turn-on beats the ember once (a card that arrives lit doesn't).
	const [presses, setPresses] = useState(0);
	const [wasOn, setWasOn] = useState(on);
	if (on !== wasOn) {
		setWasOn(on);
		if (on) {
			setPresses(presses + 1);
		}
	}
	const start = cardStart(index);
	const y = useSharedValue(0);
	const h = useSharedValue(0);
	const { write, lineCount, lastFrac, rowOpacity } = useCardWrite({
		arrive,
		arriveEnd,
		listTop,
		reduced,
		scrollY,
		start,
		viewH,
		y,
	});
	const [size, setSize] = useState({ h: 0, w: 0 });
	// The light's canvases mount on the card's first lighting, never before.
	const [everLit, setEverLit] = useState(on);
	if (on && !everLit) {
		setEverLit(true);
	}

	const { wrap, leave, lit, edgeOn } = useCardMotion({
		arrive,
		gone: gone !== null,
		h,
		on,
		reduced,
		start,
	});

	return (
		<Animated.View
			accessibilityElementsHidden={gone !== null}
			importantForAccessibility={gone ? "no-hide-descendants" : "auto"}
			onLayout={(e) => {
				y.set(e.nativeEvent.layout.y);
				if (leave.get() === 0) {
					h.set(e.nativeEvent.layout.height);
				}
			}}
			pointerEvents={gone ? "none" : "auto"}
			style={wrap}
		>
			{everLit && size.w > 0 ? (
				<PeerEdgeGlow
					breath={breath}
					colors={colors}
					h={size.h}
					late={late}
					on={edgeOn}
					w={size.w}
				/>
			) : null}
			<CardMenu onHide={onHide} onReport={onReport}>
				<View
					accessible={false}
					className="border-continuous bg-surface"
					onLayout={(e) =>
						setSize({
							h: e.nativeEvent.layout.height,
							w: e.nativeEvent.layout.width,
						})
					}
					style={{
						borderRadius: C.radius,
						boxShadow: `0 0 0 1px ${drop}, 0 10px 28px -16px ${colors.cardShadow}`,
						paddingBottom: C.padBottom,
						paddingHorizontal: C.padX,
						paddingTop: C.padTop,
					}}
				>
					{everLit && size.w > 0 ? (
						<PeerInnerLight
							colors={colors}
							h={size.h}
							lit={lit}
							radius={C.radius}
							w={size.w}
						/>
					) : null}
					<Quote
						lastFrac={lastFrac}
						lineCount={lineCount}
						onHide={onHide}
						onReport={onReport}
						reduced={reduced}
						text={card.text}
						write={write}
					/>
					<FeltChip
						colors={colors}
						on={on}
						onPress={onToggle}
						others={card.others}
						presses={presses}
						reduced={reduced}
						rowOpacity={rowOpacity}
					/>
				</View>
			</CardMenu>
		</Animated.View>
	);
}
