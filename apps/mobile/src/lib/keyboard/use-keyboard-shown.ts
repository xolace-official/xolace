import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

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
