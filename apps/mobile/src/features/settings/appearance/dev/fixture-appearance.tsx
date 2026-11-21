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

const SETTLE_MS = 300;

export function FixtureAppearance({
	state,
	atEnd = false,
	theme,
}: {
	state: Appearance["state"];
	atEnd?: boolean;
	theme?: ThemeName;
}) {
	const scroll = useRef<ScrollViewInstance>(null);
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
