import { useState } from "react";
import { ScopedTheme, type ThemeName } from "uniwind";
import { NIGHT_VARIANT, themeVariant } from "@/design/themes";
import type { Light } from "../../letter-paper";
import type { ReceivedLetter } from "../../letters-model";
import { type LetterReader, ReaderProvider, type Undo } from "../read-data";
import { ReadScreen } from "../read-screen";

const THEME: Record<Light, ThemeName> = {
	day: themeVariant("default", "light"),
	dusk: themeVariant("default", "dark"),
	night: NIGHT_VARIANT,
};

export type ReadFixture = {
	letter: ReceivedLetter;
	undo?: Undo;
	light?: Light;
};

/**
 * The reader on fixtures: opening, acknowledging, hiding and unhiding change only this state.
 * A `light` pins the paper's light (Dusk, Night) whatever the device's theme and hour.
 */
export function ReadFixtureScreen({ fixture }: { fixture: ReadFixture }) {
	const [letter, setLetter] = useState(fixture.letter);
	const patch = (p: Partial<ReceivedLetter>) => setLetter({ ...letter, ...p });
	const value: LetterReader = {
		actions: {
			acknowledge: () => patch({ acknowledged: true }),
			hide: () => patch({ hidden: true }),
			open: () => patch({ opened: true }),
			unhide: () => patch({ hidden: false }),
		},
		state: { letter, opens: { undo: fixture.undo ?? null } },
	};
	const screen = (
		<ReaderProvider value={value}>
			<ReadScreen />
		</ReaderProvider>
	);
	return fixture.light ? (
		<ScopedTheme theme={THEME[fixture.light]}>{screen}</ScopedTheme>
	) : (
		screen
	);
}
