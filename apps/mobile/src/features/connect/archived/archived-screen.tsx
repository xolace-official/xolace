import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useMiniPlayerInset } from "@/lib/now-playing/now-playing-store";
import { COPY } from "../copy";
import { DeleteDialog } from "../header/connect-chrome";
import { ChatsList } from "../list/chats-list";
import { useArchivedScreen } from "./archived-data";

const BOTTOM = 40;

/** Archived: Connect's rows, the ones tucked away. A swipe or the menu brings one back. */
export function ArchivedScreen() {
	const { state, actions, deleting } = useArchivedScreen();
	// Clears the floating mini player off the last row (none on iOS 26).
	const playerInset = useMiniPlayerInset();
	const { rows } = state;

	return (
		<>
			<ScrollView
				className="bg-background"
				contentContainerClassName="gap-3 px-4 pt-2"
				contentContainerStyle={{ paddingBottom: BOTTOM + playerInset }}
				contentInsetAdjustmentBehavior="automatic"
			>
				{rows === undefined ? null : rows.length === 0 ? (
					// Unarchiving the last chat lands here rather than popping the screen, so the
					// empty state says what this place is for.
					<View className="items-center gap-2 px-6 py-16">
						<AppText center variant="headline">
							{COPY.archived.emptyTitle}
						</AppText>
						<AppText
							center
							className="max-w-70"
							color="muted"
							variant="callout"
						>
							{COPY.archived.emptyBody}
						</AppText>
					</View>
				) : (
					<>
						<AppText color="muted" variant="footnote">
							{COPY.archived.hint}
						</AppText>
						<ChatsList actions={actions} rows={rows} />
					</>
				)}
			</ScrollView>
			<DeleteDialog deleting={deleting} />
		</>
	);
}
