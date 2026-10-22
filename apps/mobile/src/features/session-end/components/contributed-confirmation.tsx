import { useThemeColor } from "heroui-native";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { Presets } from "react-native-pulsar";
import Animated, {
	Easing,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import { PillButton } from "@/src/components/shared/pill-button";

type ParticleConfig = {
	x: number;
	size: number;
	duration: number;
	delay: number;
	rise: number;
	driftX: number;
};

type EmberParticleProps = {
	config: ParticleConfig;
	color: string;
};

type Props = {
	onDone: () => void;
};

const PARTICLES: ParticleConfig[] = [
	{ delay: 0, driftX: -10, duration: 2200, rise: 130, size: 5, x: -24 },
	{ delay: 300, driftX: 6, duration: 2800, rise: 160, size: 8, x: 8 },
	{ delay: 600, driftX: -14, duration: 2000, rise: 120, size: 5, x: -6 },
	{ delay: 900, driftX: 9, duration: 2600, rise: 150, size: 7, x: 28 },
	{ delay: 1200, driftX: -6, duration: 3000, rise: 140, size: 6, x: -32 },
	{ delay: 1500, driftX: 12, duration: 2400, rise: 170, size: 9, x: 16 },
	{ delay: 1800, driftX: -16, duration: 2700, rise: 125, size: 5, x: -14 },
];

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const FADE_IN = { opacity: 1 };
const INITIAL_FADE = { opacity: 0 };
const MESSAGE_TRANSITION = {
	delay: 400,
	duration: 600,
	easing: EASE,
	type: "timing",
} as const;
const BUTTON_TRANSITION = {
	delay: 1000,
	duration: 400,
	easing: EASE,
	type: "timing",
} as const;

const styles = StyleSheet.create({
	emberContainer: { height: 160, marginBottom: 40, width: 160 },
	glowSource: { bottom: -20, height: 80, left: 40, width: 80 },
});

const EmberParticle = ({ config, color }: EmberParticleProps) => {
	const progress = useSharedValue(0);

	useEffect(() => {
		progress.set(
			withDelay(
				config.delay,
				withRepeat(
					withTiming(1, { duration: config.duration, easing: Easing.linear }),
					-1,
					false
				)
			)
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: interpolate(progress.get(), [0, 0.12, 0.55, 1], [0, 0.6, 0.35, 0]),
		transform: [
			{ translateY: interpolate(progress.get(), [0, 1], [0, -config.rise]) },
			{ translateX: interpolate(progress.get(), [0, 1], [0, config.driftX]) },
		],
	}));

	const baseStyle = {
		backgroundColor: color,
		borderRadius: config.size / 2,
		bottom: 10,
		height: config.size,
		left: 80 + config.x - config.size / 2,
		position: "absolute" as const,
		width: config.size,
	};

	return <Animated.View style={[baseStyle, animatedStyle]} />;
};

export const ContributedConfirmation = ({ onDone }: Props) => {
	const accentColor = useThemeColor("accent") as string;

	useEffect(() => {
		Presets.dewdrop();
	}, []);

	return (
		<View className="flex-1 items-center justify-center px-8 pb-20">
			{/* Ember particle field */}
			<View style={styles.emberContainer}>
				{/* Soft glow source at base */}
				<View
					className="absolute rounded-full bg-accent/8"
					style={styles.glowSource}
				/>
				{PARTICLES.map((config) => (
					<EmberParticle color={accentColor} config={config} key={config.x} />
				))}
			</View>

			<EaseView
				animate={FADE_IN}
				initialAnimate={INITIAL_FADE}
				transition={MESSAGE_TRANSITION}
			>
				<AppText className="text-center font-serif text-foreground text-lg leading-8">
					Someone out there{"\n"}will feel less alone{"\n"}because of what
					{"\n"}you shared.
				</AppText>
			</EaseView>

			<EaseView
				animate={FADE_IN}
				className="mt-10"
				initialAnimate={INITIAL_FADE}
				transition={BUTTON_TRANSITION}
			>
				<PillButton label="Done" onPress={onDone} />
			</EaseView>
		</View>
	);
};
