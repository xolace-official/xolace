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

const SETTLE_TAP_MS = 320;

export function WelcomeBackScreen() {
	const { state, actions } = useWelcomeBack();
	const focused = useIsFocused();
	const { enter, tickKey } = state;

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

	const { landDeferred } = actions;
	useEffect(() => {
		if (focused) {
			landDeferred();
		}
	}, [focused, landDeferred]);

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
