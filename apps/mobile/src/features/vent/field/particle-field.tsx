import {
	Canvas,
	Picture,
	type SkImage,
	Skia,
	type SkRuntimeEffect,
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import {
	useDerivedValue,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PHASE } from "@/features/vent/field/field-control";
import {
	FIELD_START,
	type FieldState,
	stepField,
} from "@/features/vent/field/field-step";
import { paintFrame } from "@/features/vent/field/paint-frame";
import { makeSprite } from "@/features/vent/field/particle-atlas";
import { useVentScreen } from "@/features/vent/vent-data";
import { BURN_SKSL } from "@/features/vent/words/burn-shader";

/** The longest frame step, so a hitch never jumps the field. */
const MAX_DT = 50;
const FIRST_DT = 16;

/**
 * The vent's particle field: production's Skia field, one Picture recorded per frame from a
 * `useFrameCallback`, with every spark in one additive atlas (v2) and the words' burn in one
 * shader. It stops drawing once it's gone (`running`), instead of recording empty pictures, and
 * reports once when the burn and its silence are over (production's `onBurnComplete`). Hidden
 * from VoiceOver.
 */
export function ParticleField() {
	const { state: vent, actions } = useVentScreen();
	const { field: control, reduced, running } = vent;
	const { onBurnComplete } = actions;
	const { width: w, height: h } = useWindowDimensions();
	const state = useSharedValue<FieldState>({ ...FIELD_START });
	const clock = useSharedValue(0);
	const sprite = useSharedValue<SkImage | null>(null);
	const effect = useSharedValue<SkRuntimeEffect | null>(null);
	const { cmd, level, pinch, layer, wordsShown } = control;

	const frame = useFrameCallback((f) => {
		"worklet";
		if (sprite.get() === null) {
			sprite.set(makeSprite());
		}
		if (effect.get() === null) {
			effect.set(Skia.RuntimeEffect.Make(BURN_SKSL));
		}
		const dt = Math.min(f.timeSincePreviousFrame ?? FIRST_DT, MAX_DT);
		// Mutated in place on the UI thread; the clock below is what redraws.
		const s = state.get();
		const done = stepField(s, {
			cmd: cmd.get(),
			dt,
			level: level.get(),
			pinch: pinch.get(),
			rm: reduced,
		});
		if (s.phase === PHASE.ash && s.ash0 < 0 && layer.get() !== null) {
			s.ash0 = s.now;
			// The image takes over from the real text on the same frame.
			wordsShown.set(0);
		}
		clock.set(s.now);
		if (done) {
			scheduleOnRN(onBurnComplete);
		}
	}, false);

	const { setActive } = frame;
	useEffect(() => {
		setActive(running);
		return () => setActive(false);
	}, [running, setActive]);

	const picture = useDerivedValue(() => {
		"worklet";
		clock.get();
		const s = state.get();
		const recorder = Skia.PictureRecorder();
		const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, w, h));
		const img = sprite.get();
		if (img) {
			paintFrame(
				canvas,
				img,
				s,
				{ cx: w / 2, cy: h / 2, h, w },
				reduced,
				layer.get(),
				effect.get()
			);
		}
		return recorder.finishRecordingAsPicture();
	});

	return (
		<Canvas
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={StyleSheet.absoluteFill}
		>
			<Picture picture={picture} />
		</Canvas>
	);
}
