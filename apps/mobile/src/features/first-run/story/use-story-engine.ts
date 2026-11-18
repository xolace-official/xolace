import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import { Presets } from "react-native-pulsar";
import {
	type SharedValue,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { playSoftPress, useProcessingBreathHaptic } from "@/lib/haptics";
import { useFirstRunContext } from "../first-run-data";
import type { AuthProvider } from "../use-sign-in";
import {
	AUTH,
	authOk,
	authReset,
	beginAuth,
	EV,
	freshStory,
	goBeat,
	NB,
	PROV,
	type SEng,
	stepStory,
} from "./story-scene";
import { useStoryScene } from "./use-story-scene";

const MOUNT_STEP_MS = 120;

/**
 * The story's engine: one shared value stepped by one frame callback on the UI thread, waiting
 * under the promise's hand-off until `gate` opens. React hears of a beat change, the seat, the
 * seated moment and the haptics; signing in runs the seat's clock from the real Clerk result.
 */
export function useStoryEngine(seat: boolean, gate: SharedValue<number>) {
	const { state, actions } = useFirstRunContext();
	const scene = state.scene?.story;
	const start = Math.min(NB - 1, Math.max(0, scene?.beat ?? 0));
	const eng = useSharedValue(
		freshStory(state.reduced, start, scene?.at ?? -1, seat)
	);
	const [beat, setBeat] = useState(start);
	const [open, setOpen] = useState(seat);
	/** The provider whose sheet is up, until it comes back without an account. */
	const [signing, setSigning] = useState<AuthProvider | null>(
		scene?.auth ?? null
	);
	const [seated, setSeated] = useState(
		scene?.auth !== undefined && (scene.aa ?? 0) >= AUTH.seated
	);
	const breath = useProcessingBreathHaptic();
	/** The cover mounts first, the other beats after the first frame, one every 120 ms. */
	const [ready, setReady] = useState(0);
	useEffect(() => {
		if (ready === 0 || ready >= NB) {
			return;
		}
		const id = setTimeout(() => setReady((r) => r + 1), MOUNT_STEP_MS);
		return () => clearTimeout(id);
	}, [ready]);
	useStoryScene(eng, scene);
	useEffect(() => {
		let alive = true;
		AccessibilityInfo.isScreenReaderEnabled().then((sr) => {
			if (alive) {
				eng.modify((e) => {
					"worklet";
					e.sr = sr;
					return e;
				});
			}
		});
		return () => {
			alive = false;
		};
	}, [eng]);

	const onEvents = (ev: number, b: number) => {
		if (ev & EV.beat) {
			Presets.System.selection();
			setBeat(b);
		}
		if (ev & EV.seat) {
			playSoftPress();
			setOpen(true);
		}
		if (ev & EV.closed) {
			playSoftPress();
			setOpen(false);
		}
		if (ev & EV.seated) {
			Presets.bloom();
			setSeated(true);
		}
		if (ev & EV.intake) {
			actions.seated();
		}
		if (ev & EV.flick) {
			Presets.flick();
		}
		if (ev & EV.rumble) {
			breath();
		}
		if (ev & EV.tick) {
			Presets.System.selection();
		}
	};

	useFrameCallback((f) => {
		if (gate.get() === 0) {
			return;
		}
		let ev = 0;
		let b = 0;
		let first = false;
		// A plain closure: it runs here on the UI thread, so `ev` and `b` come back out.
		eng.modify((e) => {
			e.now = f.timestamp;
			if (e.t0 === 0) {
				first = true;
				e.t0 = e.now;
				e.tb = e.now;
				if (e.seatAt === 0) {
					e.seatAt = e.now;
				}
			}
			stepStory(e, f.timeSincePreviousFrame ?? 16);
			ev = e.ev;
			e.ev = 0;
			b = e.beat;
			return e;
		});
		if (ev) {
			scheduleOnRN(onEvents, ev, b);
		}
		if (first) {
			scheduleOnRN(setReady, 1);
		}
	});

	const shown = (i: number) => ready >= i || start === i || beat >= i;
	const act = (fn: (e: SEng) => void) =>
		eng.modify((e) => {
			"worklet";
			fn(e);
			return e;
		});
	const signIn = async (provider: AuthProvider) => {
		if (signing) {
			return;
		}
		setSigning(provider);
		const prov = provider === "apple" ? PROV.apple : PROV.google;
		act((e) => {
			"worklet";
			beginAuth(e, prov);
		});
		const outcome = await actions.signIn(provider);
		if (outcome === "signed-in") {
			act((e) => {
				"worklet";
				authOk(e);
			});
			return;
		}
		act((e) => {
			"worklet";
			authReset(e);
		});
		setSigning(null);
	};
	const step = (by: number) =>
		act((e) => {
			"worklet";
			goBeat(e, e.beat + by);
		});
	return {
		act,
		beat,
		eng,
		open,
		reduced: state.reduced,
		seated,
		shown,
		signIn,
		signing,
		step,
	};
}
