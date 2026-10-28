import { useEffect, useRef, useState } from "react";
import { Keyboard } from "react-native";
import { normalizeScreen } from "@/features/reflect/reflect-transitions";
import type { ReflectionStateName } from "@/features/reflect/types";

type TransitionState = {
	current: ReflectionStateName;
	/** Screens still fading out, oldest first. */
	outgoing: ReflectionStateName[];
};

/**
 * Manages cross-fade transitions between reflect state screens.
 *
 * When the screen changes, the old screen is kept mounted (fading out)
 * while the new screen mounts and fades in. Once the outgoing fade
 * completes, the old screen is unmounted. A screen that changes again
 * mid-fade (processing → error on a rate limit) joins the outgoing list
 * rather than cutting the earlier fade short.
 */
export function useScreenTransition(screen: ReflectionStateName) {
	const normalized = normalizeScreen(screen);
	const [state, setState] = useState<TransitionState>({
		current: normalized,
		outgoing: [],
	});

	// Mirror the latest committed state into a ref so the screen-change effect
	// below can read the previous value without re-running on every state change.
	const stateRef = useRef(state);
	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	useEffect(() => {
		const prev = stateRef.current;
		const next = normalizeScreen(screen);

		if (next === normalizeScreen(prev.current)) {
			return;
		}

		Keyboard.dismiss();
		setState({
			current: next,
			// A screen coming back while it is still fading out reverses in place.
			outgoing: [...prev.outgoing.filter((s) => s !== next), prev.current],
		});
	}, [screen]);

	const onOutgoingComplete = (done: ReflectionStateName) => {
		setState((prev) => ({
			...prev,
			outgoing: prev.outgoing.filter((s) => s !== done),
		}));
	};

	return {
		current: state.current,
		isTransitioning: state.outgoing.length > 0,
		onOutgoingComplete,
		outgoing: state.outgoing,
	};
}
