import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { STORY } from "../copy";
import { BOARD_TEXT_MAX } from "../first-run-layout";
import { ink } from "../first-run-palette";
import { BeatSection, Figure, useIn } from "./beat-parts";
import { type SEng, WE } from "./story-scene";

const CAMP = require("@/assets/images/flux/flux-campfire.png");
const VENT = require("@/assets/images/flux/vent-bg.png");
const F0 = { height: 300, left: 97, top: 432, width: 197 };
const F2 = { height: 250, left: 36, top: 452, width: 159 };

export function BeatCover({ eng }: { eng: SharedValue<SEng> }) {
	return (
		<BeatSection eng={eng} i={0}>
			<Figure box={F0} eng={eng} i={0} source={CAMP} />
		</BeatSection>
	);
}

export function BeatVent({ eng }: { eng: SharedValue<SEng> }) {
	const hint = useIn(eng, 2, WE[2] + 900, 500, 6);
	const grow = (e: SEng) => {
		"worklet";
		return e.vent > 0 && !e.rm ? 1 + 0.025 * e.vent : 1;
	};
	const texts = [STORY.vent.rest, STORY.vent.held, STORY.vent.gone];
	return (
		<BeatSection eng={eng} i={2}>
			<Figure box={F2} eng={eng} extra={grow} i={2} source={VENT} />
			<Animated.View
				className="absolute top-140 right-8 h-10 w-37.5"
				pointerEvents="none"
				style={hint}
			>
				{texts.map((t, k) => (
					<VentHint eng={eng} k={k} key={t} text={t} />
				))}
			</Animated.View>
		</BeatSection>
	);
}

function VentHint({
	eng,
	k,
	text,
}: {
	eng: SharedValue<SEng>;
	k: number;
	text: string;
}) {
	const style = useAnimatedStyle(() => ({
		opacity: eng.get().hint === k ? 1 : 0,
	}));
	return (
		<Animated.View className="absolute inset-x-0 top-0" style={style}>
			<AppText
				className="text-right text-[12.5px] leading-[17.5px]"
				maxFontSizeMultiplier={BOARD_TEXT_MAX}
				style={{ color: ink(0.5) }}
			>
				{text}
			</AppText>
		</Animated.View>
	);
}
