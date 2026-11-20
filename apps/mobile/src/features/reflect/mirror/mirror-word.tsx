import { type ReactNode, useEffect } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { FONTS } from "@/design/type";
import { FLASH, WRITE_IN } from "../motion";
import type { Timeline } from "../reflect-model";
import { easeOut, progress, smooth } from "./curves";

const SIZE = 22.5;
const MIRROR_TEXT = {
	fontFamily: FONTS.mirror,
	fontSize: SIZE,
	lineHeight: 31.95,
} as const;
const GAP = SIZE * 0.26;
const HALO_R = 14;
const GLOW_R = 12;

export type MirrorInk = {
	halo: string;
	lit: string;
	flash: string;
	glow: string;
	ember: string;
};

type Props = {
	text: string;
	order: number;
	pair: number;
	e: SharedValue<number>;
	tl: Timeline;
	heavy: boolean;
	ink: MirrorInk;
	flashN: number;
};

export function MirrorWord(p: Props) {
	const { text, order, pair, e, tl, heavy, ink, flashN } = p;
	const lights = tl.lights && pair >= 0;
	const at = WRITE_IN.base + order * tl.stagger;
	// Plain numbers for the worklets (the timeline's functions live on the JS side).
	const due = lights ? tl.litAt(pair) : 0;
	const { wordIn } = tl;
	const tap = useSharedValue(0);

	useEffect(() => {
		if (!(flashN && lights)) {
			return;
		}
		tap.set(
			withSequence(
				withTiming(1, { duration: FLASH.outMs, ...PLAY_AS_CHOSEN }),
				withTiming(0, { duration: FLASH.fadeMs, ...PLAY_AS_CHOSEN })
			)
		);
	}, [flashN, lights, tap]);

	const base = useAnimatedStyle(() => {
		const u = (e.get() - at) / wordIn;
		const shown = heavy ? Math.min(1, Math.max(0, u)) : easeOut(u);
		return {
			opacity: shown,
			transform: [{ translateY: heavy ? 0 : WRITE_IN.rise * (1 - shown) }],
		};
	});
	const halo = useAnimatedStyle(() => ({
		opacity: heavy ? 0 : Math.sin(Math.PI * progress(e.get(), at, wordIn)),
	}));
	const lit = useAnimatedStyle(() => ({
		opacity: lights ? smooth(e.get(), due, due + WRITE_IN.lightIn) : 0,
	}));
	const flash = useAnimatedStyle(() => {
		if (!lights) {
			return { opacity: 0 };
		}
		const now = e.get();
		const l = smooth(now, due, due + WRITE_IN.lightIn);
		const out = due + WRITE_IN.lightIn + WRITE_IN.flashOut;
		const landing = l * (1 - smooth(now, due + WRITE_IN.lightIn, out));
		return { opacity: Math.max(landing, tap.get()) };
	});

	return (
		<Animated.View style={[{ marginRight: GAP }, base]}>
			<AppText style={MIRROR_TEXT} variant="mirror">
				{text}
			</AppText>
			<Layer style={halo}>
				<AppText
					style={[
						MIRROR_TEXT,
						{ textShadowColor: ink.halo, textShadowRadius: HALO_R },
					]}
					variant="mirror"
				>
					{text}
				</AppText>
			</Layer>
			{lights ? (
				<>
					<Layer style={lit}>
						<AppText style={[MIRROR_TEXT, { color: ink.lit }]} variant="mirror">
							{text}
						</AppText>
					</Layer>
					<Layer style={flash}>
						<AppText
							style={[
								MIRROR_TEXT,
								{
									color: ink.flash,
									textShadowColor: ink.glow,
									textShadowRadius: GLOW_R,
								},
							]}
							variant="mirror"
						>
							{text}
						</AppText>
					</Layer>
				</>
			) : null}
		</Animated.View>
	);
}

function Layer({
	style,
	children,
}: {
	style: ReturnType<typeof useAnimatedStyle>;
	children: ReactNode;
}) {
	return (
		<Animated.View
			className="absolute inset-0"
			pointerEvents="none"
			style={style}
		>
			{children}
		</Animated.View>
	);
}

export function WordRow({ children }: { children: ReactNode }) {
	return <View className="flex-row flex-wrap">{children}</View>;
}
