import { useHeaderHeight } from "expo-router/react-navigation";
import type { ReactNode } from "react";
import { Platform, ScrollView, View } from "react-native";
import { ScrollViewMarker } from "react-native-screens/experimental";
import { AppText } from "@/components/shared/app-text";
import { BandBlur } from "@/components/shared/band-blur";
import { Segmented } from "@/components/shared/segmented";
import { useTokenColor } from "@/lib/use-token-color";
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
import { Roster, RosterFilters } from "./roster/roster";

const BOTTOM = 40;
const IOS = Platform.OS === "ios";
const EDGE_FADE = 18;

export function ConnectScreen({ letters = null }: { letters?: ReactNode }) {
	const { state, actions, deleting } = useConnectScreen();
	const headerHeight = useHeaderHeight();
	const page = useTokenColor("background");

	if (state.phase === "disabled") {
		return (
			<ScrollViewMarker scrollEdgeEffects={{ top: "soft" }} style={{ flex: 1 }}>
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
			</ScrollViewMarker>
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
		<View className="flex-1 bg-background">
			{ready?.myProfile ? (
				<MyProfileButton
					onPress={actions.openMyProfile}
					paused={ready.myProfile.paused}
				/>
			) : null}
			{/* iOS's bar is see-through, so the pinned top starts under it; Android's is opaque. */}
			<View style={{ paddingTop: IOS ? headerHeight : 0 }}>
				<View className="gap-3.5 px-4 pt-2">
					{letters}
					<Segmented
						onChange={(v: Segment) => actions.setSegment(v)}
						options={COPY.segments}
						value={state.segment}
					/>
					{ready && !chats ? (
						<RosterFilters onFilter={actions.setFilter} roster={ready.roster} />
					) : null}
				</View>
			</View>
			<View className="flex-1">
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
						ready?.setupBanner ? (
							<View className="px-4 pb-3.5">
								<SetupBanner onPress={actions.openSetup} />
							</View>
						) : null
					}
					rows={chats && ready ? ready.rows : []}
					top={EDGE_FADE}
				/>
				<View
					className="absolute inset-x-0 top-0"
					pointerEvents="none"
					style={{ height: EDGE_FADE }}
				>
					<BandBlur height={EDGE_FADE} page={page} solid={0} />
				</View>
			</View>
			<DeleteDialog deleting={deleting} />
		</View>
	);
}
