import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { EmptyState } from "@/components/shared/empty-state";
import { COPY } from "../copy";
import { DeleteDialog } from "../header/connect-chrome";
import { ChatsList } from "../list/chats-list";
import { ListSkeleton } from "../list/list-skeleton";
import { useArchivedScreen } from "./archived-data";

const BOTTOM = 40;

/** Archived: Connect's rows, the ones tucked away. A swipe or the menu brings one back. */
export function ArchivedScreen() {
	const { state, actions, deleting } = useArchivedScreen();
	const { rows } = state;

	return (
		<>
			<ChatsList
				actions={actions}
				bottom={BOTTOM}
				footer={
					rows === undefined ? (
						<ListSkeleton label={COPY.loading.archived} />
					) : rows.length === 0 ? (
						// Unarchiving the last chat lands here rather than popping the screen, so the
						// empty state says what this place is for.
						<EmptyState
							body={COPY.archived.emptyBody}
							className="py-16"
							face
							title={COPY.archived.emptyTitle}
						/>
					) : null
				}
				header={
					<View className="px-4 pt-2 pb-3">
						{rows?.length ? (
							<AppText color="muted" variant="footnote">
								{COPY.archived.hint}
							</AppText>
						) : null}
					</View>
				}
				rows={rows ?? []}
			/>
			<DeleteDialog deleting={deleting} />
		</>
	);
}
