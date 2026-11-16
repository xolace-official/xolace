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
import { findVariant, NIGHT_VARIANT, themeVariant } from "@/design/themes";
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
 * sets NIGHT_VARIANT (`nightly-dark`); day restores it. */
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
		Uniwind.setTheme(NIGHT_VARIANT);
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

		// A stashed name this build no longer draws falls through to the saved theme.
		const stashed = findVariant(previousTheme);
		if (stashed) {
			Uniwind.setTheme(stashed.name);
			return;
		}

		const mode = storedTheme === "system" ? "dark" : storedTheme;
		Uniwind.setTheme(themeVariant(colorThemeId, mode));
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
