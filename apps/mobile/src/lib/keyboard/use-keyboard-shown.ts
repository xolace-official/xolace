import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

/**
 * True while the software keyboard is up. iOS's will-show / will-hide, so
 * layout moves with it; Android only sends did-show / did-hide.
 * @public The redesign's shared kit (F5), for the screen PRs.
 */
export function useKeyboardShown(): boolean {
	const [shown, setShown] = useState(false);
	useEffect(() => {
		const ios = process.env.EXPO_OS === "ios";
		const show = Keyboard.addListener(
			ios ? "keyboardWillShow" : "keyboardDidShow",
			() => setShown(true)
		);
		const hide = Keyboard.addListener(
			ios ? "keyboardWillHide" : "keyboardDidHide",
			() => setShown(false)
		);
		return () => {
			show.remove();
			hide.remove();
		};
	}, []);
	return shown;
}
