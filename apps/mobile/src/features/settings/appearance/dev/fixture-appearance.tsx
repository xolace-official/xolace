/** Appearance's fixture adapter: the real screen under a provider filled from fixtures. */
import { useEffect, useRef } from "react";
import { type ScrollViewInstance, useColorScheme } from "react-native";
import { ScopedTheme, type ThemeName } from "uniwind";
import {
	type Appearance,
	AppearanceProvider,
} from "@/features/settings/appearance/appearance-data";
import { modeNote } from "@/features/settings/appearance/appearance-model";
import { AppearanceScreen } from "@/features/settings/appearance/appearance-screen";
import { APPEARANCE_ACTIONS } from "@/features/settings/appearance/dev/fixtures";

/** Long enough for the first layout to land before scrolling to the end. */
const SETTLE_MS = 300;

export function FixtureAppearance({
	state,
	atEnd = false,
	theme,
}: {
	state: Appearance["state"];
	/** Open scrolled to the bottom (§9 `scroll=bottom`). */
	atEnd?: boolean;
	/** Draw the page in this theme, as a pick would (the header keeps the app's). */
	theme?: ThemeName;
}) {
	const scroll = useRef<ScrollViewInstance>(null);
	// The System note names what the phone shows now, as the app's adapter does.
	const osDark = useColorScheme() === "dark";
	useEffect(() => {
		if (!atEnd) {
			return;
		}
		const id = setTimeout(
			() => scroll.current?.scrollToEnd({ animated: false }),
			SETTLE_MS
		);
		return () => clearTimeout(id);
	}, [atEnd]);
	const screen = (
		<AppearanceProvider
			value={{
				actions: APPEARANCE_ACTIONS,
				state: { ...state, modeNote: modeNote(state.mode, osDark) },
			}}
		>
			<AppearanceScreen ref={scroll} />
		</AppearanceProvider>
	);
	return theme ? <ScopedTheme theme={theme}>{screen}</ScopedTheme> : screen;
}
