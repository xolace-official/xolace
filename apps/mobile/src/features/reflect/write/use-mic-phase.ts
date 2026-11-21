import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AppState } from "react-native";
import { tap } from "@/lib/haptics";
import { useReflect } from "../reflect-data";
import type { MicPhase, MicRelease } from "./mic-gesture";

/** A lock whose take never starts (no mic, a refused permission) lets go after this. */
const LOCK_WAIT_MS = 3000;

/**
 * The mic's phase, shared by the button and the pill. A lock never outlives
 * its take: the take ending, the screen losing focus or unmounting, or the app
 * going to the background all stop it (keeping the words) and clear it.
 */
export function useMicPhase(onTap: () => void) {
	const { state, actions } = useReflect();
	const { listening } = state;
	const focused = useIsFocused();
	const [phase, setPhase] = useState<MicPhase>("idle");
	const locked = phase === "locked";

	const [wasListening, setWasListening] = useState(listening);
	if (listening !== wasListening) {
		setWasListening(listening);
		if (!listening && locked) {
			setPhase("idle");
		}
	}

	const letGo = useEffectEvent(() => {
		actions.stopSpeaking();
		setPhase("idle");
	});

	useEffect(() => {
		if (locked && !focused) {
			letGo();
		}
	}, [locked, focused]);

	useEffect(() => {
		if (!locked || listening) {
			return;
		}
		const t = setTimeout(letGo, LOCK_WAIT_MS);
		return () => clearTimeout(t);
	}, [locked, listening]);

	useEffect(() => {
		if (!locked) {
			return;
		}
		const sub = AppState.addEventListener("change", (next) => {
			// Not 'inactive', as Plus takes do: Control Center shouldn't end one.
			if (next === "background") {
				letGo();
			}
		});
		return () => sub.remove();
	}, [locked]);

	const onUnmount = useRef<() => void>(() => undefined);
	useEffect(() => {
		onUnmount.current = locked ? actions.stopSpeaking : () => undefined;
	});
	useEffect(() => () => onUnmount.current(), []);

	const release = (kind: MicRelease) => {
		setPhase(kind === "lock" ? "locked" : "idle");
		switch (kind) {
			case "tap":
				onTap();
				return;
			case "cancel":
				actions.cancelSpeaking();
				return;
			case "lock":
				tap();
				return;
			default:
				actions.stopSpeaking();
		}
	};

	return {
		cancelLocked: () => {
			setPhase("idle");
			actions.cancelSpeaking();
		},
		phase,
		release,
		setPhase,
	};
}
