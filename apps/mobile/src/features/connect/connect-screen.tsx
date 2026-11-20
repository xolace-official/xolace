import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Segmented } from "@/components/shared/segmented";
import { useConnectScreen } from "./connect-data";
import { COPY } from "./copy";
import {
	DeleteDialog,
	MyProfileButton,
	SetupBanner,
} from "./header/connect-chrome";
import { ChatsFooter, type EmptyNote } from "./list/chats-footer";
import { ChatsList } from "./list/chats-list";
import type { Segment } from "./list/chats-model";
import { ListSkeleton } from "./list/list-skeleton";
import { Roster } from "./roster/roster";

const BOTTOM = 140;

export function ConnectScreen({ letters = null }: { letters?: ReactNode }) {
	const { state, actions, deleting } = useConnectScreen();

	if (state.phase === "disabled") {
		return (
			<ScrollView
				className="flex-1 bg-background"
				contentContainerClassName="grow"
				contentInsetAdjustmentBehavior="automatic"
			>
				{letters ? <View className="px-4 pt-2">{letters}</View> : null}
				<View className="flex-1 items-center justify-center gap-2 px-8 py-10">
					<AppText center variant="headline">
						{COPY.disabled.title}
					</AppText>
					<AppText center color="muted" variant="callout">
						{COPY.disabled.body}
					</AppText>
				</View>
			</ScrollView>
		);
	}

	const ready = state.phase === "ready" ? state : null;
	const empty: EmptyNote | null = ready?.empty
		? ready.empty === "archived"
			? {
					body: COPY.empty.archivedOnlyBody,
					title: COPY.empty.archivedOnlyTitle,
				}
			: {
					body: COPY.empty.body,
					browse: () => actions.setSegment("xolacers"),
					title: COPY.empty.title,
				}
		: null;
	const chats = ready?.segment === "chats";

	return (
		<>
			{ready?.myProfile ? (
				<MyProfileButton
					onPress={actions.openMyProfile}
					paused={ready.myProfile.paused}
				/>
			) : null}
			<ChatsList
				actions={actions}
				bottom={BOTTOM}
				footer={
					ready === null ? (
						<ListSkeleton label={COPY.loading.chats} />
					) : chats ? (
						<ChatsFooter
							archived={{
								count: ready.archivedCount,
								open: actions.openArchived,
							}}
							empty={empty}
						/>
					) : (
						<View className="px-4">
							<Roster
								onFilter={actions.setFilter}
								onOpen={actions.openXolacer}
								roster={ready.roster}
							/>
						</View>
					)
				}
				header={
					<View className="gap-3.5 px-4 pt-2 pb-3.5">
						{letters}
						<Segmented
							onChange={(v: Segment) => actions.setSegment(v)}
							options={COPY.segments}
							value={state.segment}
						/>
						{ready?.setupBanner ? (
							<SetupBanner onPress={actions.openSetup} />
						) : null}
					</View>
				}
				rows={chats && ready ? ready.rows : []}
			/>
			<DeleteDialog deleting={deleting} />
		</>
	);
}
