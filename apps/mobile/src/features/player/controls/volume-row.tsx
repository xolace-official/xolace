import { useEffect } from "react";
import { View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Icon } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";
import { PLAYER_COPY } from "../copy";
import { usePlayer } from "../player-data";
import { fromCover, INK, P } from "../player-metrics";

const THUMB = 16;
const HIT_H = 22;
const STEP = 0.1;
const LIVE_STEP = 50;
const PERCENT = 100;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function VolumeRow() {
	const { state, actions } = usePlayer();
	const quiet = useTokenColor("player-ink");
	const shadow = useTokenColor("player-shadow");
	const v = useSharedValue(state.volume);
	const w = useSharedValue(0);
	const sent = useSharedValue(Math.round(state.volume * LIVE_STEP));
	const dragging = useSharedValue(false);
	useEffect(() => {
		if (!dragging.get()) {
			v.set(state.volume);
			sent.set(Math.round(state.volume * LIVE_STEP));
		}
	}, [state.volume, v, sent, dragging]);
	const move = (x: number) => {
		"worklet";
		if (w.get() <= 0) {
			return;
		}
		const next = clamp01(x / w.get());
		v.set(next);
		const step = Math.round(next * LIVE_STEP);
		if (step !== sent.get()) {
			sent.set(step);
			scheduleOnRN(actions.setVolume, step / LIVE_STEP);
		}
	};
	const pan = usePanGesture({
		minDistance: 0,
		onBegin: (e) => {
			dragging.set(true);
			move(e.x);
		},
		onFinalize: () => {
			dragging.set(false);
			scheduleOnRN(actions.setVolume, v.get());
		},
		onUpdate: (e) => move(e.x),
	});
	const fill = useAnimatedStyle(() => ({ width: `${v.get() * PERCENT}%` }));
	const thumb = useAnimatedStyle(() => ({
		transform: [{ translateX: v.get() * w.get() - THUMB / 2 }],
	}));
	const step = (d: number) => {
		const next = clamp01(Math.round((state.volume + d) * 10) / 10);
		v.set(next);
		actions.setVolume(next);
	};
	return (
		<View
			className="absolute flex-row items-center gap-3"
			style={{
				height: HIT_H,
				left: P.side,
				right: P.side,
				top: fromCover(P.volTop),
			}}
		>
			<Icon
				color={quiet}
				name={{ android: "volume_mute", ios: "speaker.fill" }}
				size={13}
				style={{ opacity: INK.quiet }}
			/>
			<GestureDetector gesture={pan}>
				<View
					accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
					accessibilityLabel={PLAYER_COPY.volume}
					accessibilityRole="adjustable"
					accessibilityValue={{
						max: PERCENT,
						min: 0,
						now: Math.round(state.volume * PERCENT),
					}}
					accessible
					className="flex-1 justify-center"
					onAccessibilityAction={(e) =>
						step(e.nativeEvent.actionName === "increment" ? STEP : -STEP)
					}
					onLayout={(e) => w.set(e.nativeEvent.layout.width)}
					style={{ height: HIT_H }}
				>
					<View className="h-1.25 overflow-hidden rounded-full bg-player-ink/25">
						<Animated.View className="h-full bg-player-ink" style={fill} />
					</View>
					<Animated.View
						className="absolute left-0 rounded-full bg-player-ink"
						style={[
							{
								boxShadow: `0 2px 6px ${shadow}`,
								height: THUMB,
								top: (HIT_H - THUMB) / 2,
								width: THUMB,
							},
							thumb,
						]}
					/>
				</View>
			</GestureDetector>
			<Icon
				color={quiet}
				name={{ android: "volume_up", ios: "speaker.wave.3.fill" }}
				size={15}
				style={{ opacity: INK.quiet }}
			/>
		</View>
	);
}
