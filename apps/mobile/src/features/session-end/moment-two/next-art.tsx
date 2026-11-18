import { useEffect } from "react";
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
import { AppText } from "@/components/shared/app-text";
import { Flux } from "@/components/shared/flux";
import { Image, LinearGradient } from "@/components/shared/styled";
import { useThemeFaces } from "@/design/fonts";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import type { SessionColors } from "../session-colors";
import type { ListenerCard } from "../session-end-data";
import type { NextKey } from "../session-end-model";
import { LAYOUT } from "../session-look";
import { clamp01 } from "../timeline";

const N = LAYOUT.next;
const A = LAYOUT.avatar;
const SHIMMER_MS = 1400;
/** The board's waveform glyph (`.gs`, 24 × 24, stroke 2.2). */
const WAVE = "M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2";
const WAVE_BOX = 24;
const WAVE_STROKE = 2.2;
/** `.av`: three Flux poses for the kindling, each fitted by height in a 40 pt circle. */
const AVATAR_POSES = ["sitting", "whisper", "bundle"] as const;
const INITIAL = { line: 22, size: 17 } as const;

type Props = {
	k: NextKey;
	colors: SessionColors;
	listener: ListenerCard | null;
};

/** The next card's left: the kindling avatars, a listener, the listen tile, or the loading tile. */
export function NextArt({ k, colors, listener }: Props) {
	if (k === "listener" && listener) {
		return <ListenerArt listener={listener} />;
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

/** A listener: their photo, or their initial on the violet wash as the board draws it. */
function ListenerArt({ listener }: { listener: ListenerCard }) {
	const faces = useThemeFaces();
	return (
		<View
			className="items-center justify-center overflow-hidden rounded-full bg-accent-wash"
			style={{ height: N.icon, width: N.icon }}
		>
			{listener.photoUrl ? (
				<Image
					className="absolute inset-0"
					contentFit="cover"
					source={{ uri: listener.photoUrl }}
				/>
			) : (
				<AppText
					color="accentInk"
					maxFontSizeMultiplier={1}
					style={{
						fontFamily: faces["display-bold"],
						fontSize: INITIAL.size,
						lineHeight: INITIAL.line,
					}}
					variant="headline"
				>
					{listener.name.slice(0, 1).toUpperCase()}
				</AppText>
			)}
		</View>
	);
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

/** `.sk`: a bar the well colour with a lighter band sweeping through it (1.4 s, linear); still under Reduce Motion. */
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
