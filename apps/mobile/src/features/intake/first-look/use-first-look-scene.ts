import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Presets } from "react-native-pulsar";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { MOOD_POSES, NEUTRAL } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import type { RowId, VoiceId } from "./copy";
import {
	ARRIVE_END,
	HAPPY_AT,
	SETTLED,
	TALK_AT,
	toggled,
	VOICE_PALETTE,
} from "./first-look-model";
import { LOOK_MS } from "./first-look-motion";

const LOOK = { ...NEUTRAL, gazeX: -0.5, gazeY: 0.6, mouth: 0.5, tilt: -0.1 };

export type SceneHold = { at?: number; open?: RowId | null; voice?: VoiceId };

export function useFirstLookScene(
	hold: SceneHold | undefined,
	reduced: boolean
) {
	const heldAt = hold?.at ?? -1;
	const settled = reduced || (hold !== undefined && hold.at === undefined);
	const firstOpen = (): RowId | null => {
		if (hold?.open !== undefined) {
			return hold.open;
		}
		if (heldAt >= 0) {
			return heldAt >= TALK_AT ? "talk" : null;
		}
		return settled ? "talk" : null;
	};
	const [open, setOpen] = useState<RowId | null>(firstOpen);
	const [mounted, setMounted] = useState<readonly RowId[]>(() => {
		const first = firstOpen();
		return first ? [first] : [];
	});
	const [voice, setVoice] = useState<VoiceId>(hold?.voice ?? "flux");
	const [focused, setFocused] = useState<RowId | null>(null);
	const lit = settled || heldAt >= HAPPY_AT;
	const face = useFace(lit ? MOOD_POSES.happy : MOOD_POSES.idle);
	const clock = useSharedValue(heldAt >= 0 ? heldAt : settled ? SETTLED : 0);

	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	const later = (ms: number, fn: () => void) => {
		timers.current.push(setTimeout(fn, ms));
	};
	useEffect(() => () => timers.current.forEach(clearTimeout), []);

	const show = (id: RowId) =>
		setMounted((m) => (m.includes(id) ? m : [...m, id]));

	const arrive = useEffectEvent(() => {
		if (settled || heldAt >= 0) {
			return;
		}
		clock.set(
			withTiming(ARRIVE_END, {
				duration: ARRIVE_END,
				easing: Easing.linear,
				...PLAY_AS_CHOSEN,
			})
		);
		later(HAPPY_AT, () => {
			face.to(MOOD_POSES.happy);
			face.hop();
		});
		later(TALK_AT, () => {
			setOpen((cur) => cur ?? "talk");
			show("talk");
		});
	});
	useEffect(() => arrive(), []);

	useEffect(() => {
		if (reduced) {
			clock.set(SETTLED);
			face.to(MOOD_POSES.happy);
		}
	}, [clock, face.to, reduced]);

	const toggle = (id: RowId) => {
		Presets.System.selection();
		const next = toggled(open, id);
		setOpen(next);
		setFocused(next);
		if (next) {
			show(next);
		}
		face.to(next ? LOOK : MOOD_POSES.happy);
		later(LOOK_MS, () => face.to(MOOD_POSES.happy));
		return { next, prev: open };
	};

	const pickVoice = (next: VoiceId) => {
		if (next !== voice) {
			face.to(MOOD_POSES.happy);
			face.hop();
		}
		setVoice(next);
	};

	return {
		clock,
		face,
		focused,
		later,
		mounted,
		open,
		palette: VOICE_PALETTE[voice],
		pickVoice,
		toggle,
		voice,
	};
}
