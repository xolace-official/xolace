// The deck is pinned dark via `<ScopedTheme>`. heroui's `useThemeColor` ignores that
// pin (it reads the global theme); Uniwind's `useCSSVariable` honours it, so every
// colour this screen reads in JS comes through here.
import { useCSSVariable } from "uniwind";

export const useDeckColor = (token: string) =>
	useCSSVariable(`--${token}`) as string;
