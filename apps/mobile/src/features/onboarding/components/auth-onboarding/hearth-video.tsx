// The looping fire clip behind the deck. A poster (frame 0) sits under the ~200-600ms
// black `VideoView` until `readyToPlay`; the AppState listener resumes the player,
// which backgrounding pauses without resuming.

import { useEvent } from "expo";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import { AppState, StyleSheet } from "react-native";
import Animated, {
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";

export const HearthVideo = ({
	width,
	height,
}: {
	width: number;
	height: number;
}) => {
	const player = useVideoPlayer(
		require("@/assets/videos/hearth-test.mp4"),
		(p) => {
			p.loop = true;
			p.muted = true;
			p.play();
		}
	);

	useEffect(() => {
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "active" && !player.playing) {
				player.play();
			}
		});
		return () => sub.remove();
	}, [player]);

	const { status } = useEvent(player, "statusChange", {
		status: player.status,
	});
	const ready = status === "readyToPlay";

	const fade = useAnimatedStyle(() => ({
		opacity: withTiming(ready ? 1 : 0, { duration: 420 }),
	}));

	return (
		<>
			<Image
				contentFit="cover"
				pointerEvents="none"
				source={require("@/assets/videos/hearth-poster.jpg")}
				style={{ height, width }}
			/>
			<Animated.View style={[styles.overlay, { height, width }, fade]}>
				<VideoView
					contentFit="cover"
					nativeControls={false}
					player={player}
					pointerEvents="none"
					style={{ height, width }}
				/>
			</Animated.View>
		</>
	);
};

const styles = StyleSheet.create({
	overlay: { position: "absolute" },
});
