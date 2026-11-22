import { useState } from "react";
import Animated, {
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { CTA_H } from "@/features/achievements/arrival/arrival-chrome";
import {
	age,
	type Eng,
	type Geo,
	PH,
	RV,
	revealAt,
	shutAt,
} from "@/features/achievements/arrival/arrival-motion";
import { COPY } from "@/features/achievements/copy";
import { easeOut, seg } from "@/features/achievements/motion-math";
import { useTokenColor } from "@/lib/use-token-color";

const HINT_TOP = 612;
const HINT_IN_MS = 500;
const DOTS_ABOVE_CTA = 32;

export function Hint({ eng, geo }: { eng: SharedValue<Eng>; geo: Geo }) {
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		if (e.rm || e.turned || e.phase !== PH.badge) {
			return { opacity: 0 };
		}
		const p = easeOut(seg(age(e, e.ta), RV.hint, RV.hint + HINT_IN_MS));
		return { opacity: p * shutAt(e) };
	});
	return (
		<Animated.View
			className="absolute inset-x-0"
			pointerEvents="none"
			style={[{ opacity: 0, top: HINT_TOP + geo.dy }, style]}
		>
			<AppText
				center
				className="text-[12.5px] text-foreground/50 leading-4"
				variant="body"
			>
				{COPY.arrival.hint}
			</AppText>
		</Animated.View>
	);
}

export function Dots({
	eng,
	first,
	total,
	dark,
}: {
	eng: SharedValue<Eng>;
	first: number;
	total: number;
	dark: boolean;
}) {
	const insets = useSafeAreaInsets();
	const on = useTokenColor("foreground");
	const off = useTokenColor(
		dark ? "arrival-dot-off-dusk" : "arrival-dot-off-day"
	);
	const [n, setN] = useState(first);
	useAnimatedReaction(
		() => eng.get().step,
		(v, was) => {
			if (was !== null && v !== was) {
				scheduleOnRN(setN, v);
			}
		}
	);
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		if (e.phase !== PH.badge) {
			return { opacity: 0 };
		}
		return { opacity: revealAt(age(e, e.ta), RV.cta, e.rm) * shutAt(e) };
	});
	return (
		<Animated.View
			accessibilityLabel={COPY.arrival.dotsLabel(n, total)}
			accessible
			className="absolute inset-x-0 flex-row justify-center gap-1.5"
			style={[{ bottom: insets.bottom + CTA_H + DOTS_ABOVE_CTA }, style]}
		>
			{Array.from({ length: total }, (_, i) => (
				<Dot eng={eng} i={i} key={i} off={off} on={on} />
			))}
		</Animated.View>
	);
}

function Dot({
	eng,
	i,
	on,
	off,
}: {
	eng: SharedValue<Eng>;
	i: number;
	on: string;
	off: string;
}) {
	const style = useAnimatedStyle(() => ({
		backgroundColor: eng.get().step === i ? on : off,
	}));
	return <Animated.View className="size-1.5 rounded-full" style={style} />;
}
