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
const RADIUS = 26;
const RISE_SLOT = 0;
const OUT = { left: PAD_X, right: PAD_X, top: PAD_Y } as const;

const SKELETON = "skeleton";
type Layer = KindlingCardMode | typeof SKELETON;

function useSwap(
	mode: KindlingCardMode | undefined,
	kindling: KindlingView | null | undefined
) {
	const layer: Layer = mode ?? SKELETON;
	const [shown, setShown] = useState(layer);
	const [leaving, setLeaving] = useState<Layer | null>(null);
	const [swapped, setSwapped] = useState(false);
	const [lastLive, setLastLive] = useState(kindling);
	if (kindling && kindling !== lastLive) {
		setLastLive(kindling);
	}
	if (shown !== layer) {
		setLeaving(shown === SKELETON ? null : shown);
		setShown(layer);
		setSwapped(true);
	}
	useEffect(() => {
		if (leaving === null) {
			return;
		}
		const id = setTimeout(() => setLeaving(null), SWAP.inAt + SWAP.inMs);
		return () => clearTimeout(id);
	}, [leaving]);
	return { lastLive: kindling ?? lastLive, leaving, shown, swapped };
}

export function KindlingCard({ width }: { width: number }) {
	const { state } = useToday();
	const { reduced, intro, waiting } = useTodayFrame();
	const top = useSharedValue(0);
	const onScreen = useOnScreen(top, CARD_H);
	const { kindling, kindlingEmpty } = state;
	const mode = kindlingCardMode(kindling, kindlingEmpty);
	const { lastLive, leaving, shown, swapped } = useSwap(mode, kindling);
	const pathW = width - PAD_X * 2;
	const layers: { layer: Layer; out: boolean }[] =
		leaving === null
			? [{ layer: shown, out: false }]
			: [
					{ layer: leaving, out: true },
					{ layer: shown, out: false },
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
							key={l.layer}
							out={l.out ? OUT : null}
							reduced={reduced}
						>
							<Body
								kindling={lastLive}
								layer={l.layer}
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
	layer: Layer;
	kindling: KindlingView | null | undefined;
	width: number;
	onScreen: SharedValue<boolean>;
};

function Body({ layer, kindling, width, onScreen }: BodyProps) {
	if (layer === SKELETON) {
		return <View style={{ height: CARD_H - PAD_Y * 2 }} />;
	}
	if (layer === "live") {
		return kindling ? (
			<KindlingLive kindling={kindling} onScreen={onScreen} width={width} />
		) : null;
	}
	return <KindlingEmpty mode={layer} onScreen={onScreen} width={width} />;
}
