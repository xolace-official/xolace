import { Stack } from "expo-router";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { useHeaderOptions } from "@/lib/header-options";
import { useLive } from "@/lib/motion/clock";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { CardContent } from "./card/card-content";
import { TwigCard } from "./card/twig-card";
import { COPY } from "./copy";
import { KindlingHeader } from "./header/kindling-header";
import { KindlingMenu } from "./header/kindling-menu";
import { useKindling } from "./kindling-data";
import { caught as hasCaught, settled, type TrailView } from "./kindling-model";
import { KindlingStatus } from "./kindling-status";
import { useKindlingColours } from "./trail/kindling-colours";
import { KindlingTrail } from "./trail/kindling-trail";
import { trailGeometry } from "./trail/trail-geometry";
import { useTrailScroll } from "./trail/use-trail-scroll";
import { useTrail } from "./use-trail";

/** The board's phone has a 34 pt home indicator; the card sits 24 pt above it. */
const BOARD_BOTTOM = 34;
const CARD_GAP = 24;
/** Without a home indicator the card still keeps off the screen's edge. */
const CARD_MIN_BOTTOM = 12;
/** The trail starts 35 pt below the header block. */
const HEADER_GAP = 35;
/** Room between the fire and the card once scrolled to the end. */
const FIRE_CLEAR = 40;
/** Before a kindling loads, the screen's hooks run on no twigs. */
const NO_VIEW: TrailView = { generatedAt: 0, id: "", states: [], twigs: [] };

/** Your kindling (handoff `kindling.md`): the trail lights up as you tend it. */
export function KindlingScreen() {
	const { state } = useKindling();
	const header = useHeaderOptions();
	return (
		<>
			<Stack.Screen
				options={{
					...header,
					headerBackTitle: COPY.back,
					headerShown: true,
					title: COPY.title,
				}}
			/>
			<KindlingBody
				view={state.status === "ready" ? (state.view ?? null) : null}
			/>
		</>
	);
}

/**
 * Every state draws in one scroll view, kept mounted from loading to ready: UIKit binds the
 * large title's collapse to the first scroll view once (as production kept it).
 */
function KindlingBody({ view: ready }: { view: TrailView | null }) {
	const { state, actions } = useKindling();
	const view = ready ?? NO_VIEW;
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const reduced = useEffectiveReducedMotion();
	const live = useLive(reduced);
	const c = useKindlingColours();
	const trail = trailGeometry(width, view.twigs.length);
	const k = useTrail(view, actions, reduced);
	const caught = hasCaught(k.shown);
	const bottom = Math.max(
		CARD_MIN_BOTTOM,
		CARD_GAP + insets.bottom - BOARD_BOTTOM
	);
	const [cardH, setCardH] = useState(0);
	const s = useTrailScroll({
		bottom,
		cardH,
		caught,
		open: k.open,
		reduced,
		stops: trail.stops,
	});
	// Below the trail's top: the board's length, or enough to lift the fire clear of the card.
	// The automatic bottom inset already adds the home indicator.
	const blockH =
		Math.max(
			trail.blockH,
			trail.fire.y + trail.fire.h + cardH + bottom + FIRE_CLEAR
		) - insets.bottom;

	return (
		<>
			{/* A settled kindling is completed: there's nothing left to put out. */}
			{ready && !settled(k.shown) ? (
				<KindlingMenu beforeOpen={k.commit} onPutOut={actions.putOut} />
			) : null}
			<Animated.ScrollView
				contentContainerStyle={ready ? undefined : { flexGrow: 1 }}
				contentInsetAdjustmentBehavior="automatic"
				onScroll={s.onScroll}
				ref={s.scroll}
				scrollEventThrottle={16}
				showsVerticalScrollIndicator={false}
				{...s.scrollProps}
			>
				{ready ? (
					<>
						<KindlingHeader
							held={state.held}
							keys={view.twigs.map((t) => t.id)}
							reduced={reduced}
							states={k.shown}
						/>
						<View
							onLayout={s.onTrailLayout}
							style={{ height: blockH, marginTop: HEADER_GAP }}
						>
							<KindlingTrail
								c={c}
								caught={caught}
								fade={k.fade}
								live={live}
								onOpen={k.actions.openStop}
								open={k.open}
								reduced={reduced}
								shown={k.shown}
								trail={trail}
								twigs={view.twigs}
							/>
						</View>
					</>
				) : (
					<KindlingStatus status={state.status} />
				)}
			</Animated.ScrollView>
			{ready ? (
				<TwigCard
					bottom={bottom}
					onHeight={setCardH}
					open={k.open}
					reduced={reduced}
					render={(id) => (
						<CardContent
							c={c}
							h={{
								onAct: k.actions.act,
								onAgain: k.actions.again,
								onBack: actions.back,
								onBrowse: k.actions.browse,
								onSkip: k.actions.skip,
								onUndo: k.actions.undo,
							}}
							id={id}
							matching={state.matching}
							reduced={reduced}
							states={k.shown}
							twigs={view.twigs}
						/>
					)}
				/>
			) : null}
		</>
	);
}
