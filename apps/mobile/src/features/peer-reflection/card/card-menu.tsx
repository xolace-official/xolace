import type { ReactElement } from "react";
import { Alert, Pressable } from "react-native";
import { COPY } from "../copy";

/** The board's hold (`HOLD_MS`): a 450 ms press opens the menu. */
const HOLD_MS = 450;

type Props = {
	onReport: () => void;
	onHide: () => void;
	children: ReactElement;
};

/**
 * Hold to report, where the SwiftUI context menu isn't (Android): a 450 ms
 * hold opens a native dialog with Report…, Hide this and Cancel (the handoff's
 * fallback for a missing system menu).
 */
export function CardMenu({ onReport, onHide, children }: Props) {
	const open = () =>
		// No title: the buttons say it all, as the system menu does on iOS.
		Alert.alert("", undefined, [
			{ onPress: onReport, text: COPY.menu.report },
			{ onPress: onHide, text: COPY.menu.hide },
			{ style: "cancel", text: COPY.menu.cancel },
		]);
	return (
		// Not its own stop for TalkBack: the quote carries Report and Hide as
		// actions, and the chip is the card's one button.
		<Pressable accessible={false} delayLongPress={HOLD_MS} onLongPress={open}>
			{children}
		</Pressable>
	);
}
