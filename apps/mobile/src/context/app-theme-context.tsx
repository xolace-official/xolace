import type React from "react";
import { createContext, useContext, useMemo } from "react";
import { type ThemeName, Uniwind, useUniwind } from "uniwind";
import { findVariant, oppositeVariant } from "@/design/themes";

interface AppThemeContextType {
	currentTheme: string;
	isDark: boolean;
	isLight: boolean;
	setTheme: (theme: ThemeName) => void;
	toggleTheme: () => void;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(
	undefined
);

/** Theme state and switching for the app, wrapping Uniwind with isLight/isDark/toggleTheme. */
export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { theme } = useUniwind();

	const value = useMemo(() => {
		const isDark = findVariant(theme)?.base === "dark";

		const setTheme = (newTheme: ThemeName) => {
			Uniwind.setTheme(newTheme);
		};

		/** Toggles between light and dark within the current colour theme. */
		const toggleTheme = () => {
			Uniwind.setTheme(oppositeVariant(theme));
		};

		return {
			currentTheme: theme,
			isDark,
			isLight: !isDark,
			setTheme,
			toggleTheme,
		};
	}, [theme]);

	return (
		<AppThemeContext.Provider value={value}>
			{children}
		</AppThemeContext.Provider>
	);
};

/** Access theme state anywhere in the app. Must be used within AppThemeProvider. */
export const useAppTheme = () => {
	const context = useContext(AppThemeContext);
	if (!context) {
		throw new Error("useAppTheme must be used within AppThemeProvider");
	}
	return context;
};
