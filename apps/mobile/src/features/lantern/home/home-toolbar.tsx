import AccountCircle from "@expo/material-symbols/account_circle.xml";
import BookmarkIcon from "@expo/material-symbols/bookmark.xml";
import { router, Stack } from "expo-router";
import { COPY } from "@/features/lantern/copy";
import { useHomeScreen } from "@/features/lantern/home/home-data";
import { SAVED_HREF } from "@/features/lantern/lantern-links";
import { facetLabel } from "@/features/lantern/lantern-model";

const IOS = process.env.EXPO_OS === "ios";

/**
 * The home's bar (handoff §1): Saved, and once Reading as is answered, its menu (multi-select,
 * the system ticks it). Until then Saved sits alone at the right.
 */
export function HomeToolbar() {
	const { state, actions } = useHomeScreen();
	const readingAs = state.home?.readingAs ?? null;
	const options = state.home?.audiences.map((a) => a.slug) ?? [];
	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Button
				accessibilityLabel={COPY.home.saved}
				icon={IOS ? "bookmark" : BookmarkIcon}
				onPress={() => router.push(SAVED_HREF)}
				separateBackground
			/>
			{readingAs !== null && options.length > 0 ? (
				<Stack.Toolbar.Menu
					accessibilityLabel={COPY.home.readingAsMenu}
					icon={IOS ? "person.crop.circle" : AccountCircle}
					separateBackground
					title={COPY.readingAs.title}
				>
					{options.map((slug) => (
						<Stack.Toolbar.MenuAction
							isOn={readingAs.includes(slug)}
							key={slug}
							onPress={() => actions.flipAudience(slug)}
						>
							{facetLabel(slug)}
						</Stack.Toolbar.MenuAction>
					))}
				</Stack.Toolbar.Menu>
			) : null}
		</Stack.Toolbar>
	);
}
