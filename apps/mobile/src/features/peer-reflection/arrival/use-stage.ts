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

/** Dev states: a moment held or played on fixtures. */
export type PeersScene = {
	/** Hold the arrival at this many ms; `Infinity` holds it arrived. */
	hold?: number;
	/** As Reduce Motion draws it, whatever the setting. */
	reduced?: boolean;
	/** Press this card's "I've felt this too" once the screen settles. */
	tap?: number;
	/** Scroll to the end once the screen settles. */
	scrollEnd?: boolean;
};

/** A dev scene's press waits for the screen to settle (the board's jumps: 60–90 ms). */
const SCENE_MS = 120;

/**
 * You're not alone's moments, around the provider's data: the arrival clock,
 * the mark's values, the face and the haptics. React hears only the moments
 * that change what's drawn: a card landing, Done, reading, a press.
 */
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

	// A card lit or put out moves its line and star: at once on the visit's start,
	// over its own time after.
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

	// Dev states: once the screen has settled, press or scroll as the scene says.
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
