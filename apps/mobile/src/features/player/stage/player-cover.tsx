import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { CoverImage } from "@/components/shared/cover-image";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { useTokenColor } from "@/lib/use-token-color";
import { usePlayer } from "../player-data";
import { MOTION, P } from "../player-metrics";
import type { Playhead } from "../scrub/use-playhead";

const REDUCED = { duration: REDUCED_FADE_MS, ...PLAY_AS_CHOSEN };

/** The 288 pt cover. Paused, it eases to .88; a scrub holds it full size. Reduce Motion keeps
 * it still. */
export function PlayerCover({
	head,
	reduced,
}: {
	head: Playhead;
	reduced: boolean;
}) {
	const { state } = usePlayer();
	const shadow = useTokenColor("player-shadow");
	const on = useSharedValue(state.playing ? 1 : 0);
	useEffect(() => {
		const to = state.playing ? 1 : 0;
		on.set(reduced ? withTiming(to, REDUCED) : withSpring(to, MOTION.cover));
	}, [state.playing, reduced, on]);
	const style = useAnimatedStyle(() => {
		const awake = Math.max(on.get(), head.held.get() ? 1 : 0);
		return {
			transform: [
				{
					scale: reduced ? 1 : P.coverPaused + (1 - P.coverPaused) * awake,
				},
			],
		};
	});
	return (
		<Animated.View
			className="self-center bg-player-ink/10"
			pointerEvents="none"
			style={[
				{
					borderCurve: "continuous",
					borderRadius: P.coverRadius,
					boxShadow: `0 30px 60px -20px ${shadow}`,
					height: P.cover,
					width: P.cover,
				},
				style,
			]}
		>
			<CoverImage
				style={{
					borderCurve: "continuous",
					borderRadius: P.coverRadius,
					height: P.cover,
					width: P.cover,
				}}
				uri={state.track?.coverUrl}
			/>
			{/* The board's 0.5 pt white ring at 8%. */}
			<View
				className="absolute inset-0 border-[0.5px] border-player-ink/8"
				style={{ borderCurve: "continuous", borderRadius: P.coverRadius }}
			/>
		</Animated.View>
	);
}
