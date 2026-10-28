import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { Uniwind } from "uniwind";
import { useAppStore } from "@/store/store";

export type SessionMode = "day" | "night";

interface SessionModeContextType {
	isNight: boolean;
	mode: SessionMode;
}

const SessionModeContext = createContext<SessionModeContextType | undefined>(
	undefined
);

/** Returns true if the given hour (0–23) falls in the night window (22:00–04:00). */
function isNightHour(hour: number): boolean {
	return hour >= 22 || hour < 4;
}

function computeMode(): SessionMode {
	return isNightHour(new Date().getHours()) ? "night" : "day";
}

/** Session mode from the device clock, recomputed on foreground. Night stashes the theme and
 * sets `nightly-dark`; day restores it. */
export function SessionModeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const nightModeEnabled = useAppStore((s) => s.nightModeEnabled);
	const setPreviousTheme = useAppStore((s) => s.setPreviousTheme);

	// mode always reflects the clock regardless of nightModeEnabled.
	const [, forceRefresh] = useReducer((n: number) => n + 1, 0);
	const mode: SessionMode = computeMode();

	// Guards against double-stashing on repeated AppState events within the window.
	const nightAppliedRef = useRef(false);

	const applyNightTheme = useCallback(() => {
		if (nightAppliedRef.current) {
			return;
		}
		nightAppliedRef.current = true;
		const current = Uniwind.currentTheme;
		setPreviousTheme(current);
		Uniwind.setTheme("nightly-dark");
	}, [setPreviousTheme]);

	const restoreDayTheme = useCallback(() => {
		if (!nightAppliedRef.current) {
			return;
		}
		nightAppliedRef.current = false;
		const {
			previousTheme,
			theme: storedTheme,
			colorThemeId,
		} = useAppStore.getState();
		setPreviousTheme(null);

		if (previousTheme) {
			Uniwind.setTheme(previousTheme as never);
			return;
		}

		const modeStr = storedTheme === "system" ? "dark" : storedTheme;
		const nextTheme =
			colorThemeId === "default"
				? modeStr
				: (`${colorThemeId}-${modeStr}` as never);
		Uniwind.setTheme(nextTheme);
	}, [setPreviousTheme]);

	// Theme swap is gated by the user's night mode preference; session mode is not.
	useEffect(() => {
		if (nightModeEnabled && mode === "night") {
			applyNightTheme();
		} else {
			restoreDayTheme();
		}
	}, [mode, nightModeEnabled, applyNightTheme, restoreDayTheme]);

	// On app foreground, re-render so mode recomputes with the current hour
	useEffect(() => {
		const handler = (state: AppStateStatus) => {
			if (state === "active") {
				forceRefresh();
			}
		};
		const sub = AppState.addEventListener("change", handler);
		return () => sub.remove();
	}, []);

	const value = useMemo(
		() => ({ isNight: nightModeEnabled && mode === "night", mode }),
		[mode, nightModeEnabled]
	);

	return (
		<SessionModeContext.Provider value={value}>
			{children}
		</SessionModeContext.Provider>
	);
}

/** Access the current session mode anywhere inside SessionModeProvider. */
export function useSessionMode(): SessionModeContextType {
	const ctx = useContext(SessionModeContext);
	if (!ctx) {
		throw new Error("useSessionMode must be used within SessionModeProvider");
	}
	return ctx;
}
