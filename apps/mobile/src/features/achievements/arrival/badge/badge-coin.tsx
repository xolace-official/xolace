import type { SharedValue } from "react-native-reanimated";
import { useDerivedValue } from "react-native-reanimated";
import { familyTokens } from "@/features/achievements/achievements-model";
import type { ArrivingBadge } from "@/features/achievements/arrival/arrival-model";
import {
	bandAt,
	bloomAt,
	coinAt,
	type Eng,
	type Geo,
	PH,
} from "@/features/achievements/arrival/arrival-motion";
import { Coin, GREY_AFTER } from "@/features/achievements/coin/coin";
import { Bloom, Flood } from "@/features/achievements/coin/glow";
import type { Pose } from "@/features/achievements/coin/pose";
import { COPY } from "@/features/achievements/copy";
import { easeOut, seg } from "@/features/achievements/motion-math";
import { useTokenColor } from "@/lib/use-token-color";

const SPREAD = { from: 40, to: 760 } as const;

/** Badge `i`'s pose for the coin, its colour and glow: unseen unless it's the one out. */
function useArrivalPose(
	eng: SharedValue<Eng>,
	fa: SharedValue<number>,
	geo: Geo,
	i: number
) {
	return useDerivedValue<Pose>(() => {
		const e = eng.get();
		const c = coinAt(e, geo);
		const on = e.phase === PH.badge && e.step === i ? 1 : 0;
		const spread = e.rm ? 1 : easeOut(seg(c.a, SPREAD.from, SPREAD.to));
		return {
			alpha: c.op * (1 - c.close) * on,
			band: bandAt(fa.get(), e.rm),
			bloom: bloomAt(c.a, fa.get(), e.rm),
			cx: geo.cx,
			cy: c.cy,
			dim: 0,
			mt: -1,
			nameA: 0,
			ns: 1,
			nx: 0,
			ny: 0,
			power: 1,
			r: c.r,
			recede: 0,
			roll: 0,
			rvA: [],
			rvY: [],
			spin: c.spin,
			spread: c.a < 0 ? 0 : spread,
			tiltX: c.tiltX,
			tiltY: c.tiltY,
		};
	});
}

type One = {
	eng: SharedValue<Eng>;
	fa: SharedValue<number>;
	geo: Geo;
	i: number;
	b: ArrivingBadge;
	dark: boolean;
};

/** Badge `i`'s colour and glow. */
export function BadgeGlow({
	reach,
	...one
}: One & { reach: SharedValue<number> }) {
	const { eng, fa, geo, i, b, dark } = one;
	const pose = useArrivalPose(eng, fa, geo, i);
	const tokens = familyTokens(b.family, dark);
	const flood = useTokenColor(tokens.flood);
	const glow = useTokenColor(tokens.glow);
	return (
		<>
			<Flood
				color={flood}
				o={{ r: 0, x: geo.cx, y: geo.hy }}
				pose={pose}
				reach={reach}
			/>
			<Bloom dark={dark} glow={glow} pose={pose} />
		</>
	);
}

/** Badge `i` itself: the badge page's coin, its back engraved "Today". */
export function BadgeFace({ eng, fa, geo, i, b, dark }: One) {
	const pose = useArrivalPose(eng, fa, geo, i);
	return (
		<Coin
			art={b.art}
			back={{
				date: COPY.arrival.engravedDay,
				sparks: b.sparks,
				title: b.title,
			}}
			dark={dark}
			// It drops in from above the screen.
			greyAfterMs={GREY_AFTER.offScreen}
			lit={!b.art.unlit}
			n={i}
			pose={pose}
		/>
	);
}
