import { type SurfaceType, useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { Image, LinearGradient } from "@/components/shared/styled";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { useQuoteInk } from "../chrome/quote-ink";
import { type QuoteBackground, readyOn } from "../quotes-model";
import { POSTER_WASH } from "../quotes-palette";

const FIRST_FRAME_FADE = 180;
const PERCENT = 100;

const contentPosition = (b: QuoteBackground) =>
	b.focus
		? ({
				left: `${Math.round(b.focus.x * PERCENT)}%`,
				top: `${Math.round(b.focus.y * PERCENT)}%`,
			} as const)
		: ("center" as const);

export function BackgroundLayer({
	background: b,
	play,
	onReady,
	surfaceType,
}: {
	background: QuoteBackground;
	play: boolean;
	/** Called once the layer has drawn, unless `readyOn` is "now". */
	onReady?: () => void;
	/**
	 * Android only. A loop in a small card (the share preview) wants "textureView": the
	 * default SurfaceView sits behind the window and cuts through the poster drawn under
	 * it, so the card shows black until frames arrive. Full-screen loops keep the default.
	 */
	surfaceType?: SurfaceType;
}) {
	const { night } = useQuoteInk();
	const ready = readyOn(b, play);
	const loop = ready === "frame";
	const imageReady = ready === "image" ? () => onReady?.() : undefined;

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
					onDisplay={imageReady}
					onError={imageReady}
					source={b.image}
					transition={0}
				/>
			)}
			{loop && b.videoUrl && (
				<LoopVideo
					key={b.key}
					onReady={onReady}
					surfaceType={surfaceType}
					url={b.videoUrl}
				/>
			)}
		</View>
	);
}

function LoopVideo({
	url,
	onReady,
	surfaceType,
}: {
	url: string;
	onReady?: () => void;
	surfaceType?: SurfaceType;
}) {
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
				surfaceType={surfaceType}
			/>
		</Animated.View>
	);
}
