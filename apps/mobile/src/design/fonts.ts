import { isLoaded, loadAsync, useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { type ThemeName, Uniwind, useCSSVariable, useUniwind } from "uniwind";
import {
	DEFAULT_FONT_PAIR,
	FONT_PAIR_IDS,
	FONT_PAIRS,
	FONT_ROLES,
	type FontPairId,
	type FontRole,
	launchFaces,
	pairFaces,
} from "./font-pairs";
import { FONT_SOURCES } from "./font-sources";
import { variantFonts } from "./themes";

/**
 * Font loading. At launch, before the splash hides: the fixed faces the first
 * screens need, Default's pair (also night's), the active theme's pair, and
 * the faces old screens still name. Other pairs load when a theme switches to
 * them (`setThemeWithFonts`), so text never shows a face that isn't there yet.
 * The reader loads Atkinson and Literata bold itself
 * (src/features/library/reader/reading-mode.ts).
 */

function sourcesFor(names: readonly string[]): Record<string, number> {
	const out: Record<string, number> = {};
	for (const name of names) {
		const source = FONT_SOURCES[name];
		if (source === undefined) {
			throw new Error(`fonts: no file for "${name}"`);
		}
		out[name] = source;
	}
	return out;
}

function isPairLoaded(id: FontPairId): boolean {
	return pairFaces(id).every((name) => isLoaded(name));
}

const pending = new Map<FontPairId, Promise<void>>();

/** Loads a pair once; later calls share the same promise. */
function loadPair(id: FontPairId): Promise<void> {
	if (isPairLoaded(id)) {
		return Promise.resolve();
	}
	let p = pending.get(id);
	if (!p) {
		p = loadAsync(sourcesFor(pairFaces(id))).finally(() => pending.delete(id));
		pending.set(id, p);
	}
	return p;
}

/**
 * Switches Uniwind to a theme once its font pair is in. If a face fails to
 * load it switches anyway: the colours matter more than the face.
 */
export function setThemeWithFonts(name: ThemeName): Promise<void> {
	const apply = () => Uniwind.setTheme(name);
	return loadPair(variantFonts(name)).then(apply, apply);
}

/**
 * The root layout's font gate. Reads the theme theme-bootstrap already set
 * (src/lib/theme-bootstrap.ts), so only that pair (and Default's) loads
 * before the splash hides.
 */
export function useLaunchFonts(): boolean {
	const [pair] = useState(() => variantFonts(Uniwind.currentTheme));
	const [loaded, error] = useFonts(sourcesFor(launchFaces(pair)));
	// A face that fails to load falls back to the system face; don't hold the splash for it.
	return loaded || error != null;
}

/**
 * Mounted once at the root: if anything switched Uniwind to a theme whose pair
 * isn't loaded (a path that didn't go through `setThemeWithFonts`), load it.
 */
export function useFontPairGuard(): void {
	const pair = useFontPair();
	useEffect(() => {
		if (!isPairLoaded(pair)) {
			loadPair(pair).catch(() => undefined);
		}
	}, [pair]);
}

/** @public Loads every pair, for screens that preview themes (the redesign's theme strip). True once they are in. */
export function useAllFontPairs(): boolean {
	const [loaded, setLoaded] = useState(() => FONT_PAIR_IDS.every(isPairLoaded));
	useEffect(() => {
		if (loaded) {
			return;
		}
		let live = true;
		Promise.allSettled(FONT_PAIR_IDS.map(loadPair)).then(() => {
			if (live) {
				setLoaded(true);
			}
		});
		return () => {
			live = false;
		};
	}, [loaded]);
	return loaded;
}

/** The font pair of the theme in front (the scoped theme's inside a ScopedTheme). */
function useFontPair(): FontPairId {
	const { theme } = useUniwind();
	return variantFonts(theme);
}

export type ThemeFaces = Record<FontRole, string>;
const ROLE_VARS = FONT_ROLES.map((r) => `--font-${r}`);
const QUOTES = /^["']|["']$/g;

/**
 * The active theme's faces as family names, for places that take a style
 * object and no class: navigation header styles, a raw `Text` that has to
 * stay one. Inside a ScopedTheme it is the scoped theme's.
 */
export function useThemeFaces(): ThemeFaces {
	const values = useCSSVariable(ROLE_VARS);
	const out = {} as ThemeFaces;
	FONT_ROLES.forEach((role, i) => {
		// CSS keeps the quotes; a family name has none.
		out[role] = String(
			values[i] ?? FONT_PAIRS[DEFAULT_FONT_PAIR][role]
		).replace(QUOTES, "");
	});
	return out;
}
