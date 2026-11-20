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

export function isNightHour(hour: number): boolean {
	return hour >= NIGHT_START || hour < NIGHT_END;
}

function msToNextBoundary(now: Date): number {
	const hour = now.getHours();
	let target = NIGHT_END + HOURS_IN_DAY;
	if (hour < NIGHT_END) {
		target = NIGHT_END;
	} else if (hour < NIGHT_START) {
		target = NIGHT_START;
	}
	const next = new Date(now);
	next.setHours(target, 0, 1, 0);
	return next.getTime() - now.getTime();
}

function computeMode(): SessionMode {
	return isNightHour(new Date().getHours()) ? "night" : "day";
}

export function SessionModeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const nightModeEnabled = useAppStore((s) => s.nightModeEnabled);
	const setPreviousTheme = useAppStore((s) => s.setPreviousTheme);

	const [, forceRefresh] = useReducer((n: number) => n + 1, 0);
	const mode: SessionMode = computeMode();

	const nightAppliedRef = useRef(false);

	const applyNightTheme = useCallback(() => {
		if (nightAppliedRef.current) {
			return;
		}
		nightAppliedRef.current = true;
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

		const stashed = findVariant(previousTheme);
		if (stashed) {
			setThemeWithFonts(stashed.name);
			return;
		}

		const mode = storedTheme === "system" ? "dark" : storedTheme;
		setThemeWithFonts(themeVariant(colorThemeId, mode));
	}, [setPreviousTheme]);

	useEffect(() => {
		if (nightModeEnabled && mode === "night") {
			applyNightTheme();
		} else {
			restoreDayTheme();
		}
	}, [mode, nightModeEnabled, applyNightTheme, restoreDayTheme]);

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

export function useSessionMode(): SessionModeContextType {
	const ctx = useContext(SessionModeContext);
	if (!ctx) {
		throw new Error("useSessionMode must be used within SessionModeProvider");
	}
	return ctx;
}
