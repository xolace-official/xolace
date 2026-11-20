import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { Presets } from "react-native-pulsar";
import { useAppActive } from "@/components/shared/use-app-active";
import { playAffirmativePress, playResonanceToggle } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useLater } from "@/lib/use-later";
import { usePeersFace } from "../chrome/use-peers-face";
import { useStarValues } from "../mark/use-star-values";
import type { PeerReflection } from "../peer-reflection-data";
import { announcementOf, titleOf } from "../peer-reflection-model";
import { CARD_STAR } from "../peers-look";
import { wordsIn } from "./arrival-time";
import { useArrival } from "./use-arrival";

export type PeersScene = {
	hold?: number;
	reduced?: boolean;
	tap?: number;
	scrollEnd?: boolean;
};

const SCENE_MS = 120;

export function useStage(
	{ state, actions }: PeerReflection,
	scene: PeersScene | undefined,
	onSceneScroll: () => void
) {
	const settingReduced = useEffectiveReducedMotion();
	const reduced = scene?.reduced ?? settingReduced;
	const loading = state.status === "loading";
	const { set, cards } = state;
	const n = cards.length;
	const focused = useIsFocused();
	const active = useAppActive();
	const later = useLater();
	const face = usePeersFace({
		loading,
		reduced,
		running: active,
		waiting: !focused,
	});
	const mark = useStarValues(reduced);
	const [ui, setUi] = useState(false);
	const title = titleOf(set);

	const { arrive, end } = useArrival({
		events: {
			onLand: (c) => {
				if (c === 1) {
					Presets.murmur();
				}
				face.glance();
				if (c === n) {
					AccessibilityInfo.announceForAccessibility(announcementOf(set, n));
				}
			},
			onRead: face.read,
			onUi: () => {
				setUi(true);
				if (set === "none") {
					Presets.murmur();
					face.alone();
					AccessibilityInfo.announceForAccessibility(announcementOf(set, 0));
				}
			},
		},
		hold: scene?.hold,
		n,
		ready: !loading,
		words: wordsIn(title.rows),
	});

	const seen = useRef<Map<string, { on: boolean; gone: boolean }>>(new Map());
	const lit = cards.map((c) => `${c.on ? 1 : 0}${c.gone ? 1 : 0}`).join();
	useEffect(() => {
		cards.forEach((c, i) => {
			const k = CARD_STAR[i];
			const was = seen.current.get(c.id);
			const on = c.on && !c.gone;
			if (was?.on !== on) {
				mark.heat(k, on);
			}
			if (c.gone && !was?.gone) {
				mark.putOut(k, was === undefined);
			}
			seen.current.set(c.id, { gone: c.gone !== null, on });
		});
	}, [lit]);

	const press = (i: number) => {
		const c = cards[i];
		if (!c || c.gone) {
			return;
		}
		if (c.on) {
			Presets.System.selection();
		} else {
			playResonanceToggle();
			const others = cards.flatMap((o, j) =>
				j !== i && !o.gone ? [CARD_STAR[j]] : []
			);
			mark.send(CARD_STAR[i], others);
			face.heard();
		}
		actions.toggle(c.id);
	};

	const done = () => {
		playAffirmativePress();
		actions.done();
	};

	const sceneRan = useRef(false);
	useEffect(() => {
		if (!ui || sceneRan.current || !scene) {
			return;
		}
		sceneRan.current = true;
		if (scene.tap !== undefined) {
			const i = scene.tap;
			later(() => press(i), SCENE_MS);
		}
		if (scene.scrollEnd) {
			later(onSceneScroll, SCENE_MS);
		}
	});

	return { arrive, done, end, face, mark, press, reduced, title, ui };
}
