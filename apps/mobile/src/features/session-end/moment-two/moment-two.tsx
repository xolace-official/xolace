import { type ReactNode, useState } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedReaction,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { GleamTitle } from "@/components/shared/gleam-title";
import { TopFade } from "@/components/shared/top-fade";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import type { SessionColors } from "../session-colors";
import type { NextCards, NextParts } from "../session-end-data";
import type { NextKey, SessionFrom } from "../session-end-model";
import { LAYOUT, T2 } from "../session-look";
import { appear } from "../timeline";
import { Band } from "./band";
import { NextCard } from "./next-card";
import { PointOfLight } from "./point-of-light";
import { ShareCard } from "./share-card";
import type { Send } from "./use-send";

const L = LAYOUT;
const FADE = { after: 6, height: 186, ms: 300, solid: 136 } as const;

type Props = {
	W: number;
	y: (v: number) => number;
	ctaTop: number;
	from: SessionFrom | null;
	words: string | null;
	next: NextKey;
	cards: NextCards;
	parts: NextParts;
	letterTile: ReactNode;
	send: Send;
	c2: SharedValue<number>;
	cs: SharedValue<number>;
	breath: SharedValue<number>;
	colors: SessionColors;
	reduced: boolean;
	onNext: () => void;
};

export function MomentTwo(p: Props) {
	const { W, y, words, send, c2, cs, colors, reduced } = p;
	const subtle = useTokenColor("subtle");
	const ox = (W - L.band.w) / 2;
	const colTop = y(words ? L.col.top : L.col.noneTop);
	const [cardY, setCardY] = useState(0);
	const [quoteMid, setQuoteMid] = useState(0);
	const sub = useAnimatedStyle(() => ({
		opacity: appear(c2.get(), T2.sub.at, T2.sub.ms, reduced).opacity,
	}));
	const scrollY = useSharedValue(0);
	const scrolled = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((e) =>
		scrollY.set(e.contentOffset.y)
	);
	useAnimatedReaction(
		() => scrollY.get() > FADE.after,
		(on, was) => {
			if (on !== was) {
				scrolled.set(
					withTiming(on ? 1 : 0, { duration: FADE.ms, ...PLAY_AS_CHOSEN })
				);
			}
		}
	);
	const subLine = words && p.from ? COPY.share.sub[p.from] : COPY.nothing.sub;

	return (
		<View className="absolute inset-0" pointerEvents="box-none">
			<Animated.ScrollView
				alwaysBounceVertical={false}
				className="absolute inset-x-0 top-0"
				contentContainerClassName="pb-3"
				contentContainerStyle={{ paddingTop: colTop }}
				onScroll={onScroll}
				scrollEventThrottle={16}
				showsHorizontalScrollIndicator={false}
				showsVerticalScrollIndicator={false}
				style={{ height: p.ctaTop }}
			>
				{words ? (
					<Band
						breath={p.breath}
						c2={c2}
						colors={colors}
						cs={cs}
						gone={send.gone}
						ink3={subtle}
						ox={ox}
						reduced={reduced}
						top={y(L.band.top)}
						W={W}
						warm={send.warm}
					/>
				) : null}
				<View style={{ marginHorizontal: L.col.side }}>
					<View style={{ marginHorizontal: L.title2.side }}>
						<GleamTitle
							at={T2.title.at}
							clock={c2}
							line={L.title2.line}
							reduced={reduced}
							rows={words ? COPY.share.title : COPY.nothing.title}
							size={L.title2.size}
							step={T2.title.step}
							tracking={L.title2.tracking}
						/>
					</View>
					<Animated.View
						style={[
							{ marginHorizontal: L.sub2.side, marginTop: L.sub2.top },
							sub,
						]}
					>
						<AppText
							center
							color="muted"
							style={{ fontSize: L.sub2.size, lineHeight: L.sub2.line }}
							variant="callout"
						>
							{subLine}
						</AppText>
					</Animated.View>
					{words ? (
						<View onLayout={(e) => setCardY(e.nativeEvent.layout.y)}>
							<ShareCard
								c2={c2}
								colors={colors}
								cs={cs}
								hold={send.hold}
								holdable={send.share === ""}
								holdSv={send.holdSv}
								onHold={send.onHold}
								onKeep={send.keep}
								onLeave={send.send}
								onQuoteMid={setQuoteMid}
								reduced={reduced}
								share={send.share}
								words={words}
							/>
						</View>
					) : null}
					<NextCard
						c2={c2}
						cards={p.cards}
						colors={colors}
						k={p.next}
						letterTile={p.letterTile}
						noneTop={!words}
						onPress={p.onNext}
						parts={p.parts}
						reduced={reduced}
					/>
				</View>
			</Animated.ScrollView>
			<TopFade height={y(FADE.height)} shown={scrolled} solid={y(FADE.solid)} />
			{words && !reduced && quoteMid > 0 ? (
				<PointOfLight
					colors={colors}
					cs={cs}
					ox={ox}
					startY={colTop + cardY + L.card.top + quoteMid}
					y={y}
				/>
			) : null}
		</View>
	);
}
