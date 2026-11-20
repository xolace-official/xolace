import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { EASING, EaseView, enter, FADE_IN, POP } from "@/design/ease";
import { RATE_COPY } from "../copy";
import { type Ember, SCENE_MOTION as M, STAR_PATH, STARS } from "./ember-scene";

const LEAVES: readonly (readonly [number, number, number])[] = [
	[13, 30, -38],
	[10.5, 23, -22],
	[9.5, 16, -6],
	[10.5, 9.5, 12],
	[13.5, 4, 30],
];
const SPRIG = { h: 66, w: 40 } as const;
const STEM_WIDTH = 1.3;
const FLIP = { transform: [{ scaleX: -1 }] };

type Lit = { ember: Ember; reduced: boolean };

function Sprig({ flip, ember, reduced }: Lit & { flip?: boolean }) {
	const timing = {
		duration: M.leaf.ms,
		easing: EASING.easeOut,
		type: "timing",
	} as const;
	const props = reduced
		? FADE_IN
		: enter(
				{ opacity: 0, scale: M.leaf.from },
				{ opacity: 1, scale: 1 },
				timing,
				timing,
				M.leaf.delay
			);
	return (
		<EaseView {...props}>
			<Svg
				height={SPRIG.h}
				style={flip ? FLIP : undefined}
				viewBox="0 0 22 36"
				width={SPRIG.w}
			>
				<Path
					d="M16 34C9 28 7 18 13 3"
					fill="none"
					stroke={ember["rate-stem"]}
					strokeLinecap="round"
					strokeWidth={STEM_WIDTH}
				/>
				{LEAVES.map(([x, y, a]) => (
					<Path
						d={`M${x} ${y}c-5-1-7-4-7-7 4 0 7 2 7 7Z`}
						fill={ember["rate-leaf"]}
						key={`${x}-${y}`}
						transform={`rotate(${a} ${x} ${y})`}
					/>
				))}
			</Svg>
		</EaseView>
	);
}

function Star({ i, ember, reduced }: Lit & { i: number }) {
	const s = STARS[i];
	if (!s) {
		return null;
	}
	const props = reduced
		? FADE_IN
		: enter(
				{ opacity: 0, rotate: M.star.fromTilt, scale: M.star.fromScale },
				{ opacity: 1, rotate: 0, scale: 1 },
				{ duration: M.star.fadeMs, easing: EASING.easeOut, type: "timing" },
				POP,
				M.star.delay + i * M.star.stagger
			);
	return (
		<View
			style={{ transform: [{ translateY: s.y }, { rotate: `${s.tilt}deg` }] }}
		>
			<EaseView {...props}>
				<Svg height={s.size} viewBox="0 0 24 24" width={s.size}>
					<Path d={STAR_PATH} fill={ember[s.color]} />
				</Svg>
			</EaseView>
		</View>
	);
}

export function LaurelStars(props: Lit) {
	return (
		<View
			accessibilityLabel={RATE_COPY.starsA11y}
			accessibilityRole="image"
			accessible
			className="flex-row items-center gap-2.5"
		>
			<Sprig {...props} />
			<View className="-mt-2.5 flex-row items-end gap-[3px]">
				{STARS.map((s, i) => (
					<Star {...props} i={i} key={`${s.size}-${s.tilt}`} />
				))}
			</View>
			<Sprig {...props} flip />
		</View>
	);
}
