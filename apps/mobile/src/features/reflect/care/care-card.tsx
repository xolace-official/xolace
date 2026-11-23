import { useEffect } from "react";
import { Presets } from "react-native-pulsar";
import Animated, {
	Easing,
	LinearTransition,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { GlassButton } from "@/components/shared/glass-button";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { FONTS } from "@/design/type";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { LAYOUT } from "../layout";
import { CARE_IN, MORPH, TIDE } from "../motion";
import { useReflect } from "../reflect-data";
import { useReflectDraw } from "../reflect-draw";
import { timeline } from "../reflect-model";
import { Breathe } from "./breathe";
import { Resources } from "./resources";

const C = LAYOUT.care;
const S_MS = 1000;
const TIDE_EASE = Easing.bezier(0.37, 0, 0.63, 1);
const CARD_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);
const OPACITY_LEAD = 1.2;
const TITLE = {
	fontFamily: FONTS.displayBold,
	fontSize: 24,
	letterSpacing: -0.48,
	lineHeight: 28,
} as const;
const GROW = LinearTransition.springify()
	.stiffness(MORPH.spring.stiffness)
	.damping(MORPH.spring.damping)
	.mass(MORPH.spring.mass);

export function CareCard() {
	const { state, actions } = useReflect();
	const { reduced, light } = useReflectDraw();
	const shadow = useTokenColor("reflect-care-shadow");
	const rise = useSharedValue(0);
	const { care, landN, mirror, mv } = state;
	const lines = mv === 2 && mirror.revised ? mirror.revised : mirror.first;
	const after = (timeline(lines, true).writeEnd + CARE_IN.after) * S_MS;

	useEffect(() => {
		const tide = light.tide;
		tide.set(
			withTiming(TIDE.rest, {
				duration: reduced ? REDUCED_FADE_MS : TIDE.riseMs,
				easing: TIDE_EASE,
				...PLAY_AS_CHOSEN,
			})
		);
		rise.set(0);
		rise.set(
			withDelay(
				reduced ? 0 : after,
				withTiming(1, {
					duration: reduced ? REDUCED_FADE_MS : CARE_IN.ms,
					easing: CARD_EASE,
					...PLAY_AS_CHOSEN,
				})
			)
		);
		const id = setTimeout(() => Presets.peal(), reduced ? 0 : after);
		return () => {
			clearTimeout(id);
			tide.set(
				withTiming(0, {
					duration: TIDE.riseMs,
					easing: TIDE_EASE,
					...PLAY_AS_CHOSEN,
				})
			);
		};
	}, [landN, light.tide, rise, after, reduced]);

	const style = useAnimatedStyle(() => ({
		opacity: Math.min(1, rise.get() * OPACITY_LEAD),
		transform: [{ translateY: CARE_IN.rise * (1 - rise.get()) }],
	}));

	return (
		<Animated.View
			className="absolute gap-3 rounded-[28px] border border-continuous border-separator bg-surface px-4.5 pt-5 pb-4"
			layout={reduced ? undefined : GROW}
			style={[
				{
					bottom: C.bottom,
					boxShadow: `0px 18px 40px -24px ${shadow}`,
					left: C.side,
					right: C.side,
				},
				style,
			]}
		>
			{care === "main" ? (
				<>
					<AppText accessibilityRole="header" style={TITLE} variant="title">
						{COPY.care.title}
					</AppText>
					<AppText
						className="text-[15px] leading-[22.2px]"
						color="muted"
						variant="callout"
					>
						{COPY.care.body}
					</AppText>
					<Big label={COPY.care.show} onPress={actions.showResources} />
					<PressScale
						className="h-12 items-center justify-center rounded-full bg-surface-secondary"
						onPress={() => actions.patch({ care: "breath" })}
					>
						<AppText
							className="text-[15.5px]"
							variant="callout"
							weight="semibold"
						>
							{COPY.care.breathe}
						</AppText>
					</PressScale>
					<PressScale
						className="h-11 items-center justify-center"
						haptic={playSoftPress}
						onPress={actions.notNow}
					>
						<AppText
							className="text-[15px]"
							color="muted"
							variant="callout"
							weight="medium"
						>
							{COPY.care.notNow}
						</AppText>
					</PressScale>
				</>
			) : null}
			{care === "res" ? (
				<>
					<AppText accessibilityRole="header" style={TITLE} variant="title">
						{COPY.care.resTitle}
					</AppText>
					<Resources
						onOpen={actions.openResource}
						reduced={reduced}
						rows={state.resources}
					/>
					<Big label={COPY.care.seen} onPress={actions.resourcesSeen} />
				</>
			) : null}
			{care === "breath" ? (
				<Breathe onBack={() => actions.patch({ care: "main" })} />
			) : null}
		</Animated.View>
	);
}

function Big({ label, onPress }: { label: string; onPress: () => void }) {
	return (
		<GlassButton
			className="h-14 items-center justify-center rounded-full"
			haptic={playAffirmativePress}
			onPress={onPress}
		>
			<AppText
				className="text-[17px]"
				color="background"
				variant="body"
				weight="semibold"
			>
				{label}
			</AppText>
		</GlassButton>
	);
}
