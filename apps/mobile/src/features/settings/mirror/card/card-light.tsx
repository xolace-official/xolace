import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { ToneArt } from "@/features/settings/mirror/card/tone-art";
import {
	type Palette,
	usePalette,
} from "@/features/settings/mirror/card/tone-defs";
import { TONES } from "@/features/settings/mirror/copy";
import type { MirrorTone } from "@/features/settings/mirror/mirror-model";

/**
 * The card's light: five stacked layers, one per tone, whose opacities crossfade on the UI
 * thread (350 ms; at once with Reduce Motion). No React commit per frame.
 */
const FADE = { duration: 350, ...PLAY_AS_CHOSEN };

function Layer(p: {
	tone: MirrorTone;
	on: boolean;
	reduced: boolean;
	w: number;
	h: number;
	dark: boolean;
	c: Palette;
}) {
	const { on, reduced } = p;
	const o = useSharedValue(on ? 1 : 0);
	useEffect(() => {
		const to = on ? 1 : 0;
		o.set(reduced ? to : withTiming(to, FADE));
	}, [on, reduced, o]);
	const style = useAnimatedStyle(() => ({ opacity: o.get() }));
	return (
		<Animated.View
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, style]}
		>
			<ToneArt c={p.c} dark={p.dark} h={p.h} tone={p.tone} w={p.w} />
		</Animated.View>
	);
}

export function CardLight({
	shown,
	reduced,
	w,
	h,
	dark,
}: {
	shown: MirrorTone;
	reduced: boolean;
	w: number;
	h: number;
	dark: boolean;
}) {
	const c = usePalette();
	return TONES.map((t) => (
		<Layer
			c={c}
			dark={dark}
			h={h}
			key={t.id}
			on={t.id === shown}
			reduced={reduced}
			tone={t.id}
			w={w}
		/>
	));
}
