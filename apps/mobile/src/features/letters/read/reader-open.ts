import { type ComponentRef, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, type View } from "react-native";
import { playSoftPress } from "@/lib/haptics";
import { LETTER_MOTION } from "../letter-motion";
import { type ReceivedLetter, readerSealed } from "../letters-model";

const O = LETTER_MOTION.open;
/** VoiceOver moves to the letter once its words are in. */
const FOCUS_MS = O.flapMs + O.bottomMs + O.words.ms;

const focusOn = (view: ComponentRef<typeof View> | null) => {
	const tag = view ? findNodeHandle(view) : null;
	if (typeof tag === "number") {
		AccessibilityInfo.setAccessibilityFocus(tag);
	}
};

/**
 * Opening a sealed letter: it shows open at once and the server catches up. If the server fails,
 * the letter seals again (the data hook says so in a toast), VoiceOver goes back to Open rather
 * than to the words, and nothing opens twice while one is on its way.
 */
export function useReaderOpen({
	letter,
	open: openOnServer,
	reduced,
}: {
	letter: ReceivedLetter;
	open: () => Promise<boolean>;
	reduced: boolean;
}) {
	const [openedHere, setOpenedHere] = useState(false);
	const opening = useRef(false);
	const sealed = readerSealed(letter, openedHere);
	const words = useRef<ComponentRef<typeof View>>(null);
	const button = useRef<ComponentRef<typeof View>>(null);
	// PressScale types its `ref` as the View component itself, not its instance: take either.
	const buttonRef = (el: ComponentRef<typeof View> | typeof View | null) => {
		button.current = typeof el === "function" ? null : el;
	};
	const focus = useRef<ReturnType<typeof setTimeout> | null>(null);
	const stopFocus = () => {
		if (focus.current) {
			clearTimeout(focus.current);
		}
		focus.current = null;
	};
	useEffect(() => stopFocus, []);

	const open = () => {
		if (!sealed || opening.current) {
			return;
		}
		opening.current = true;
		setOpenedHere(true);
		playSoftPress();
		openOnServer().then((ok) => {
			if (ok) {
				return;
			}
			opening.current = false;
			stopFocus();
			setOpenedHere(false);
			// Open is back once it seals again: a frame for the bar to mount.
			requestAnimationFrame(() => focusOn(button.current));
		});
		focus.current = setTimeout(
			() => {
				focus.current = null;
				focusOn(words.current);
			},
			reduced ? LETTER_MOTION.reducedMs : FOCUS_MS
		);
	};

	return { buttonRef, open, sealed, words };
}
