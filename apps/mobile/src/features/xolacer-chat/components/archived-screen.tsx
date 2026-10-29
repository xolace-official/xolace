import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Skeleton } from "heroui-native";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useMiniPlayerInset } from "@/features/browse/now-playing/now-playing-store";
import { useConversationRowActions } from "../use-conversation-row-actions";
import { ChatsList } from "./chats-list";
import { ConversationActions } from "./conversation-actions";

/** The same list elsewhere; reads the same `myConversations` query (Convex dedupes the
 * subscription). */
export function ArchivedScreen() {
	// Clears the floating mini-player off the last row (none on iOS 26).
	const playerInset = useMiniPlayerInset();
	const conversations = useQuery(api.xolacerChat.myConversations);
	const actions = useConversationRowActions();

	const archived = (conversations ?? []).filter((c) => c.archived);

	return (
		<>
			<ScrollView
				className="flex-1 bg-background"
				contentContainerClassName="px-4 pb-10 gap-4"
				contentContainerStyle={
					playerInset ? { paddingBottom: 40 + playerInset } : undefined
				}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				{conversations === undefined ? (
					<View className="gap-3 pt-2">
						<Skeleton className="h-[68px] rounded-none" />
						<Skeleton className="h-[68px] rounded-none" />
					</View>
				) : archived.length === 0 ? (
					// Unarchiving the last row lands here instead of popping the screen, so
					// the empty state says what this place is for.
					<View className="min-h-95 items-center justify-center gap-2.5 px-8">
						<View className="h-12 w-12 items-center justify-center rounded-2xl bg-surface-secondary">
							<AppText className="text-lg">🗂️</AppText>
						</View>
						<AppText className="font-semibold text-[15px] text-foreground">
							Nothing archived
						</AppText>
						<AppText className="max-w-60 text-center text-[13px] text-muted leading-5">
							Archiving a chat tucks it out of your list — your copy only. It
							comes back on its own when there&apos;s new activity.
						</AppText>
					</View>
				) : (
					<>
						<AppText className="pt-1 text-[13px] text-muted leading-5">
							Chats return to your list when there&apos;s new activity.
						</AppText>
						<ChatsList
							conversations={archived}
							onArchive={actions.toggleArchive}
							onLongPress={actions.setSheetFor}
							onOpen={() => actions.setSheetFor(null)}
						/>
					</>
				)}
			</ScrollView>

			<ConversationActions actions={actions} />
		</>
	);
}
