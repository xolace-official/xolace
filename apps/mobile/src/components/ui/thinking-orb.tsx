// ThinkingOrb: a monochrome dotted orb whose six states show what an agent is doing.
// Dots are quantised into BUCKETS ink levels, each emitted as one animated path, so a
// frame costs eight prop writes. Maths in thinking-orb-geometry.ts, states in -states.ts.
import { useEffect } from "react";
import { View, type ViewProps } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedProps,
	useFrameCallback,
	useReducedMotion,
	useSharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { scheduleOnUI } from "react-native-worklets";
import { useCSSVariable } from "uniwind";
import { cn } from "@/lib/utils";
import { BUCKETS, type Profile } from "./thinking-orb-geometry";
import { renderFrame, type ThinkingOrbState } from "./thinking-orb-states";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The frame a still orb shows. Far enough in that no state is at its start. */
const STILL_FRAME = 2.4;

export type { ThinkingOrbState };

/** What each state is doing, for anyone who cannot see it. */
const STATE_LABEL: Record<ThinkingOrbState, string> = {
	composing: "Composing",
	listening: "Listening",
	searching: "Searching",
	shaping: "Shaping",
	solving: "Solving",
	working: "Working",
};

const PROFILES: Record<ThinkingOrbState, { md: Profile; sm: Profile }> = {
	composing: {
		md: { density: 44, radius: 0.85, rows: 5, speed: 2.3 },
		sm: { density: 20, radius: 1.1, rows: 3, speed: 3.1 },
	},
	listening: {
		md: { density: 24, radius: 1, rows: 10, speed: 4.4 },
		sm: { density: 11, radius: 1.6, rows: 5, speed: 4.0 },
	},
	searching: {
		md: { density: 28, radius: 1.15, rows: 11, speed: 2.0 },
		sm: { density: 12, radius: 1.75, rows: 5, speed: 2.7 },
	},
	shaping: {
		md: { density: 26, radius: 1, rows: 1, speed: 2.4 },
		sm: { density: 14, radius: 1.05, rows: 1, speed: 2.1 },
	},
	solving: {
		md: { density: 24, radius: 1.05, rows: 10, speed: 1.8 },
		sm: { density: 11, radius: 1.9, rows: 5, speed: 2.0 },
	},
	working: {
		md: { density: 26, radius: 1, rows: 9, speed: 1.9 },
		sm: { density: 12, radius: 2.4, rows: 4, speed: 3.9 },
	},
};

const BUCKET_INDICES = Array.from(
	{ length: BUCKETS },
	(_unused, index) => index
);

/** One ink level's worth of dots as a single path; a component so each bucket owns one hook. */
function Bucket({
	index,
	paths,
	ink,
}: {
	index: number;
	paths: SharedValue<string[]>;
	ink: string;
}) {
	const animatedProps = useAnimatedProps(() => ({
		d: paths.value[index] ?? "",
	}));

	return (
		<AnimatedPath
			animatedProps={animatedProps}
			fill={ink}
			fillOpacity={(index + 0.5) / BUCKETS}
		/>
	);
}

export interface ThinkingOrbProps extends Omit<ViewProps, "children"> {
	/** Overrides the per-state default announced to screen readers. */
	accessibilityLabel?: string;
	className?: string;
	/** Ink colour. Defaults to the theme's foreground, so the orb inverts with it. */
	color?: string;
	/** Freeze on the current frame. */
	paused?: boolean;
	/** Side in pixels. At or below 32 the orb switches to a separate small tuning: fewer,
	 * larger, faster dots. */
	size?: number;
	/** Multiplier on the state's own speed. */
	speed?: number;
	/** Which of the six animations to show. */
	state?: ThinkingOrbState;
}

export function ThinkingOrb({
	className,
	state = "working",
	size = 64,
	speed = 1,
	paused = false,
	color,
	accessibilityLabel,
	style,
	...props
}: ThinkingOrbProps) {
	const reducedMotion = useReducedMotion();
	const foreground = useCSSVariable("--color-foreground");
	const ink =
		color ?? (typeof foreground === "string" ? foreground : "#0a0a0a");

	const profile = PROFILES[state][size <= 32 ? "sm" : "md"];
	const clock = useSharedValue(0);
	const paths = useSharedValue<string[]>([]);

	const still = !(paused || reducedMotion);

	const frame = useFrameCallback((info) => {
		"worklet";
		// Accumulated so `speed` can change mid-animation without a jump; a dropped
		// frame is clamped so a hitch does not play back as a lurch.
		const delta = Math.min(info.timeSincePreviousFrame ?? 16, 48) / 1000;
		clock.value += delta * profile.speed * speed;
		paths.value = renderFrame(state, size, clock.value, profile);
	}, false);

	const { setActive } = frame;
	useEffect(() => {
		setActive(still);
		return () => setActive(false);
	}, [still, setActive]);

	// Reduced motion and `paused` show a representative frame, not an empty orb.
	useEffect(() => {
		if (still) {
			return;
		}
		scheduleOnUI(() => {
			"worklet";
			paths.value = renderFrame(
				state,
				size,
				clock.value > 0 ? clock.value : STILL_FRAME,
				profile
			);
		});
	}, [still, state, size, profile, clock, paths]);

	return (
		<View
			{...props}
			accessibilityLabel={accessibilityLabel ?? STATE_LABEL[state]}
			accessibilityRole="image"
			className={cn("items-center justify-center", className)}
			style={[{ height: size, width: size }, style]}
		>
			<Svg height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
				{/* Bucket order is depth order (faint is far), so no sort is needed. */}
				{BUCKET_INDICES.map((index) => (
					<Bucket index={index} ink={ink} key={index} paths={paths} />
				))}
			</Svg>
		</View>
	);
}

ThinkingOrb.displayName = "ThinkingOrb";
