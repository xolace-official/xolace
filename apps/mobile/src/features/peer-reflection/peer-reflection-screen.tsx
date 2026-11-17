import { StatusBar } from "expo-status-bar";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	useAnimatedReaction,
	useAnimatedRef,
	useAnimatedScrollHandler,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { SkyWash } from "@/components/shared/sky-wash";
import { TopFade } from "@/components/shared/top-fade";
import { useBoardY } from "@/design/board";
import { useFixedFaces } from "@/design/fonts";
import { useScheme } from "@/design/scheme";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import { type PeersScene, useStage } from "./arrival/use-stage";
import { PeerCard } from "./card/peer-card";
import { Bridge } from "./chrome/bridge";
import { PeersFooter, PeersHeader } from "./chrome/peers-chrome";
import { PeersTitle } from "./chrome/peers-title";
import { COPY } from "./copy";
import { MarkBand } from "./mark/mark-band";
import { usePeerReflection } from "./peer-reflection-data";
import { usePeersColors } from "./peers-colors";
import { LAYOUT, SKY_SCALE } from "./peers-look";

/**
 * You're not alone ("A light for each of them", design/handoff/peers.md):
 * other people's words arrive one at a time, each joined to yours by a line of
 * light. The arrival is one UI-thread value; React renders when a card lands,
 * lights or leaves. `scene` is for dev states only.
 */
export function PeerReflectionScreen({ scene }: { scene?: PeersScene }) {
	const data = usePeerReflection();
	// The quotes are set in the mirror's face: the arrival waits for it, so the
	// write-on measures the lines it will draw.
	const facesReady = useFixedFaces("mirror");
	const peers = facesReady
		? data
		: { ...data, state: { ...data.state, status: "loading" as const } };
	const { state, actions } = peers;
	const { width: W, height: winH } = useWindowDimensions();
	const y = useBoardY();
	const ink3 = useTokenColor("subtle");
	const dark = useScheme() === "dark";
	const colors = usePeersColors(state.late, dark);
	const scroller = useAnimatedRef<Animated.ScrollView>();
	const scrollY = useSharedValue(0);
	const scrolled = useSharedValue(0);
	const listTop = useSharedValue(0);
	const stage = useStage(peers, scene, () =>
		scroller.current?.scrollToEnd({ animated: true })
	);
	const { arrive, reduced, title, ui } = stage;
	const loading = state.status === "loading";
	const none = state.set === "none";

	const onScroll = useAnimatedScrollHandler((e) =>
		scrollY.set(e.contentOffset.y)
	);
	useAnimatedReaction(
		() => scrollY.get() > LAYOUT.topFade.after,
		(on, was) => {
			if (on !== was) {
				scrolled.set(
					withTiming(on ? 1 : 0, {
						duration: LAYOUT.topFade.ms,
						...PLAY_AS_CHOSEN,
					})
				);
			}
		}
	);

	return (
		<View className="flex-1 bg-background">
			{/* Shown: the stack below (Reflect) hides it, and the bar's props merge. */}
			<StatusBar hidden={false} style={dark ? "light" : "dark"} />
			<Animated.ScrollView
				contentContainerStyle={{
					paddingBottom: LAYOUT.scroll.bottom,
					paddingTop: y(LAYOUT.scroll.top),
				}}
				onScroll={onScroll}
				ref={scroller}
				scrollEventThrottle={16}
				showsVerticalScrollIndicator={false}
			>
				<View className="absolute inset-x-0 top-0" pointerEvents="none">
					<SkyWash late={state.late} scale={SKY_SCALE} />
				</View>
				<MarkBand
					arrive={arrive}
					breath={stage.face.breath}
					colors={colors}
					dotted={state.set === "recent"}
					ink3={ink3}
					loading={loading}
					n={state.cards.length}
					none={none}
					reduced={reduced}
					stars={stage.mark.stars}
					W={W}
				/>
				{loading ? (
					<View accessibilityLabel={COPY.loading} accessible className="h-px" />
				) : (
					<PeersTitle
						arrive={arrive}
						reduced={reduced}
						rows={title.rows}
						sub={title.sub}
					/>
				)}
				<View
					onLayout={(e) => listTop.set(e.nativeEvent.layout.y)}
					style={{
						paddingHorizontal: LAYOUT.cards.side,
						paddingTop: LAYOUT.cards.top,
					}}
				>
					{state.cards.map((c, i) => (
						<PeerCard
							arrive={arrive}
							arriveEnd={stage.end}
							breath={stage.face.breath}
							card={c}
							colors={colors}
							index={i}
							key={c.id}
							late={state.late}
							listTop={listTop}
							onHide={() => actions.hide(c.id)}
							onReport={() => actions.report(c.id)}
							onToggle={() => stage.press(i)}
							reduced={reduced}
							scrollY={scrollY}
							viewH={winH}
						/>
					))}
				</View>
				{state.bridge && !loading ? (
					<Bridge
						arrive={arrive}
						colors={colors}
						none={none}
						reduced={reduced}
						text={title.next}
					/>
				) : null}
			</Animated.ScrollView>
			<TopFade
				height={y(LAYOUT.topFade.height)}
				shown={scrolled}
				solid={y(LAYOUT.topFade.height * LAYOUT.topFade.solidTo)}
			/>
			<PeersHeader
				breath={stage.face.breath}
				face={stage.face.face}
				late={state.late}
				top={y(LAYOUT.header.top)}
			/>
			{loading ? null : (
				<PeersFooter
					arrive={arrive}
					hint={state.cards.length > 0}
					onDone={stage.done}
					reduced={reduced}
					ui={ui}
				/>
			)}
		</View>
	);
}
