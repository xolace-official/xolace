import { View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Card } from "@/components/shared/card";
import { EaseView } from "@/design/ease";
import { useToday } from "../today-data";
import { useOnScreen, useTodayFrame } from "../today-frame";
import { MODULE_GAP } from "../today-motion";
import { todayRiseProps } from "../today-rise";
import { KindlingLive } from "./kindling-live";

const PAD_X = 18;
const PAD_Y = 16;
const CARD_H = 172;
/** The board's `.card` radius. */
const RADIUS = 26;
/** The first rise slot after the hero; the campfire takes the next (1), S1d's modules the rest. */
const RISE_SLOT = 0;

/**
 * What the card shows. Today: a live kindling, or nothing, as production's card. S16 fills
 * the empty frame (Xolace+ with none right now, free, setting up: `P/src/features/today/
 * kindling/card-mode.ts`) by adding its modes here; the frame below stays.
 */
type KindlingCardMode = "live" | "none";

/** Today's kindling card: the steps from your last session, as a path you tend. */
export function KindlingCard({ width }: { width: number }) {
	const { state } = useToday();
	const { reduced, intro, waiting } = useTodayFrame();
	const top = useSharedValue(0);
	const onScreen = useOnScreen(top, CARD_H);
	const { kindling } = state;
	const mode: KindlingCardMode = kindling === null ? "none" : "live";
	if (mode === "none") {
		return null;
	}

	return (
		<EaseView
			{...todayRiseProps(RISE_SLOT, intro, reduced, waiting)}
			className="mx-4"
			onLayout={(e) => top.set(e.nativeEvent.layout.y)}
			style={{ marginTop: MODULE_GAP }}
		>
			<Card className="overflow-hidden" radius={RADIUS}>
				<View style={{ paddingHorizontal: PAD_X, paddingVertical: PAD_Y }}>
					{kindling ? (
						<KindlingLive
							kindling={kindling}
							onScreen={onScreen}
							width={width - PAD_X * 2}
						/>
					) : (
						// Loading (as production's skeleton): the frame holds its place.
						<View style={{ height: CARD_H - PAD_Y * 2 }} />
					)}
				</View>
			</Card>
		</EaseView>
	);
}
