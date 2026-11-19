import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { Image, LinearGradient } from "@/components/shared/styled";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useQuoteInk } from "../chrome/quote-ink";
import type { QuoteBackground } from "../quotes-model";
import { POSTER_WASH } from "../quotes-palette";

/** A loop's still fades out once its first frame is on screen. */
const FIRST_FRAME_FADE = 180;
const PERCENT = 100;

const contentPosition = (b: QuoteBackground) =>
	b.focus
		? ({
				left: `${Math.round(b.focus.x * PERCENT)}%`,
				top: `${Math.round(b.focus.y * PERCENT)}%`,
			} as const)
		: ("center" as const);

/**
 * One background, filling its parent: Poster's wash, Night's colour, a still, or a loop over its
 * first frame. `play` mounts the loop's video; otherwise a loop shows its still.
 */
export function BackgroundLayer({
	background: b,
	play,
	onReady,
}: {
	background: QuoteBackground;
	play: boolean;
	onReady?: () => void;
}) {
	const { night } = useQuoteInk();
	const loop = b.kind === "loop" && play && b.videoUrl !== undefined;
	useEffect(() => {
		if (!loop) {
			onReady?.();
		}
	}, [loop, onReady]);

	return (
		<View
			accessibilityElementsHidden
			className="absolute inset-0"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
		>
			{b.drawn === "poster" && (
				<LinearGradient
					className="absolute inset-0"
					colors={POSTER_WASH.colors}
					end={POSTER_WASH.end}
					locations={POSTER_WASH.locations}
					start={POSTER_WASH.start}
				/>
			)}
			{b.drawn === "night" && (
				<View className="absolute inset-0" style={{ backgroundColor: night }} />
			)}
			{b.image !== undefined && (
				<Image
					cachePolicy="disk"
					className="absolute inset-0"
					contentFit="cover"
					contentPosition={contentPosition(b)}
					source={b.image}
					transition={0}
				/>
			)}
			{loop && b.videoUrl && (
				<LoopVideo key={b.key} onReady={onReady} url={b.videoUrl} />
			)}
		</View>
	);
}

/** Muted, looping, no controls; cached on disk after the first play. */
function LoopVideo({ url, onReady }: { url: string; onReady?: () => void }) {
	const shown = useSharedValue(0);
	const player = useVideoPlayer({ uri: url, useCaching: true }, (p) => {
		p.loop = true;
		p.muted = true;
		p.audioMixingMode = "mixWithOthers";
		p.play();
	});
	const style = useAnimatedStyle(() => ({ opacity: shown.get() }));
	return (
		<Animated.View className="absolute inset-0" style={style}>
			<VideoView
				allowsPictureInPicture={false}
				contentFit="cover"
				nativeControls={false}
				onFirstFrameRender={() => {
					shown.set(
						withTiming(1, { duration: FIRST_FRAME_FADE, ...PLAY_AS_CHOSEN })
					);
					onReady?.();
				}}
				player={player}
				style={StyleSheet.absoluteFill}
			/>
		</Animated.View>
	);
}
