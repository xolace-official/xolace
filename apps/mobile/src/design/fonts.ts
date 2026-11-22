import { isLoaded, loadAsync, useFonts } from "expo-font";
import { useEffect, useState } from "react";
import { type ThemeName, Uniwind, useCSSVariable, useUniwind } from "uniwind";
import { applyTheme } from "@/lib/native-appearance";
import {
	DEFAULT_FONT_PAIR,
	FIXED_FACES,
	type FixedFace,
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

let latestSwitch = 0;
let pendingTheme: ThemeName | "system" | null = null;

export function setThemeWithFonts(name: ThemeName | "system"): void {
	latestSwitch += 1;
	const id = latestSwitch;
	const apply = () => {
		if (id === latestSwitch) {
			pendingTheme = null;
			applyTheme(name);
		}
	};
	const pair = variantFonts(name);
	if (isPairLoaded(pair)) {
		apply();
		return;
	}
	pendingTheme = name;
	loadPair(pair).then(apply, apply);
}

export function targetTheme(): string {
	return pendingTheme ?? Uniwind.currentTheme;
}

export function useLaunchFonts(): boolean {
	const [pair] = useState(() => variantFonts(Uniwind.currentTheme));
	const [loaded, error] = useFonts(sourcesFor(launchFaces(pair)));
	return loaded || error != null;
}

export function useFixedFaces(...faces: FixedFace[]): boolean {
	const [loaded, error] = useFonts(
		sourcesFor(faces.map((face) => FIXED_FACES[face]))
	);
	return loaded || error != null;
}

export function useFontPair(): FontPairId {
	const { theme } = useUniwind();
	return variantFonts(theme);
}

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

export function useThemeFaces(): ThemeFaces {
	const values = useCSSVariable(ROLE_VARS);
	const out = {} as ThemeFaces;
	FONT_ROLES.forEach((role, i) => {
		out[role] = String(
			values[i] ?? FONT_PAIRS[DEFAULT_FONT_PAIR][role]
		).replace(QUOTES, "");
	});
	return out;
}
