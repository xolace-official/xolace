import { type ReactNode, useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { BadgeArt } from "@/components/shared/badge-art";
import { LinearGradient } from "@/components/shared/styled";
import type { Art } from "@/features/achievements/achievements-model";
import { BadgeBack } from "@/features/achievements/coin/badge-back";
import { COIN_D, HELD_R, type Pose } from "@/features/achievements/coin/pose";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const PERSPECTIVE = 900;
/** The band of light: a 115° gradient three times the face, swept from corner to corner. */
const BAND = COIN_D * 3;
const BAND_FROM = COIN_D - BAND;
const BAND_STOPS = [0.38, 0.5, 0.62] as const;
const BAND_START = { x: 0.05, y: 0.29 };
const BAND_END = { x: 0.95, y: 0.71 };
/** A Skia canvas that mounts while the page is still hidden never draws, so a locked badge's grey art waits this long. */
/**
 * A Skia canvas that mounts hidden or off screen never draws, so a grey (locked
 * or fallback) coin's art mounts once the coin is on screen: just after it
 * lifts from a slot on screen, or once it has landed when it comes from off it.
 */
export const GREY_AFTER = { offScreen: 640, onScreen: 60 } as const;
const SHADOW = { day: "0px 26px 50px -20px", dusk: "0px 26px 50px -18px" };

type Props = {
	pose: SharedValue<Pose>;
	art: Art;
	/** In colour (earned, and not the fallback art); a locked coin is grey and never turns. */
	lit: boolean;
	/** What the back engraves. */
	back: { title: string; date: string; sparks: number };
	/** Bumped on each open, so a grey coin's art mounts again once it's on screen. */
	n: number;
	/** How long after the open the grey art may mount (`GREY_AFTER`). */
	greyAfterMs: number;
	dark: boolean;
};

/**
 * The held badge: two faces, each turned on its own (so the face away from you
 * is simply hidden), inside one view that flies. Transforms only.
 */
export function Coin({ pose, art, lit, back, n, greyAfterMs, dark }: Props) {
	const shadowColor = useTokenColor(
		dark ? "badge-shadow-dusk" : "badge-shadow-day"
	);
	const fly = useAnimatedStyle(() => {
		const p = pose.get();
		return {
			opacity: p.alpha,
			transform: [
				{ translateX: p.cx - HELD_R },
				{ translateY: p.cy - HELD_R },
				{ scale: p.r / HELD_R },
			],
		};
	});
	const [drawn, setDrawn] = useState(0);
	useEffect(() => {
		if (lit || drawn === n) {
			return;
		}
		const id = setTimeout(() => setDrawn(n), greyAfterMs);
		return () => clearTimeout(id);
	}, [lit, drawn, n, greyAfterMs]);
	const disc = {
		borderRadius: HELD_R,
		boxShadow: `${dark ? SHADOW.dusk : SHADOW.day} ${shadowColor}`,
		height: COIN_D,
		width: COIN_D,
	};
	// The coloured art, the band and the back stay mounted; a locked badge hides them.
	const hide = lit ? undefined : "hidden";
	return (
		<Animated.View
			className="absolute top-0 left-0"
			pointerEvents="none"
			style={[{ height: COIN_D, width: COIN_D }, fly]}
		>
			<Face back={false} pose={pose}>
				<View style={disc}>
					<View className="overflow-hidden" style={disc}>
						<View className={hide}>
							<BadgeArt
								lit
								size={COIN_D}
								source={art.source}
								thumbhash={art.thumbhash}
							/>
						</View>
						{!lit && drawn === n ? (
							<BadgeArt lit={false} size={COIN_D} source={art.source} />
						) : null}
						<View className={cn("absolute top-0 left-0", hide)}>
							<Band pose={pose} />
						</View>
					</View>
				</View>
			</Face>
			<View className={hide}>
				<Face back pose={pose}>
					<View style={disc}>
						<BadgeBack {...back} />
					</View>
				</Face>
			</View>
		</Animated.View>
	);
}

function Face({
	pose,
	back,
	children,
}: {
	pose: SharedValue<Pose>;
	back: boolean;
	children: ReactNode;
}) {
	const style = useAnimatedStyle(() => {
		const p = pose.get();
		const turn = p.spin + p.tiltY + (back ? Math.PI : 0);
		return {
			opacity: Math.cos(turn) * Math.cos(p.tiltX) >= 0 ? 1 : 0,
			transform: [
				{ perspective: PERSPECTIVE },
				{ rotateX: `${p.tiltX}rad` },
				{ rotateY: `${turn}rad` },
				{ rotateZ: `${p.roll}rad` },
			],
		};
	});
	return (
		<Animated.View className="absolute top-0 left-0" style={style}>
			{children}
		</Animated.View>
	);
}

/** A band of light crossing the face as it lands (no screen blend in React Native). */
function Band({ pose }: { pose: SharedValue<Pose> }) {
	const light = useTokenColor("badge-band");
	const clear = useTokenColor("badge-band-clear");
	const style = useAnimatedStyle(() => {
		const band = pose.get().band;
		const on = band >= 0 && band <= 1;
		const off = BAND_FROM * (1 - Math.min(1, Math.max(0, band)));
		return {
			opacity: on ? 1 : 0,
			transform: [{ translateX: off }, { translateY: off }],
		};
	});
	return (
		<Animated.View
			className="absolute top-0 left-0"
			pointerEvents="none"
			style={[{ height: BAND, width: BAND }, style]}
		>
			<LinearGradient
				className="flex-1"
				colors={[clear, light, clear]}
				end={BAND_END}
				locations={BAND_STOPS}
				start={BAND_START}
			/>
		</Animated.View>
	);
}
