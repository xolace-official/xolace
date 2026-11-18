import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { usePlayer } from "../player-data";
import { fromCover, INK, P, WAVE } from "../player-metrics";
import { ScrubA11y } from "./scrub-a11y";
import { ScrubPill } from "./scrub-pill";
import type { Playhead } from "./use-playhead";
import { useScrub } from "./use-scrub";

type BarProps = {
	i: number;
	v: number;
	bars: number;
	head: Playhead;
	boxW: SharedValue<number>;
	reduced: boolean;
};

/** One bar: rest 4 + peak × 28, touched 4 + peak × 36, swelling near the finger; played bars
 * are full white. All on the UI thread. */
function Bar({ i, v, bars, head, boxW, reduced }: BarProps) {
	const style = useAnimatedStyle(() => {
		const g = head.grow.get();
		let h = WAVE.base + v * (WAVE.rest + (WAVE.touched - WAVE.rest) * g);
		if (!reduced && head.touch.get()) {
			const dx = ((i + 0.5) * boxW.get()) / bars - head.fingerX.get();
			h *=
				1 +
				WAVE.swell * g * Math.exp(-(dx * dx) / (2 * WAVE.sigma * WAVE.sigma));
		}
		return {
			height: h,
			opacity: i < head.shown.get() * bars ? 1 : INK.barRest,
		};
	});
	return (
		<Animated.View
			className="min-w-0 flex-1 rounded-[2px] bg-player-ink"
			style={style}
		/>
	);
}

/** The waveform scrubber for spoken tracks (§2): thin bars, 32 pt at rest. */
export function Waveform({
	peaks,
	duration,
	head,
	reduced,
}: {
	peaks: readonly number[];
	duration: number;
	head: Playhead;
	reduced: boolean;
}) {
	const { actions } = usePlayer();
	const boxW = useSharedValue(0);
	const bars = peaks.length;
	const pan = useScrub({
		bars,
		boxW,
		duration,
		head,
		onRelease: actions.seek,
		reduced,
	});
	return (
		<ScrubA11y
			style={{
				height: P.waveH,
				left: P.side,
				right: P.side,
				top: fromCover(P.waveTop),
			}}
		>
			<GestureDetector gesture={pan}>
				<View
					className="flex-1 flex-row items-center"
					onLayout={(e) => boxW.set(e.nativeEvent.layout.width)}
					style={{ gap: WAVE.gap }}
				>
					{peaks.map((v, i) => (
						<Bar
							bars={bars}
							boxW={boxW}
							head={head}
							i={i}
							// The bars never reorder: a track's peaks are fixed.
							key={`bar-${i.toString()}`}
							reduced={reduced}
							v={v}
						/>
					))}
					<ScrubPill
						above={WAVE.pillAboveWave}
						boxW={boxW}
						duration={duration}
						head={head}
					/>
				</View>
			</GestureDetector>
		</ScrubA11y>
	);
}
