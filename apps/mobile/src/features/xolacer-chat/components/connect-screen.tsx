import BedtimeIcon from "@expo/material-symbols/bedtime.xml";
import PersonIcon from "@expo/material-symbols/person.xml";
import { api } from "@xolace/backend/convex/_generated/api";
import { isSpecialty } from "@xolace/backend/convex/lib/specialties";
import { useQuery } from "convex/react";
import { Stack, useRouter } from "expo-router";
import { Skeleton } from "heroui-native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { SegmentedControl } from "@/components/shared/segmented-control";
import { useMiniPlayerInset } from "@/features/browse/now-playing/now-playing-store";
import { playSoftPress } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useChatWarmup } from "../use-chat-warmup";
import { useConversationRowActions } from "../use-conversation-row-actions";
import { ArchivedEntryRow } from "./archived-entry-row";
import { ChatsList } from "./chats-list";
import { ConversationActions } from "./conversation-actions";
import { XolacerRoster } from "./xolacer-roster";
import { XolacerSetupBanner } from "./xolacer-setup-banner";

type Segment = "chats" | "xolacers";

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
});

function SegmentLabel({ label, active }: { label: string; active: boolean }) {
	return (
		<AppText
			className={cn(
				"font-semibold text-[13px]",
				active ? "text-accent-foreground" : "text-muted"
			)}
		>
			{label}
		</AppText>
	);
}

/**
 * The Connect tab: Chats (conversations in every lifecycle state, including a
 * xolacer's incoming requests) and Xolacers (the roster). Auto-lands on
 * Chats when any conversation exists, on Xolacers otherwise — a first-time
 * user meets the roster, a returning user meets their thread.
 */
