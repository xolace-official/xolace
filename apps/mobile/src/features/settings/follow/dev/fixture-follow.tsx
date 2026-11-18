/** Follow & Support's fixture adapter: the real screen under a provider filled from fixtures. */
import { useEffect, useRef } from "react";
import type { ScrollViewInstance } from "react-native";
import { ScopedTheme, type ThemeName } from "uniwind";
import { FOLLOW_ACTIONS } from "@/features/settings/follow/dev/fixtures";
import {
	type Follow,
	FollowProvider,
} from "@/features/settings/follow/follow-data";
import { FollowScreen } from "@/features/settings/follow/follow-screen";

/** Long enough for the first layout to land before scrolling to the end. */
const SETTLE_MS = 300;

export function FixtureFollow({
	state,
	atEnd = false,
	theme,
}: {
	state: Follow["state"];
	/** Open scrolled to the socials (§9 `scroll=bottom`). */
	atEnd?: boolean;
	/** Draw the page in this theme (the header keeps the app's). */
	theme?: ThemeName;
}) {
	const scroll = useRef<ScrollViewInstance>(null);
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
		<FollowProvider value={{ actions: FOLLOW_ACTIONS, state }}>
			<FollowScreen ref={scroll} />
		</FollowProvider>
	);
	return theme ? <ScopedTheme theme={theme}>{screen}</ScopedTheme> : screen;
}
