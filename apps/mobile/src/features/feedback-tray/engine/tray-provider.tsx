import React, {
	type PropsWithChildren,
	use,
	useCallback,
	useMemo,
	useRef,
} from "react";

import { useSharedValue } from "react-native-reanimated";

import { ActionTray } from "./action-tray";
import {
	type TrayActions,
	TrayContext,
	type TrayContextProps,
	type TrayRef,
	type TrayScreens,
} from "./tray-context";
import { useTrayNavigation } from "./use-tray-navigation";

type TrayProviderProps<
	T extends Record<string, (props?: any) => React.ReactElement>,
> = PropsWithChildren<{
	screens: TrayScreens<T>;
}>;

/** Engine provider: owns the navigation stack and the tray ref, exposes
 * `show`/`dismiss`/`goBack`. useMemo/useCallback stay: the context value must
 * be reference-stable (a documented React Compiler exception). */
export const TrayProvider = <
	T extends Record<string, (props?: any) => React.ReactElement>,
>({
	children,
	screens,
}: TrayProviderProps<T>) => {
	const {
		currentScreen,
		screenHistory,
		screenProps,
		navigateToScreen,
		replaceScreen,
		goBack,
		clearHistory,
	} = useTrayNavigation<T>();

	const trayRef = useRef<TrayRef>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isActive = useSharedValue(false);

	const dismiss = useCallback(() => {
		trayRef.current?.close();
		timeoutRef.current = setTimeout(() => {
			clearHistory();
		}, 500);
	}, [clearHistory]);

	const show = useCallback(
		(screenKey: keyof T, props?: Parameters<T[keyof T]>[number]) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			if (screenHistory.length === 0) {
				replaceScreen(screenKey, props);
				trayRef.current?.open();
			} else if (
				screenKey === currentScreen &&
				JSON.stringify(props) === JSON.stringify(screenProps[screenKey])
			) {
				trayRef.current?.open();
			} else {
				navigateToScreen(screenKey, props);
			}
		},
		[
			screenHistory.length,
			currentScreen,
			screenProps,
			replaceScreen,
			navigateToScreen,
		]
	);

	const handleGoBack = useCallback(() => {
		if (screenHistory.length > 1) {
			return goBack();
		}
		return dismiss();
	}, [screenHistory.length, goBack, dismiss]);

	const state = useMemo(
		() => ({
			currentScreen,
			isActive,
			screenHistory,
			screenProps: screenProps as Record<keyof T, any>,
		}),
		[currentScreen, screenHistory, screenProps, isActive]
	);

	const actions = useMemo(
		() => ({
			dismiss,
			goBack: handleGoBack,
			show,
		}),
		[show, dismiss, handleGoBack]
	);

	const contextValue = useMemo(
		() =>
			({
				actions,
				meta: { trayRef },
				state,
			}) as TrayContextProps<T>,
		[state, actions]
	);

	const currentComponent = useMemo(
		() =>
			currentScreen && screens[currentScreen]
				? screens[currentScreen](state.screenProps[currentScreen])
				: null,
		[currentScreen, screens, state.screenProps]
	);

	return (
		<TrayContext.Provider value={contextValue}>
			{children}
			<ActionTray>{currentComponent}</ActionTray>
		</TrayContext.Provider>
	);
};

/** The tray's imperative actions; must be used within a TrayProvider. */
export const useTray = <
	T extends Record<string, (props?: any) => React.ReactElement>,
>() => {
	const context = use(TrayContext);
	if (!context) {
		throw new Error("useTray must be used within a TrayProvider");
	}
	return context.actions as TrayActions<T>;
};
