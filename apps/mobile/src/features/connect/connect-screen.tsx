import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Segmented } from "@/components/shared/segmented";
import { useMiniPlayerInset } from "@/lib/now-playing/now-playing-store";
import { useConnectScreen } from "./connect-data";
import { COPY } from "./copy";
import {
	DeleteDialog,
	MyProfileButton,
	SetupBanner,
} from "./header/connect-chrome";
import { ChatsList, type EmptyNote } from "./list/chats-list";
import type { Segment } from "./list/chats-model";
import { Roster } from "./roster/roster";

/** The page's bottom room, above the tab bar. */
const BOTTOM = 140;
const SKELETON_ROWS = 3;

/**
 * Connect: the one place a human answers. Chats and Xolacers behind one native segment, under
 * the stack's large title, which folds on scroll. Letters (S20) adds its card between the title
 * and the segment.
 */
export function ConnectScreen() {
	const { state, actions, deleting } = useConnectScreen();
	// Clears the floating mini player off the last row (none on iOS 26).
	const playerInset = useMiniPlayerInset();

	if (state.phase === "disabled") {
		return (
			<View className="flex-1 items-center justify-center gap-2 bg-background px-8">
				<AppText center variant="headline">
					{COPY.disabled.title}
				</AppText>
				<AppText center color="muted" variant="callout">
					{COPY.disabled.body}
				</AppText>
			</View>
		);
	}

	const empty: EmptyNote | null =
		state.phase !== "ready" || !state.empty
			? null
			: state.empty === "archived"
				? {
						body: COPY.empty.archivedOnlyBody,
						title: COPY.empty.archivedOnlyTitle,
					}
				: {
						body: COPY.empty.body,
						browse: () => actions.setSegment("xolacers"),
						title: COPY.empty.title,
					};

	return (
		<>
			{state.phase === "ready" && state.myProfile ? (
				<MyProfileButton
					onPress={actions.openMyProfile}
					paused={state.myProfile.paused}
				/>
			) : null}
			<ScrollView
				className="bg-background"
				contentContainerClassName="gap-3.5 px-4 pt-2"
				contentContainerStyle={{ paddingBottom: BOTTOM + playerInset }}
				contentInsetAdjustmentBehavior="automatic"
			>
				{/* Letters (S20): its Connect card goes here, above the segment. */}
				<Segmented
					onChange={(v: Segment) => actions.setSegment(v)}
					options={COPY.segments}
					value={state.phase === "ready" ? state.segment : "chats"}
				/>
				{state.phase === "loading" ? (
					<ListSkeleton />
				) : (
					<>
						{state.setupBanner ? (
							<SetupBanner onPress={actions.openSetup} />
						) : null}
						{state.segment === "chats" ? (
							<ChatsList
								actions={actions}
								archived={{
									count: state.archivedCount,
									open: actions.openArchived,
								}}
								empty={empty}
								rows={state.rows}
							/>
						) : (
							<Roster
								onFilter={actions.setFilter}
								onOpen={actions.openXolacer}
								roster={state.roster}
							/>
						)}
					</>
				)}
			</ScrollView>
			<DeleteDialog deleting={deleting} />
		</>
	);
}

/** Row-shaped, not card-shaped: the list it resolves into is flat. */
function ListSkeleton() {
	return (
		<View
			accessibilityElementsHidden
			className="gap-3 pt-1"
			importantForAccessibility="no-hide-descendants"
		>
			{Array.from({ length: SKELETON_ROWS }, (_, i) => (
				<View className="flex-row items-center gap-3 px-1 py-3" key={i}>
					<View className="size-12 rounded-full bg-surface-secondary" />
					<View className="flex-1 gap-2">
						<View className="h-3.5 w-28 rounded-full bg-surface-secondary" />
						<View className="h-3 w-48 rounded-full bg-surface-secondary" />
					</View>
				</View>
			))}
		</View>
	);
}
