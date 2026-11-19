import { useEffect, useState } from "react";
import { View } from "react-native";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { Card } from "@/components/shared/card";
import { EaseView } from "@/design/ease";
import { useToday } from "../today-data";
import { useOnScreen, useTodayFrame } from "../today-frame";
import { MODULE_GAP } from "../today-motion";
import { todayRiseProps } from "../today-rise";
import { type KindlingCardMode, kindlingCardMode } from "./card-mode";
import { KindlingEmpty } from "./kindling-empty";
import { KindlingLive } from "./kindling-live";
import type { KindlingView } from "./kindling-model";
import { SWAP, SwapLayer } from "./swap-layer";

const PAD_X = 18;
const PAD_Y = 16;
const CARD_H = 172;
/** The board's `.card` radius. */
const RADIUS = 26;
/** The first rise slot after the hero; the campfire takes the next (1), S1d's modules the rest. */
const RISE_SLOT = 0;
const OUT = { left: PAD_X, right: PAD_X, top: PAD_Y } as const;

/**
 * The mode on screen, the one fading out of it for the swap's 400 ms, and the last live
 * kindling, which the live layer keeps drawing while it fades out (put out: the server's
 * is already null).
 */
function useSwap(
	mode: KindlingCardMode | undefined,
	kindling: KindlingView | null | undefined
) {
	const [shown, setShown] = useState(mode);
	const [leaving, setLeaving] = useState<KindlingCardMode | undefined>();
	const [swapped, setSwapped] = useState(false);
	const [lastLive, setLastLive] = useState(kindling);
	if (kindling && kindling !== lastLive) {
		setLastLive(kindling);
	}
	if (shown !== mode) {
		setLeaving(shown);
		setShown(mode);
		setSwapped(true);
	}
	useEffect(() => {
		if (leaving === undefined) {
			return;
		}
		const id = setTimeout(() => setLeaving(undefined), SWAP.inAt + SWAP.inMs);
		return () => clearTimeout(id);
	}, [leaving]);
	return { lastLive: kindling ?? lastLive, leaving, shown, swapped };
}

/**
 * Today's kindling card. It never leaves Today (`P/design/handoff/kindling.md` §11.1): with
 * a kindling it shows the path you tend; without one, an unlit path and what to do next
 * (Xolace+ with none right now, free, setting up). The frame stays put and only its content
 * crossfades, so nothing below it moves when a kindling arrives or goes.
 */
export function KindlingCard({ width }: { width: number }) {
	const { state } = useToday();
	const { reduced, intro, waiting } = useTodayFrame();
	const top = useSharedValue(0);
	const onScreen = useOnScreen(top, CARD_H);
	const { kindling, kindlingEmpty } = state;
	const mode = kindlingCardMode(kindling, kindlingEmpty);
	const { lastLive, leaving, shown, swapped } = useSwap(mode, kindling);
	const pathW = width - PAD_X * 2;
	// Keyed by mode, so a layer keeps its instance (and the live path its canvas) when it
	// turns outgoing. The skeleton never fades out: it has nothing to show.
	const layers: { mode: KindlingCardMode | undefined; out: boolean }[] =
		leaving === undefined || leaving === shown
			? [{ mode: shown, out: false }]
			: [
					{ mode: leaving, out: true },
					{ mode: shown, out: false },
				];

	return (
		<EaseView
			{...todayRiseProps(RISE_SLOT, intro, reduced, waiting)}
			className="mx-4"
			onLayout={(e) => top.set(e.nativeEvent.layout.y)}
			style={{ marginTop: MODULE_GAP }}
		>
			<Card className="overflow-hidden" radius={RADIUS}>
				<View style={{ paddingHorizontal: PAD_X, paddingVertical: PAD_Y }}>
					{layers.map((l) => (
						<SwapLayer
							fadeIn={swapped}
							key={l.mode ?? "loading"}
							out={l.out ? OUT : null}
							reduced={reduced}
						>
							<Body
								kindling={lastLive}
								mode={l.mode}
								onScreen={onScreen}
								width={pathW}
							/>
						</SwapLayer>
					))}
				</View>
			</Card>
		</EaseView>
	);
}

type BodyProps = {
	mode: KindlingCardMode | undefined;
	kindling: KindlingView | null | undefined;
	width: number;
	onScreen: SharedValue<boolean>;
};

function Body({ mode, kindling, width, onScreen }: BodyProps) {
	if (mode === undefined) {
		// Loading (as production's skeleton): the frame holds its place.
		return <View style={{ height: CARD_H - PAD_Y * 2 }} />;
	}
	if (mode === "live") {
		return kindling ? (
			<KindlingLive kindling={kindling} onScreen={onScreen} width={width} />
		) : null;
	}
	return <KindlingEmpty mode={mode} onScreen={onScreen} width={width} />;
}
