import { useEffect } from "react";
import type { SharedValue } from "react-native-reanimated";
import { DUR, PROV, type SEng } from "./story-scene";
import type { StoryScene } from "./story-view";

export function useStoryScene(
	eng: SharedValue<SEng>,
	scene: StoryScene | undefined
) {
	const auth = scene?.auth;
	const aa = scene?.aa ?? 0;
	const zoom = scene?.zoom ?? -1;
	const at = scene?.at ?? -1;
	useEffect(() => {
		const prov =
			auth === "google"
				? PROV.google
				: auth === "apple"
					? PROV.apple
					: PROV.none;
		eng.modify((e) => {
			"worklet";
			if (prov !== PROV.none) {
				e.authProv = prov;
				e.authAt = 0;
				e.aHold = aa;
			}
			if (at >= 0 && e.hold >= 0) {
				e.bar = Math.min(at, DUR[e.beat] - 1);
			}
			if (zoom >= 0) {
				e.zoom = zoom;
				e.zUser = true;
			}
			return e;
		});
	}, [eng, auth, aa, at, zoom]);
}
