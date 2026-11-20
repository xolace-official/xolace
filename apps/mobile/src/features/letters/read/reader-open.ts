import { type ComponentRef, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, type View } from "react-native";
import { playSoftPress } from "@/lib/haptics";
import { LETTER_MOTION } from "../letter-motion";
import { type ReceivedLetter, readerSealed } from "../letters-model";

const O = LETTER_MOTION.open;
const FOCUS_MS = O.flapMs + O.bottomMs + O.words.ms;

const focusOn = (view: ComponentRef<typeof View> | null) => {
	const tag = view ? findNodeHandle(view) : null;
	if (typeof tag === "number") {
		AccessibilityInfo.setAccessibilityFocus(tag);
	}
};

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
