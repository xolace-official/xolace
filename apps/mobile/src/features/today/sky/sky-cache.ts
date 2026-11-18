import {
	drawAsPicture,
	type SkImage,
	Skia,
	type SkPicture,
} from "@shopify/react-native-skia";
import { type ReactElement, useEffect, useState } from "react";
import { PixelRatio } from "react-native";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import { REDUCED_FADE_MS } from "@/design/springs";
import type { TodayPhase } from "../today-model";
import { TIMING } from "../today-motion";

/** Past the slowest static layer's transition (the night front), so the live layers are at rest. */
const SETTLE_MARGIN_MS = 150;

/**
 * False from a phase change until the backdrop and ridges have stopped moving.
 * It turns false in the same render as the phase, so the live layers take over at once.
 */
export function useSkySettled(phase: TodayPhase, reduced: boolean): boolean {
	const [settledPhase, setSettledPhase] = useState(phase);
	useEffect(() => {
		if (settledPhase === phase) {
			return;
		}
		const ms = (reduced ? REDUCED_FADE_MS : TIMING.night) + SETTLE_MARGIN_MS;
		const id = setTimeout(() => setSettledPhase(phase), ms);
		return () => clearTimeout(id);
	}, [phase, reduced, settledPhase]);
	return settledPhase === phase;
}

/** A layer to bake: its element in points, drawn from (0, 0). */
export type BakeLayer = {
	element: ReactElement;
	width: number;
	height: number;
};
export type Baked = {
	backdrop: SharedValue<SkImage | null>;
	ridges: SharedValue<SkImage | null>;
};

function rasterise(
	picture: SkPicture,
	width: number,
	height: number,
	scale: number
): SkImage | null {
	"worklet";
	const surface = Skia.Surface.MakeOffscreen(
		Math.round(width * scale),
		Math.round(height * scale)
	);
	if (!surface) {
		return null;
	}
	const canvas = surface.getCanvas();
	canvas.scale(scale, scale);
	canvas.drawPicture(picture);
	surface.flush();
	return surface.makeImageSnapshot();
}

/**
 * The sky's backdrop and ridges drawn once into GPU textures at the device's
 * pixel ratio (on the UI thread, as `useTexture`), rebuilt when `key` changes.
 * Returns the textures once those for the current key are ready, else null:
 * draw the layers live meanwhile. Replaced textures are left to the GC, since
 * a Skia node can still hold one for a frame after the swap.
 */
export function useSkyBake(
	key: string,
	backdrop: BakeLayer,
	ridges: BakeLayer
): Baked | null {
	const backdropImage = useSharedValue<SkImage | null>(null);
	const ridgesImage = useSharedValue<SkImage | null>(null);
	const [readyKey, setReadyKey] = useState<string | null>(null);
	useEffect(() => {
		let alive = true;
		const scale = PixelRatio.get();
		const draw = (l: BakeLayer) =>
			drawAsPicture(l.element, {
				height: l.height,
				width: l.width,
				x: 0,
				y: 0,
			});
		const b = { h: backdrop.height, w: backdrop.width };
		const r = { h: ridges.height, w: ridges.width };
		Promise.all([draw(backdrop), draw(ridges)]).then(([bp, rp]) => {
			if (!alive) {
				return;
			}
			scheduleOnUI(() => {
				"worklet";
				backdropImage.set(rasterise(bp, b.w, b.h, scale));
				ridgesImage.set(rasterise(rp, r.w, r.h, scale));
				scheduleOnRN(setReadyKey, key);
			});
		});
		return () => {
			alive = false;
		};
		// The layers are a function of `key`.
	}, [key]);
	return readyKey === key
		? { backdrop: backdropImage, ridges: ridgesImage }
		: null;
}
