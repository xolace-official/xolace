import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { BadgeArt } from "@/components/shared/badge-art";
import type { Art } from "@/features/achievements/achievements-model";
import {
	age,
	COIN,
	type Eng,
	type Geo,
	HELD,
	X_MS,
} from "@/features/achievements/arrival/arrival-motion";
import { easeIO, seg } from "@/features/achievements/motion-math";

/** Next: the old badge goes 280 pt left, turning away (rotateY → −π) to .85, fading 180–440 ms. */
const AWAY = 280;
const SHRINK = 0.15;
const FADE_FROM = 180;
const PERSPECTIVE = 900;

export function ExitCoin({
	eng,
	geo,
	i,
	art,
}: {
	eng: SharedValue<Eng>;
	geo: Geo;
	i: number;
	art: Art;
}) {
	const style = useAnimatedStyle(() => {
		const e = eng.get();
		const x = age(e, e.tx);
		if (e.step !== i + 1 || x < 0 || x >= X_MS || e.rm) {
			return { opacity: 0 };
		}
		const xp = easeIO(x / X_MS);
		const turn = -Math.PI * xp;
		return {
			opacity: (1 - seg(x, FADE_FROM, X_MS)) * (Math.cos(turn) >= 0 ? 1 : 0),
			transform: [
				{ translateX: geo.cx - AWAY * xp - HELD.r },
				{ translateY: geo.hy - HELD.r },
				{ scale: 1 - SHRINK * xp },
				{ perspective: PERSPECTIVE },
				{ rotateY: `${turn}rad` },
			],
		};
	});
	return (
		<Animated.View
			className="absolute top-0 left-0"
			pointerEvents="none"
			style={[{ height: COIN, opacity: 0, width: COIN }, style]}
		>
			<BadgeArt
				lit={!art.unlit}
				size={COIN}
				source={art.source}
				thumbhash={art.thumbhash}
			/>
		</Animated.View>
	);
}
