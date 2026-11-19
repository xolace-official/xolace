import { useIsFocused } from "expo-router";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";
import { CoverImage } from "@/components/shared/cover-image";
import { Equaliser } from "@/components/shared/equaliser";
import { Icon } from "@/components/shared/icon";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { EX_TIMING, EXS } from "@/features/explore/explore-style";
import { useTokenColor } from "@/lib/use-token-color";

export type PlayingMark = "playing" | "paused" | null;

type Props = {
	uri: string;
	thumbhash?: string;
	recyclingKey: string;
	size: number;
	radius: number;
	locked: boolean;
	playing: PlayingMark;
};

/**
 * A track's cover: production's art with Explore's half-point edge, the lock for a free listener,
 * and the playing mark (a veil and the bars) while it's the track in the mini player.
 */
export function TrackCover({
	uri,
	thumbhash,
	recyclingKey,
	size,
	radius,
	locked,
	playing,
}: Props) {
	const focused = useIsFocused();
	const on = playing !== null;
	const veil = useAnimatedStyle(() => ({
		opacity: withTiming(on ? 1 : 0, {
			duration: on ? EX_TIMING.veilInMs : EX_TIMING.veilOutMs,
			...PLAY_AS_CHOSEN,
		}),
	}));
	const box = { borderRadius: radius, height: size, width: size };

	return (
		<View style={{ height: size, width: size }}>
			<View
				className="overflow-hidden border-continuous bg-surface-secondary"
				style={box}
			>
				<CoverImage
					recyclingKey={recyclingKey}
					style={box}
					thumbhash={thumbhash}
					uri={uri}
				/>
				<View
					className="absolute inset-0 border-[0.5px] border-continuous border-foreground/6"
					pointerEvents="none"
					style={{ borderRadius: radius }}
				/>
				<Animated.View
					className="absolute inset-0 items-center justify-center bg-cover-scrim/30"
					pointerEvents="none"
					style={veil}
				>
					{on ? <Equaliser playing={playing === "playing" && focused} /> : null}
				</Animated.View>
			</View>
			{locked ? <LockBadge /> : null}
		</View>
	);
}

/** An 18 pt circle at the cover's bottom right, 4 pt in, with a 9 pt lock (production's look). */
function LockBadge() {
	const ink = useTokenColor("foreground");
	const L = EXS.lock;
	return (
		<View
			accessibilityElementsHidden
			className="absolute items-center justify-center rounded-full bg-background/90"
			importantForAccessibility="no-hide-descendants"
			style={{ bottom: L.inset, height: L.size, right: L.inset, width: L.size }}
		>
			<Icon
				color={ink}
				name={{ android: "lock", ios: "lock.fill" }}
				size={L.glyph}
				weight="bold"
			/>
		</View>
	);
}
