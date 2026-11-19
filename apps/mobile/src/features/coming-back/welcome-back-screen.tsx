import { useIsFocused } from "expo-router";
import { type ReactNode, useEffect, useRef } from "react";
import { View } from "react-native";
import {
	DetachedSheet,
	useSheetClose,
} from "@/components/shared/detached-sheet";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";
import { WELCOME_BACK } from "./copy";
import { GreetingCard } from "./greeting/greeting-card";
import { GreetingFace } from "./greeting/greeting-face";
import { useWelcomeBack } from "./welcome-back-data";

/** The sheet's Settle spring has landed by now: one soft tap (handoff §10). */
const SETTLE_TAP_MS = 320;

/**
 * Coming back (handoff `return.md`): one greeting that lists what happened while you were away.
 * Opening a row never closes it. The check-in opens on top as a page sheet and you come back to
 * this same card, the row ticked; the month's prompt opens inside it. Closing it with things
 * untouched leaves them in one pill on Today.
 */
export function WelcomeBackScreen() {
	const { state, actions } = useWelcomeBack();
	const focused = useIsFocused();
	const { enter, tickKey } = state;

	// Gone any way (closed, swiped, or left for a tab from the check-in): the episode closes.
	const closed = useRef(actions.closed);
	closed.current = actions.closed;
	useEffect(() => () => closed.current(), []);

	useEffect(() => {
		if (!enter) {
			return;
		}
		const id = setTimeout(playSoftPress, SETTLE_TAP_MS);
		return () => clearTimeout(id);
	}, [enter]);

	// Back in front after Vent or crisis help: the check-in's tick lands now.
	const { landDeferred } = actions;
	useEffect(() => {
		if (focused) {
			landDeferred();
		}
	}, [focused, landDeferred]);

	// A tick: a light success (the face nods in GreetingFace, the row draws in GreetingRow).
	const seen = useRef(tickKey);
	useEffect(() => {
		if (tickKey === seen.current) {
			return;
		}
		seen.current = tickKey;
		playAffirmativePress();
	}, [tickKey]);

	return (
		<DetachedSheet>
			<Dialog>
				<GreetingFace running={focused} />
				<GreetingCard />
			</Dialog>
		</DetachedSheet>
	);
}

/** VoiceOver: a modal dialog, "Welcome back"; the escape gesture closes it like the button. */
function Dialog({ children }: { children: ReactNode }) {
	const close = useSheetClose();
	return (
		<View
			accessibilityLabel={WELCOME_BACK.a11y}
			accessibilityViewIsModal
			onAccessibilityEscape={close}
		>
			{children}
		</View>
	);
}
