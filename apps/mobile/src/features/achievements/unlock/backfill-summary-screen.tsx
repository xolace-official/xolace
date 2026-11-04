// First sight of the backfill (#701): what the user had already earned before
// badges arrived, once, in one quiet screen rather than one unlock at a time.
// Also badges left unseen for a week, for someone who may already know badges.
// Opened by useBadgeUnlock before any live unlock; the toolbar's close, See
// them and Android back all dismiss it, and dismissing stamps it seen.

import CloseIcon from "@expo/material-symbols/close.xml";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
	type NativeStackNavigationProp,
	router,
	Stack,
	useNavigation,
} from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { PressableFeedback } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { Badge } from "@/features/achievements/badge";
import type { BackfillSummary } from "@/features/achievements/types";

const THUMBNAIL_SIZE = 72;

const plural = (count: number, noun: string) =>
	`${count} ${noun}${count === 1 ? "" : "s"}`;

export function BackfillSummaryScreen() {
	const insets = useSafeAreaInsets();
	const headerHeight = useHeaderHeight();
	const live = useQuery(api.achievements.firstSight.summary);
	const markSeen = useMutation(api.achievements.firstSight.markSeen);
	// What opened the screen, held still: a row backfilled while it's up waits for next time.
	const [shown, setShown] = useState<BackfillSummary | null>(null);
	const shownIds = useRef<Id<"user_achievements">[]>([]);

	if (shown === null && live) {
		setShown(live);
	}
	useEffect(() => {
		shownIds.current = shown?.ids ?? [];
	}, [shown]);

	// Nothing to show (seen on another device): step aside.
	const empty = shown === null && live === null;
	useEffect(() => {
		if (empty) {
			router.back();
		}
	}, [empty]);

	// Stamp when a navigation action takes it off the stack, not on any unmount:
	// Android rebuilding the tree on relaunch isn't a dismissal.
	const navigation =
		useNavigation<NativeStackNavigationProp<Record<string, undefined>>>();
	useEffect(() => {
		const unsubscribe = navigation.addListener("removed", () => {
			const ids = shownIds.current;
			if (ids.length > 0) {
				markSeen({ ids }).catch(() => undefined);
			}
		});
		// "removed" fires after this cleanup runs, so the unsubscribe waits a microtask.
		return () => queueMicrotask(unsubscribe);
	}, [navigation, markSeen]);

	const toolbar = (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Button
				accessibilityLabel="Close"
				icon={process.env.EXPO_OS === "ios" ? "xmark" : CloseIcon}
				onPress={() => router.back()}
			/>
		</Stack.Toolbar>
	);
	if (!shown) {
		return <View className="flex-1 bg-background">{toolbar}</View>;
	}

	return (
		<View
			className="flex-1 bg-background px-6"
			style={{ paddingBottom: insets.bottom + 16, paddingTop: headerHeight }}
		>
			{toolbar}
			<View className="flex-1 items-center justify-center">
				<AppText className="text-[12px] text-ember uppercase tracking-widest">
					{shown.firstSight ? "Badges are here" : "Since you were last here"}
				</AppText>
				<View className="my-8 flex-row flex-wrap justify-center gap-3">
					{shown.thumbnails.map((thumbnail) => (
						<Badge
							// Any earnedAt lights it; the fallback art stays unlit either way.
							achievement={{ ...thumbnail, earnedAt: 0 }}
							key={thumbnail.achievementId}
							size={THUMBNAIL_SIZE}
						/>
					))}
				</View>
				<AppText
					accessibilityRole="header"
					className="text-center font-serif text-[30px] text-foreground leading-9"
				>
					{shown.firstSight ? "You've already earned" : "You earned"}{" "}
					{plural(shown.badges, "badge")} and {plural(shown.sparks, "spark")}
				</AppText>
				{shown.firstSight ? (
					<AppText className="mt-3 text-center text-[16px] text-foreground/65 leading-6">
						Everything you did before badges arrived counts.
					</AppText>
				) : null}
			</View>
			<PressableFeedback
				accessibilityRole="button"
				className="h-13 w-full items-center justify-center rounded-2xl bg-accent"
				onPress={() => router.replace("/achievements")}
			>
				<AppText className="font-[Poppins-Medium] text-accent-foreground text-base">
					See them
				</AppText>
			</PressableFeedback>
		</View>
	);
}
