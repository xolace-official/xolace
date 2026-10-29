import { useRef, useState } from "react";
import type { SharedValue } from "react-native-reanimated";
import { useSharedValue } from "react-native-reanimated";

// Exit animation completes in ~450ms (150ms max stagger + 300ms opacity timing).
const CLOSE_DEFER_MS = 500;

type MenuState = {
	isOpen: SharedValue<boolean>;
	isOpenJS: boolean;
	open: () => void;
	close: () => void;
	toggle: () => void;
};

export function useMenuState(): MenuState {
	const isOpen = useSharedValue(false);
	const [isOpenJS, setIsOpenJS] = useState(false);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	// No unmount cleanup on purpose: it would also run on Fast Refresh, orphaning
	// the timer mid-close and leaving the scrim mounted.

	const open = () => {
		if (closeTimer.current) {
			clearTimeout(closeTimer.current);
		}
		closeTimer.current = null;
		isOpen.set(true);
		setIsOpenJS(true);
	};

	const close = () => {
		isOpen.set(false);
		if (closeTimer.current) {
			clearTimeout(closeTimer.current);
		}
		closeTimer.current = setTimeout(() => setIsOpenJS(false), CLOSE_DEFER_MS);
	};

	return {
		close,
		isOpen,
		isOpenJS,
		open,
		// Branch on intent, not isOpenJS: that flag lags a close by CLOSE_DEFER_MS,
		// so a reopen inside the window would re-arm the close timer.
		toggle: () => (isOpen.get() ? close() : open()),
	};
}
