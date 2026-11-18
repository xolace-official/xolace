import { useEffect, useRef } from "react";
import {
	type SharedValue,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import type { TodayPhase } from "../today-model";
import { EASE_CSS, EASE_GLIDE, EASE_NIGHT, TIMING } from "../today-motion";
import { NIGHT_FEATHER, type Sun, skyLook } from "./sky-model";

export type SkyMotion = {
	/** Opacity of the dawn, day and evening palettes. */
	dawn: SharedValue<number>;
	day: SharedValue<number>;
	evening: SharedValue<number>;
	/** Where the night front's edge is, as a share of the sky (−.45 → 1). */
	night: SharedValue<number>;
	sunX: SharedValue<number>;
	sunY: SharedValue<number>;
	sunScale: SharedValue<number>;
	sunOpacity: SharedValue<number>;
	/** Colours cross from `sunFrom` to `sunTo` as `palette` runs 0 → 1. */
	sunFrom: SharedValue<Sun>;
	sunTo: SharedValue<Sun>;
	palette: SharedValue<number>;
	ridgeFrom: SharedValue<[string, string]>;
	ridgeTo: SharedValue<[string, string]>;
	ridgeMix: SharedValue<number>;
	clouds: SharedValue<number>;
	stars: SharedValue<number>;
	firstStar: SharedValue<number>;
	moon: SharedValue<number>;
	moonRise: SharedValue<number>;
	embers: SharedValue<number>;
};

/**
 * The two-speed swap (day-night-toggle): on a phase change the palette
 * crossfades in 600 ms while the sun glides for 1.3 s, ridges recolour over
 * 0.9 s and night falls from the top over 1.6 s. Reduce Motion: 200 ms fades.
 * A theme change (light ↔ dark) in the same phase swaps the colours at once.
 */
export function useSkyMotion(
	phase: TodayPhase,
	reduced: boolean,
	dark: boolean
): SkyMotion {
	const late = phase === "late";
	const look = skyLook(dark);
	const sun = look.sun[phase];
	const shownPhase = useRef(phase);
	const m: SkyMotion = {
		clouds: useSharedValue(look.clouds[phase]),
		dawn: useSharedValue(phase === "dawn" ? 1 : 0),
		day: useSharedValue(phase === "day" ? 1 : 0),
		embers: useSharedValue(late ? 1 : 0),
		evening: useSharedValue(phase === "evening" || late ? 1 : 0),
		firstStar: useSharedValue(phase === "evening" ? 0.85 : late ? 1 : 0),
		moon: useSharedValue(late ? 1 : 0),
		moonRise: useSharedValue(late ? 1 : 0),
		night: useSharedValue(late ? 1 : -NIGHT_FEATHER),
		palette: useSharedValue(1),
		ridgeFrom: useSharedValue(look.ridges[phase]),
		ridgeMix: useSharedValue(1),
		ridgeTo: useSharedValue(look.ridges[phase]),
		stars: useSharedValue(late ? 1 : 0),
		sunFrom: useSharedValue(sun),
		sunOpacity: useSharedValue(sun.opacity),
		sunScale: useSharedValue(sun.scale),
		sunTo: useSharedValue(sun),
		sunX: useSharedValue(sun.x),
		sunY: useSharedValue(sun.y),
	};

	useEffect(() => {
		const r = reduced;
		const t = (ms: number, easing = EASE_CSS) =>
			r
				? { duration: REDUCED_FADE_MS, ...PLAY_AS_CHOSEN }
				: { duration: ms, easing, ...PLAY_AS_CHOSEN };
		const later = (delay: number, to: number, ms: number, easing = EASE_CSS) =>
			r
				? withTiming(to, { duration: REDUCED_FADE_MS, ...PLAY_AS_CHOSEN })
				: withDelay(
						delay,
						withTiming(to, { duration: ms, easing, ...PLAY_AS_CHOSEN }),
						PLAY_AS_CHOSEN.reduceMotion
					);
		const late = phase === "late";
		const { sun: suns, ridges, clouds } = skyLook(dark);
		const target = suns[phase];
		// Only the theme changed: no hour has passed, so nothing glides; the colours snap.
		const snap = shownPhase.current === phase;
		shownPhase.current = phase;

		m.dawn.set(withTiming(phase === "dawn" ? 1 : 0, t(TIMING.palette)));
		m.day.set(withTiming(phase === "day" ? 1 : 0, t(TIMING.palette)));
		m.evening.set(
			withTiming(phase === "evening" || late ? 1 : 0, t(TIMING.palette))
		);
		m.night.set(
			withTiming(late ? 1 : -NIGHT_FEATHER, t(TIMING.night, EASE_NIGHT))
		);

		m.sunFrom.set(snap ? target : m.sunTo.get());
		m.sunTo.set(target);
		m.palette.set(snap ? 1 : 0);
		if (!snap) {
			m.palette.set(withTiming(1, t(TIMING.palette)));
		}
		m.sunX.set(withTiming(target.x, t(TIMING.glide, EASE_GLIDE)));
		m.sunY.set(withTiming(target.y, t(TIMING.glide, EASE_GLIDE)));
		m.sunScale.set(withTiming(target.scale, t(TIMING.glide, EASE_GLIDE)));
		m.sunOpacity.set(withTiming(target.opacity, t(900)));

		m.ridgeFrom.set(snap ? ridges[phase] : m.ridgeTo.get());
		m.ridgeTo.set(ridges[phase]);
		m.ridgeMix.set(snap ? 1 : 0);
		if (!snap) {
			m.ridgeMix.set(withTiming(1, t(TIMING.ridges)));
		}

		m.clouds.set(snap ? clouds[phase] : withTiming(clouds[phase], t(900)));
		m.stars.set(later(late ? 1100 : 0, late ? 1 : 0, 1200));
		m.firstStar.set(
			later(late ? 1100 : 400, phase === "evening" ? 0.85 : late ? 1 : 0, 1200)
		);
		m.moon.set(later(late ? 700 : 0, late ? 1 : 0, 1000));
		m.moonRise.set(later(late ? 500 : 0, late ? 1 : 0, 1700, EASE_GLIDE));
		m.embers.set(later(late ? 1300 : 0, late ? 1 : 0, 1000));
		// Shared values are stable; this runs on a phase or theme change only.
	}, [phase, reduced, dark]);

	return m;
}
