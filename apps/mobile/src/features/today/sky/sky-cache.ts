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

const SETTLE_MARGIN_MS = 150;

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
	}, [key]);
	return readyKey === key
		? { backdrop: backdropImage, ridges: ridgesImage }
		: null;
}
