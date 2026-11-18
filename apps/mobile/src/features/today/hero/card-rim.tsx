import {
	BlurMask,
	Canvas,
	Group,
	Path,
	rect,
	rrect,
	Skia,
	SweepGradient,
	vec,
} from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { HERO } from "./hero-model";

/** Room around the card for the hold rim's blur (σ 7) and the hairline. */
const RIM_BLEED = 24;
const RIM_STOPS = [0, 0.35, 0.7, 1];
/** Sweep 0° is 3 o'clock; the rim starts at 12. */
const TO_NOON = [{ rotate: -Math.PI / 2 }];

/** The hold rim: the only part drawn live, and only while a hold moves it. */
export function CardRim({
	w,
	h,
	rim,
	rimOpacity,
	low,
	spectrum,
}: {
	w: number;
	h: number;
	rim: SharedValue<number>;
	rimOpacity: SharedValue<number>;
	low: boolean;
	spectrum: string[];
}) {
	const o = RIM_BLEED;
	const inset = HERO.rimW / 2;
	const ring = Skia.PathBuilder.Make()
		.addRRect(
			rrect(
				rect(o + inset, o + inset, w - HERO.rimW, h - HERO.rimW),
				HERO.radius - inset,
				HERO.radius - inset
			)
		)
		.build();
	const centre = vec(o + w / 2, o + h / 2);
	const sweepEnd = useDerivedValue(() => Math.max(0.5, 360 * rim.get()));
	const rimShown = useDerivedValue(() =>
		rim.get() > 0.002 ? rimOpacity.get() : 0
	);
	return (
		<Canvas
			pointerEvents="none"
			style={{
				height: h + o * 2,
				left: -o,
				position: "absolute",
				top: -o,
				width: w + o * 2,
			}}
		>
			<Group opacity={rimShown}>
				{low ? null : (
					<Path
						opacity={HERO.rimBlurOpacity}
						path={ring}
						strokeWidth={HERO.rimW}
						style="stroke"
					>
						<SweepGradient
							c={centre}
							colors={spectrum}
							end={sweepEnd}
							mode="decal"
							origin={centre}
							positions={RIM_STOPS}
							start={0}
							transform={TO_NOON}
						/>
						<BlurMask blur={HERO.rimBlur} style="normal" />
					</Path>
				)}
				<Path path={ring} strokeWidth={HERO.rimW} style="stroke">
					<SweepGradient
						c={centre}
						colors={spectrum}
						end={sweepEnd}
						mode="decal"
						origin={centre}
						positions={RIM_STOPS}
						start={0}
						transform={TO_NOON}
					/>
				</Path>
			</Group>
		</Canvas>
	);
}
