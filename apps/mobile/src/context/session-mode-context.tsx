import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { setThemeWithFonts, targetTheme } from "@/design/fonts";
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

const NIGHT_START = 22;
const NIGHT_END = 4;
const HOURS_IN_DAY = 24;

/** Returns true if the given hour (0–23) falls in the night window (22:00–04:00). */
function isNightHour(hour: number): boolean {
	return hour >= NIGHT_START || hour < NIGHT_END;
}

/** Milliseconds until the next 22:00 or 04:00 (a second past it), for a timer to wake at. */
function msToNextBoundary(now: Date): number {
	const hour = now.getHours();
	let target = NIGHT_END + HOURS_IN_DAY;
	if (hour < NIGHT_END) {
		target = NIGHT_END;
	} else if (hour < NIGHT_START) {
		target = NIGHT_START;
	}
	const next = new Date(now);
	// Hour 28 is tomorrow's 04:00.
	next.setHours(target, 0, 1, 0);
	return next.getTime() - now.getTime();
}

function computeMode(): SessionMode {
	return isNightHour(new Date().getHours()) ? "night" : "day";
}

/** Session mode from the device clock, recomputed on foreground and at 22:00 and 04:00 while
 * the app is open. Night stashes the theme and sets NIGHT_VARIANT (`nightly-dark`); day
 * restores it. */
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
		// A colour theme picked a moment ago may still be loading its pair.
		const current = targetTheme();
		setPreviousTheme(current);
		setThemeWithFonts(NIGHT_VARIANT);
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
			setThemeWithFonts(stashed.name);
			return;
		}

		const mode = storedTheme === "system" ? "dark" : storedTheme;
		setThemeWithFonts(themeVariant(colorThemeId, mode));
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
	const [active, setActive] = useState(AppState.currentState === "active");
	useEffect(() => {
		const handler = (state: AppStateStatus) => {
			setActive(state === "active");
			if (state === "active") {
				forceRefresh();
			}
		};
		const sub = AppState.addEventListener("change", handler);
		return () => sub.remove();
	}, []);

	// While open, wake at the next boundary so night begins and ends on time. Timers sleep
	// in the background, so the timer stops there and foreground recomputes instead.
	useEffect(() => {
		if (!active) {
			return;
		}
		const id = setTimeout(forceRefresh, msToNextBoundary(new Date()));
		return () => clearTimeout(id);
	}, [active, mode]);

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
