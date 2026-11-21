import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { Icon } from "@/components/shared/icon";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { playSoftPress, tap } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { PLAYER_COPY } from "../copy";
import { usePlayer } from "../player-data";
import { fromCover, MOTION, OUT, P } from "../player-metrics";
import { SkipGlyph } from "./skip-glyph";

const SKIP_S = 15;
const SKIP_GLYPH = 34;
const PLAY_GLYPH = 30;
const DIM = { duration: 150, ...PLAY_AS_CHOSEN };
const TURN_OUT = { duration: MOTION.turnOut, easing: OUT, ...PLAY_AS_CHOSEN };
const DISC_IN = { duration: MOTION.discIn, ...PLAY_AS_CHOSEN };
const GLYPH_FADE = { duration: MOTION.glyphFade, ...PLAY_AS_CHOSEN };

function Skip({ dir, reduced }: { dir: -1 | 1; reduced: boolean }) {
	const { actions } = usePlayer();
	const turn = useSharedValue(0);
	const dim = useSharedValue(1);
	const glyph = useAnimatedStyle(() => ({
		transform: [{ rotate: `${turn.get()}deg` }],
	}));
	const target = useAnimatedStyle(() => ({ opacity: dim.get() }));
	return (
		<Pressable
			accessibilityLabel={dir < 0 ? PLAYER_COPY.back15 : PLAYER_COPY.fwd15}
			accessibilityRole="button"
			onPress={() => {
				tap();
				actions.skip(dir * SKIP_S);
				if (!reduced) {
					turn.set(
						withSequence(
							withTiming(dir * MOTION.turn, TURN_OUT),
							withSpring(0, MOTION.turnBack)
						)
					);
				}
			}}
			onPressIn={() => dim.set(withTiming(MOTION.dim, DIM))}
			onPressOut={() => dim.set(withTiming(1, DIM))}
		>
			<Animated.View
				className="size-14 items-center justify-center"
				style={target}
			>
				<Animated.View style={[{ transformOrigin: "50% 54%" }, glyph]}>
					<SkipGlyph dir={dir} size={SKIP_GLYPH} />
				</Animated.View>
			</Animated.View>
		</Pressable>
	);
}

function PlayDisc({ reduced }: { reduced: boolean }) {
	const { state, actions } = usePlayer();
	const { playing } = state;
	const glyphInk = useTokenColor("player-scrim");
	const scale = useSharedValue(1);
	const morph = useSharedValue(playing ? 1 : 0);
	const fade = useSharedValue(playing ? 1 : 0);
	useEffect(() => {
		const on = playing ? 1 : 0;
		fade.set(withTiming(on, GLYPH_FADE));
		morph.set(reduced ? on : withSpring(on, MOTION.glyph));
	}, [playing, reduced, fade, morph]);
	const disc = useAnimatedStyle(() => ({
		transform: [{ scale: scale.get() }],
	}));
	const pause = useAnimatedStyle(() => {
		const m = morph.get();
		return {
			opacity: fade.get(),
			transform: reduced
				? []
				: [{ scale: 0.5 + 0.5 * m }, { rotate: `${-30 * (1 - m)}deg` }],
		};
	});
	const play = useAnimatedStyle(() => {
		const m = morph.get();
		return {
			opacity: 1 - fade.get(),
			transform: reduced
				? []
				: [{ scale: 1 - 0.5 * m }, { rotate: `${30 * m}deg` }],
		};
	});
	return (
		<Pressable
			accessibilityLabel={playing ? PLAYER_COPY.pause : PLAYER_COPY.play}
			accessibilityRole="button"
			onPress={() => {
				playSoftPress();
				actions.toggle();
			}}
			onPressIn={() => scale.set(reduced ? 1 : withTiming(0.93, DISC_IN))}
			onPressOut={() => scale.set(withSpring(1, MOTION.discBack))}
		>
			<Animated.View
				className="size-19 items-center justify-center rounded-full bg-player-ink"
				style={disc}
			>
				<Animated.View className="absolute size-7.5" style={play}>
					<Icon
						color={glyphInk}
						name={{ android: "play_arrow", ios: "play.fill" }}
						size={PLAY_GLYPH}
					/>
				</Animated.View>
				<Animated.View className="absolute size-7.5" style={pause}>
					<Icon
						color={glyphInk}
						name={{ android: "pause", ios: "pause.fill" }}
						size={PLAY_GLYPH}
					/>
				</Animated.View>
			</Animated.View>
		</Pressable>
	);
}

export function Transport({ reduced }: { reduced: boolean }) {
	return (
		<View
			className="absolute inset-x-0 h-19 flex-row items-center justify-center gap-9"
			style={{ top: fromCover(P.ctrlTop) }}
		>
			<Skip dir={-1} reduced={reduced} />
			<PlayDisc reduced={reduced} />
			<Skip dir={1} reduced={reduced} />
		</View>
	);
}
