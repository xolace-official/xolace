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
 * Cross-fades reflect screens; a change mid-fade joins the outgoing list, never cuts it short.
 */
export function useScreenTransition(screen: ReflectionStateName) {
	const normalized = normalizeScreen(screen);
	const [state, setState] = useState<TransitionState>({
		current: normalized,
		outgoing: [],
	});

	// Lets the screen-change effect read the previous value without depending on state.
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
