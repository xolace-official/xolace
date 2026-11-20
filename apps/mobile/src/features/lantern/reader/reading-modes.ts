import {
	AtkinsonHyperlegibleNext_400Regular,
	AtkinsonHyperlegibleNext_400Regular_Italic,
	AtkinsonHyperlegibleNext_700Bold,
} from "@expo-google-fonts/atkinson-hyperlegible-next";
import {
	Literata_400Regular,
	Literata_400Regular_Italic,
	Literata_700Bold,
} from "@expo-google-fonts/literata";
import { useFonts } from "expo-font";
import type { ReadingModeKey } from "@/store/store";

export type { ReadingModeKey };
export type ReaderPage = "app" | "paper" | "night";
type Face = { regular: string; italic: string; bold: string };

export const READING_MODES: Record<
	ReadingModeKey,
	{
		label: string;
		blurb: string;
		face: Face | null;
		lineHeight: number;
		page: ReaderPage;
	}
> = {
	classic: {
		blurb: "The app’s own face and theme",
		face: null,
		label: "Classic",
		lineHeight: 1.55,
		page: "app",
	},
	clear: {
		blurb: "Easy letters, roomier lines, paper",
		face: {
			bold: "AtkinsonHyperlegibleNext_700Bold",
			italic: "AtkinsonHyperlegibleNext_400Regular_Italic",
			regular: "AtkinsonHyperlegibleNext_400Regular",
		},
		label: "Clear",
		lineHeight: 1.75,
		page: "paper",
	},
	fire: {
		blurb: "A book serif, warm and dim for night",
		face: {
			bold: "Literata_700Bold",
			italic: "Literata_400Regular_Italic",
			regular: "Literata_400Regular",
		},
		label: "By the fire",
		lineHeight: 1.55,
		page: "night",
	},
};

export const READING_MODE_KEYS = Object.keys(READING_MODES) as ReadingModeKey[];

export const TEXT_SIZES = [16, 17, 18, 20, 22, 24] as const;
const DEFAULT_TEXT_SIZE = 18;

export function stepTextSize(size: number, by: 1 | -1): number {
	const i = TEXT_SIZES.indexOf(size as (typeof TEXT_SIZES)[number]);
	const from = i < 0 ? TEXT_SIZES.indexOf(DEFAULT_TEXT_SIZE) : i;
	return TEXT_SIZES[Math.min(Math.max(from + by, 0), TEXT_SIZES.length - 1)];
}

export function useReadingFonts(): boolean {
	const [loaded] = useFonts({
		AtkinsonHyperlegibleNext_400Regular,
		AtkinsonHyperlegibleNext_400Regular_Italic,
		AtkinsonHyperlegibleNext_700Bold,
		Literata_400Regular,
		Literata_400Regular_Italic,
		Literata_700Bold,
	});
	return loaded;
}
