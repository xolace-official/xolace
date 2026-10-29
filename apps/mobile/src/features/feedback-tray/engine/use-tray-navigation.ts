import { useCallback, useMemo, useState } from "react";

/** In-memory navigation stack for the tray; the current screen is the last entry. */
export const useTrayNavigation = <
	T extends Record<string, (props?: any) => React.ReactElement>,
>() => {
	type ScreenHistoryEntry = {
		screen: keyof T;
		props?: Parameters<T[keyof T]>[number];
	};

	const [history, setHistory] = useState<ScreenHistoryEntry[]>([]);

	const currentScreen = useMemo(
		() => (history.length > 0 ? history?.[history.length - 1]?.screen : null),
		[history]
	);

	const screenProps = useMemo(() => {
		const props: Record<keyof T, any> = {} as Record<keyof T, any>;
		history.forEach((entry) => {
			if (entry.props) {
				props[entry.screen] = entry.props;
			}
		});
		return props;
	}, [history]);

	const navigateToScreen = useCallback(
		(screen: keyof T, props?: Parameters<T[keyof T]>[number]) => {
			setHistory((prev) => [...prev, { props, screen }]);
		},
		[]
	);

	const replaceScreen = useCallback(
		(screen: keyof T, props?: Parameters<T[keyof T]>[number]) => {
			setHistory([{ props, screen }]);
		},
		[]
	);

	const goBack = useCallback(() => {
		setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : []));
	}, []);

	const clearHistory = useCallback(() => {
		setHistory([]);
	}, []);

	return {
		clearHistory,
		currentScreen,
		goBack,
		navigateToScreen,
		replaceScreen,
		screenHistory: history.map((entry) => entry.screen),
		screenProps,
	};
};
