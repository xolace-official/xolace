import { isLoaded, loadAsync, useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { type ThemeName, Uniwind, useCSSVariable } from "uniwind";
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

/** Bumped on every switch, so a pair that loads late can't undo a later switch. */
let latestSwitch = 0;

/**
 * The one way the app switches theme after launch (theme-switch.test.ts checks
 * no other file calls `Uniwind.setTheme`). Text drawn before its face is
 * loaded keeps the system face until it re-renders, so a theme whose pair
 * isn't in yet waits for it; one that is switches now, in the same tick. If a
 * face fails to load it switches anyway: the colours matter more than the
 * face. "system" is Default's light or dark, whose pair is always loaded.
 */
export function setThemeWithFonts(name: ThemeName | "system"): void {
	latestSwitch += 1;
	const id = latestSwitch;
	// Uniwind's own "system" isn't in its ThemeName union.
	const apply = () => {
		if (id === latestSwitch) {
			Uniwind.setTheme(name as ThemeName);
		}
	};
	const pair = variantFonts(name);
	if (isPairLoaded(pair)) {
		apply();
		return;
	}
	loadPair(pair).then(apply, apply);
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

/** Loads every pair, for screens that preview themes (the Appearance carousel). True once they are in. */
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
