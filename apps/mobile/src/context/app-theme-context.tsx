import React, { createContext, useContext, useMemo } from 'react';
import { Uniwind, useUniwind } from 'uniwind';

/**
 * All available theme variants. Each custom theme needs a light and dark variant.
 *
 * To add your own theme:
 *   1. Create a CSS file in src/themes/ (copy an existing one as a template)
 *   2. Import it in src/global.css
 *   3. Register both variants in metro.config.js `extraThemes`
 *   4. Add the variant names to this union type
 *   5. Add the toggle cases in `toggleTheme` below
 */
type ThemeName =
  | 'light'
  | 'dark'
  | 'quiet-light'
  | 'quiet-dark'
  | 'reverie-light'
  | 'reverie-dark'
  | 'human-light'
  | 'human-dark'
  | 'nightly-light'
  | 'nightly-dark'
  // xolace+ premium themes
  | 'emerald-light'
  | 'emerald-dark'
  | 'rose-light'
  | 'rose-dark'
  | 'platinum-light'
  | 'platinum-dark'
  | 'velvet-light'
  | 'velvet-dark'
  | 'noir-light'
  | 'noir-dark';

interface AppThemeContextType {
  currentTheme: string;
  isLight: boolean;
  isDark: boolean;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(
  undefined
);

/**
 * Provides theme state and switching to the entire app.
 * Wraps Uniwind's theme system with convenience helpers (isLight, isDark, toggleTheme).
 */
export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { theme } = useUniwind();

  const value = useMemo(() => {
    const isLight = theme === 'light' || theme.endsWith('-light');
    const isDark = theme === 'dark' || theme.endsWith('-dark');

    const setTheme = (newTheme: ThemeName) => {
      Uniwind.setTheme(newTheme);
    };

    /** Toggles between light/dark within the current color theme. Add cases here for new themes. */
    const toggleTheme = () => {
      switch (theme) {
        case 'light': Uniwind.setTheme('dark'); break;
        case 'dark': Uniwind.setTheme('light'); break;
        case 'quiet-light': Uniwind.setTheme('quiet-dark'); break;
        case 'quiet-dark': Uniwind.setTheme('quiet-light'); break;
        case 'reverie-light': Uniwind.setTheme('reverie-dark'); break;
        case 'reverie-dark': Uniwind.setTheme('reverie-light'); break;
        case 'human-light': Uniwind.setTheme('human-dark'); break;
        case 'human-dark': Uniwind.setTheme('human-light'); break;
        case 'nightly-light': Uniwind.setTheme('nightly-dark'); break;
        case 'nightly-dark': Uniwind.setTheme('nightly-light'); break;
        case 'emerald-light': Uniwind.setTheme('emerald-dark'); break;
        case 'emerald-dark': Uniwind.setTheme('emerald-light'); break;
        case 'rose-light': Uniwind.setTheme('rose-dark'); break;
        case 'rose-dark': Uniwind.setTheme('rose-light'); break;
        case 'platinum-light': Uniwind.setTheme('platinum-dark'); break;
        case 'platinum-dark': Uniwind.setTheme('platinum-light'); break;
        case 'velvet-light': Uniwind.setTheme('velvet-dark'); break;
        case 'velvet-dark': Uniwind.setTheme('velvet-light'); break;
        case 'noir-light': Uniwind.setTheme('noir-dark'); break;
        case 'noir-dark': Uniwind.setTheme('noir-light'); break;
      }
    };

    return { currentTheme: theme, isLight, isDark, setTheme, toggleTheme };
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
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
};
