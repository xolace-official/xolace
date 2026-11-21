import { type ReactNode, useEffect } from "react";
import { View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { Flux } from "@/components/shared/flux";
import { LinearGradient } from "@/components/shared/styled";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import type { SessionColors } from "../session-colors";
import type { NextCards, NextParts } from "../session-end-data";
import type { NextKey } from "../session-end-model";
import { LAYOUT } from "../session-look";
import { clamp01 } from "../timeline";
import { InsightLead, XolacerLead } from "./next-extras";

const N = LAYOUT.next;
const A = LAYOUT.avatar;
const SHIMMER_MS = 1400;
const WAVE = "M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2";
const WAVE_BOX = 24;
const WAVE_STROKE = 2.2;
const AVATAR_POSES = ["sitting", "whisper", "bundle"] as const;

type Props = {
	k: NextKey;
	colors: SessionColors;
	cards: NextCards;
	parts: NextParts;
	letterTile: ReactNode;
	reduced: boolean;
};

export function NextArt({
	k,
	colors,
	cards,
	parts,
	letterTile,
	reduced,
}: Props) {
	if (k === "listener" && cards.listener) {
		return <XolacerLead listener={cards.listener} parts={parts} />;
	}
	const part =
		k === "unlock" ? cards.unlock?.[0] : k === "upsell" ? cards.upsell : null;
	if ((k === "unlock" || k === "upsell") && part) {
		return (
			<InsightLead domain={part} kind={k} parts={parts} reduced={reduced} />
		);
	}
	if (k === "letterRead" || k === "letterWrite") {
		return letterTile;
	}
	if (k === "listen") {
		const [bg, fg] = colors.listen;
		return (
			<View
				className="items-center justify-center"
				style={{
					backgroundColor: bg,
					borderRadius: N.iconRadius,
					height: N.icon,
					width: N.icon,
				}}
			>
				<Svg
					height={WAVE_BOX}
					viewBox={`0 0 ${WAVE_BOX} ${WAVE_BOX}`}
					width={WAVE_BOX}
				>
					<Path
						d={WAVE}
						fill="none"
						stroke={fg}
						strokeLinecap="round"
						strokeWidth={WAVE_STROKE}
					/>
				</Svg>
			</View>
		);
	}
	if (k === "loading") {
		return (
			<View
				className="bg-surface-secondary"
				style={{ borderRadius: N.iconRadius, height: N.icon, width: N.icon }}
			/>
		);
	}
	return <KindlingAvatars fills={colors.kindling} />;
}

function KindlingAvatars({ fills }: { fills: string[] }) {
	const ring = useTokenColor("surface");
	return (
		<View className="flex-row items-center">
			{AVATAR_POSES.map((pose, i) => (
				<View
					className="overflow-hidden rounded-full"
					key={pose}
					style={{
						backgroundColor: fills[i],
						boxShadow: `0 0 0 ${A.ring}px ${ring}`,
						height: A.size,
						marginLeft: i ? A.overlap : 0,
						width: A.size,
					}}
				>
					<Flux
						height={A.figure}
						pose={pose}
						style={{
							left: -A.size / 2,
							position: "absolute",
							top: A.figureTop,
						}}
						width={A.size * 2}
					/>
				</View>
			))}
		</View>
	);
}

export function Shimmer({
	reduced,
	width,
}: {
	reduced: boolean;
	width: `${number}%`;
}) {
	const well = useTokenColor("surface-secondary");
	const card = useTokenColor("surface");
	const u = useSharedValue(0);
	useEffect(() => {
		if (reduced) {
			return;
		}
		u.set(
			withRepeat(
				withTiming(1, {
					duration: SHIMMER_MS,
					easing: Easing.linear,
					...PLAY_AS_CHOSEN,
				}),
				-1,
				false
			)
		);
		return () => cancelAnimation(u);
	}, [reduced, u]);
	const band = useAnimatedStyle(() => ({
		transform: [{ translateX: `${(clamp01(u.get()) * 2 - 1) * 100}%` }],
	}));
	return (
		<View
			className="h-[11px] overflow-hidden rounded-[6px] bg-surface-secondary"
			style={{ width }}
		>
			<Animated.View className="absolute inset-0" style={band}>
				<LinearGradient
					className="flex-1"
					colors={[well, card, well]}
					end={{ x: 1, y: 0.5 }}
					start={{ x: 0, y: 0.5 }}
				/>
			</Animated.View>
		</View>
	);
}