export function ConnectScreen({
	specialty,
	view,
	navToken,
	stepId,
}: {
	specialty?: string;
	view?: string;
	navToken?: string;
	/** Kindling twig that sent us — carried to the profile, tended on request. */
	stepId?: string;
}) {
	// Clears the floating mini-player off the last row (none on iOS 26).
	const playerInset = useMiniPlayerInset();
	const router = useRouter();
	const status = useQuery(api.xolacerChat.status);
	const conversations = useQuery(api.xolacerChat.myConversations);
	// A specialty always means the roster; otherwise the segment is whatever the
	// route named, if it named one.
	const routedSegment: Segment | null = isSpecialty(specialty)
		? "xolacers"
		: view === "chats" || view === "xolacers"
			? view
			: null;
	const [selected, setSelected] = useState<Segment | null>(routedSegment);
	const [filter, setFilter] = useState<string | null>(
		isSpecialty(specialty) ? specialty : null
	);
	const actions = useConversationRowActions();
	const { sheetFor, setSheetFor } = actions;

	// Arriving with a specialty (from a profile's "others listen to this too")
	// snaps to the roster filtered to it; arriving from a notification snaps to
	// the segment that notification is about. The tab stays mounted across
	// navigations, so the params are latched and re-applied when they change
	// rather than only read at mount — and `navToken` differs per tap, so a
	// second notification for the same segment still lands.
	const routed = `${specialty ?? ""}|${view ?? ""}|${navToken ?? ""}`;
	const [routedParams, setRoutedParams] = useState(routed);
	if (routed !== routedParams) {
		setRoutedParams(routed);
		if (isSpecialty(specialty)) {
			setFilter(specialty);
		}
		// Sent to the roster without a specialty — a decline, whose copy promises
		// "other xolacers are available". A filter left over from earlier browsing
		// would answer that with a narrowed, possibly empty list.
		else if (routedSegment === "xolacers") {
			setFilter(null);
		}
		if (routedSegment) {
			setSelected(routedSegment);
		}
	}

	// Opens the Stream connection and warms every channel in the list, so tapping
	// a row lands on messages instead of a skeleton. Held off until `status`
	// confirms the feature is on — a disabled deployment has no token to mint.
	useChatWarmup(conversations, status?.enabled ?? false);

	const loading = status === undefined || conversations === undefined;
	const archivedChats = (conversations ?? []).filter((c) => c.archived);
	const activeChats = (conversations ?? []).filter((c) => !c.archived);
	// Archived ones count: archiving your last active chat shouldn't bounce you
	// to the roster, it should leave you on Chats with the Archived row in front
	// of you. Only someone with no conversations at all meets the roster.
	const segment: Segment =
		selected ?? ((conversations ?? []).length > 0 ? "chats" : "xolacers");
	// The sheet outlives the list it was raised from now that it renders out
	// here, so leaving Chats — by the segment control or by a notification —
	// would strand it over the roster with the tab bar still hidden.
	if (segment !== "chats" && sheetFor) {
		setSheetFor(null);
	}

	if (status && !status.enabled) {
		return (
			<View className="flex-1 items-center justify-center gap-2 bg-background px-8">
				<AppText className="font-medium text-base text-foreground">
					Nothing here yet
				</AppText>
				<AppText className="text-center text-muted text-sm">
					This space is still being prepared. Check back soon.
				</AppText>
			</View>
		);
	}

	// A published xolacer's way to their own profile — the self-preview everyone
	// else sees, and from there the edit sheet. Before publishing, the setup
	// banner still owns that job and no button renders.
	const published =
		status?.enabled === true &&
		status.isXolacer &&
		status.xolacerProfileComplete;
	// Paused is a state someone can forget they're in now that the status card
	// is gone, so the icon itself carries it: a moon instead of a face, on the
	// one control that leads to the switch.
	const paused = published && !status.xolacerActive;

	// Archived is a screen in this stack rather than a filter swapped in under a
	// text link: it gets a title, a back button and a place in the history, and
	// you can leave for another tab from it without backing out first. All that
	// is left here is the way in, and only once there is something behind it.
	const archivedEntry =
		archivedChats.length > 0 ? (
			<ArchivedEntryRow
				count={archivedChats.length}
				showSeparator={activeChats.length > 0}
			/>
		) : undefined;

	return (
		<>
			{published && (
				<Stack.Toolbar placement="right">
					<Stack.Toolbar.Button
						accessibilityLabel={
							paused
								? "Your Xolacer profile — you're paused"
								: "Your Xolacer profile"
						}
						icon={
							paused
								? process.env.EXPO_OS === "ios"
									? "moon.zzz"
									: BedtimeIcon
								: process.env.EXPO_OS === "ios"
									? "person.crop.circle"
									: PersonIcon
						}
						onPress={() => {
							playSoftPress();
							router.push(`/xolacer/${status.myProfileId}`);
						}}
					/>
				</Stack.Toolbar>
			)}

			<ScrollView
				className="flex-1 bg-background"
				contentContainerClassName="px-4 pb-10 gap-4"
				contentContainerStyle={
					playerInset ? { paddingBottom: 40 + playerInset } : undefined
				}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				{loading ? (
					<View className="gap-3 pt-2">
						<Skeleton className="h-11 rounded-2xl" />
						{/* Row-shaped, not card-shaped — the list it resolves into is flat. */}
						<Skeleton className="h-17 rounded-none" />
						<Skeleton className="h-17 rounded-none" />
						<Skeleton className="h-17 rounded-none" />
					</View>
				) : (
					<>
						<SegmentedControl
							className="relative mt-1 rounded-2xl bg-surface-secondary p-1"
							onValueChange={(value) => setSelected(value as Segment)}
							value={segment}
						>
							<SegmentedControl.Indicator
								className="top-1 rounded-xl bg-accent"
								style={styles.borderCurve}
							/>
							<SegmentedControl.Item
								className="flex-1 items-center py-2.5"
								value="chats"
							>
								<SegmentLabel active={segment === "chats"} label="Chats" />
							</SegmentedControl.Item>
							<SegmentedControl.Item
								className="flex-1 items-center py-2.5"
								value="xolacers"
							>
								<SegmentLabel
									active={segment === "xolacers"}
									label="Xolacers"
								/>
							</SegmentedControl.Item>
						</SegmentedControl>

						{status?.enabled &&
							status.isXolacer &&
							!status.xolacerProfileComplete && <XolacerSetupBanner />}

						{segment === "chats" ? (
							<ChatsList
								conversations={activeChats}
								empty={
									archivedChats.length > 0
										? {
												body: "Everything you've talked about is archived. It comes back here on its own when there's new activity.",
												title: "No active conversations",
											}
										: undefined
								}
								header={archivedEntry}
								onArchive={actions.toggleArchive}
								onBrowseXolacers={() => setSelected("xolacers")}
								onLongPress={setSheetFor}
								onOpen={() => setSheetFor(null)}
							/>
						) : (
							<XolacerRoster
								conversations={conversations ?? []}
								filter={filter}
								onFilterChange={setFilter}
								stepId={stepId}
							/>
						)}
					</>
				)}
			</ScrollView>

			<ConversationActions actions={actions} />
		</>
	);
}
