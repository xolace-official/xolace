import { useEffect, useRef } from "react";
import type { ScrollViewInstance } from "react-native";
import { ScopedTheme, type ThemeName } from "uniwind";
import { FOLLOW_ACTIONS } from "@/features/settings/follow/dev/fixtures";
import {
	type Follow,
	FollowProvider,
} from "@/features/settings/follow/follow-data";
import { FollowScreen } from "@/features/settings/follow/follow-screen";

const SETTLE_MS = 300;

export function FixtureFollow({
	state,
	atEnd = false,
	theme,
}: {
	state: Follow["state"];
	atEnd?: boolean;
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
