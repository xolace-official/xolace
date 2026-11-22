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
import { settled, type TrailView } from "./kindling-model";
import { KindlingStatus } from "./kindling-status";
import { useKindlingColours } from "./trail/kindling-colours";
import { KindlingTrail } from "./trail/kindling-trail";
import { trailGeometry } from "./trail/trail-geometry";
import { useTrailScroll } from "./trail/use-trail-scroll";
import { useTrail } from "./use-trail";

const BOARD_BOTTOM = 34;
const CARD_GAP = 24;
const CARD_MIN_BOTTOM = 12;
const HEADER_GAP = 35;
const FIRE_CLEAR = 40;
const NO_VIEW: TrailView = { generatedAt: 0, id: "", states: [], twigs: [] };

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
	const k = useTrail(view, actions, { live, reduced, trail });
	const bottom = Math.max(
		CARD_MIN_BOTTOM,
		CARD_GAP + insets.bottom - BOARD_BOTTOM
	);
	const [cardH, setCardH] = useState(0);
	const s = useTrailScroll({
		bottom,
		cardH,
		caught: k.bound,
		open: k.open,
		reduced,
		stops: trail.stops,
	});
	// The automatic bottom inset already adds the home indicator.
	const blockH =
		Math.max(
			trail.blockH,
			trail.fire.y + trail.fire.h + cardH + bottom + FIRE_CLEAR
		) - insets.bottom;

	return (
		<>
			{ready && !settled(k.shown) ? (
				<KindlingMenu
					onAsk={k.menu.asking}
					onCancel={k.menu.cancelled}
					onPutOut={() => {
						k.menu.putOut();
						actions.putOut();
					}}
				/>
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
								caught={k.caught}
								hold={k.hold}
								live={live}
								onOpen={k.actions.openStop}
								open={k.open}
								reduced={reduced}
								shown={k.shown}
								tend={k.tend}
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
