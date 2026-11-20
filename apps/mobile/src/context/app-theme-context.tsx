import type React from "react";
import { createContext, useContext, useMemo } from "react";
import { type ThemeName, useUniwind } from "uniwind";
import { setThemeWithFonts } from "@/design/fonts";
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

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { theme } = useUniwind();

	const value = useMemo(() => {
		const isDark = findVariant(theme)?.base === "dark";

		const setTheme = (newTheme: ThemeName) => {
			setThemeWithFonts(newTheme);
		};

		const toggleTheme = () => {
			setThemeWithFonts(oppositeVariant(theme));
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

export const useAppTheme = () => {
	const context = useContext(AppThemeContext);
	if (!context) {
		throw new Error("useAppTheme must be used within AppThemeProvider");
	}
	return context;
};
