/**
 * The old Lantern row, section title and loading rows, which Browse search still draws. Moved
 * here from `features/library` when Lantern's redesign (S9) replaced that folder; they go with
 * Browse in Explore's screen PR (S7).
 */
import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Skeleton, useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import {
	capitalise,
	facetLabel,
	readTimeLine,
	shareEntry,
} from "@/features/browse/search/library-row-copy";

type EntryItem = FunctionReturnType<
	typeof api.library.entries.listEntries
>[number];

const THUMB = { height: 78, width: 104 };
const SAVE = {
	android: "bookmark_border",
	ios: "bookmark",
	web: "bookmark_border",
} as const;
const SAVED = {
	android: "bookmark_added",
	ios: "bookmark.fill",
	web: "bookmark_added",
} as const;
const SHARE = "square.and.arrow.up";

/** Thumbnail left, "Kind · Subject" kicker, bold title, meta; Save at the end. */
export function EntryRow({
	entry,
	onOpen,
}: {
	entry: EntryItem;
	/** Runs before the open: Browse search's tap analytics. */
	onOpen?: () => void;
}) {
	const record = useMutation(api.library.reads.record);
	const posthog = usePostHog();
	const [accent, foreground] = useThemeColor(["accent", "foreground"]);
	// Holds the tapped value until the server answers: lists miss the reader's optimistic update.
	const [pending, setPending] = useState<boolean | null>(null);
	const saved = pending ?? entry.saved;
	const toggle = () => {
		if (pending !== null) {
			return;
		}
		setPending(!saved);
		record({ entryId: entry._id, saved: !saved })
			.catch(() => undefined)
			.finally(() => setPending(null));
	};
	return (
		<View className="flex-row items-center pr-4">
			<Link
				asChild
				href={{
					params: { from: "search", slug: entry.slug },
					pathname: "/library/[slug]",
				}}
				onPress={onOpen}
			>
				<Link.Trigger>
					<Pressable
						accessibilityRole="link"
						className="flex-1 flex-row items-center gap-4 py-3 pl-4 active:opacity-70"
					>
						<View
							className="overflow-hidden rounded-[14px] bg-surface-secondary"
							style={THUMB}
						>
							<CoverImage
								style={THUMB}
								thumbhash={entry.coverThumbhash}
								transition={200}
								uri={entry.coverThumbUrl ?? entry.coverUrl}
							/>
						</View>
						<View className="flex-1 gap-1">
							<AppText className="text-[12px] text-muted">
								{capitalise(entry.kind)} · {facetLabel(entry.primarySubject)}
							</AppText>
							<AppText
								className="font-semibold text-[16px] leading-[21px]"
								numberOfLines={2}
							>
								{entry.title}
							</AppText>
							<AppText className="text-[13px] text-muted">
								{readTimeLine(entry.readMin, entry.views, entry.listenMin)}
							</AppText>
						</View>
					</Pressable>
				</Link.Trigger>
				<Link.Preview />
				<Link.Menu>
					<Link.MenuAction icon={saved ? SAVED.ios : SAVE.ios} onPress={toggle}>
						{saved ? "Remove from saved" : "Save"}
					</Link.MenuAction>
					<Link.MenuAction
						icon={SHARE}
						onPress={() => shareEntry(entry, posthog)}
					>
						Share
					</Link.MenuAction>
				</Link.Menu>
			</Link>
			<Pressable
				accessibilityLabel="Save"
				accessibilityRole="button"
				accessibilityState={{ selected: saved }}
				className="h-10 w-10 items-center justify-center rounded-full active:opacity-60"
				disabled={pending !== null}
				hitSlop={8}
				onPress={toggle}
			>
				<SymbolView
					name={saved ? SAVED : SAVE}
					size={17}
					tintColor={saved ? accent : foreground}
					weight="semibold"
				/>
			</Pressable>
		</View>
	);
}

export function SectionTitle({
	title,
	action,
	onAction,
}: {
	title: string;
	action?: string;
	onAction?: () => void;
}) {
	return (
		<View className="flex-row items-end justify-between px-4 pt-8 pb-3">
			<AppText accessibilityRole="header" className="font-bold text-[22px]">
				{title}
			</AppText>
			{action ? (
				<Pressable accessibilityRole="button" hitSlop={8} onPress={onAction}>
					<AppText className="font-medium text-[15px] text-accent">
						{action}
					</AppText>
				</Pressable>
			) : null}
		</View>
	);
}

/** EntryRow's shape: thumbnail, kicker, two-line title, meta. */
export function RowsSkeleton({ count = 6 }: { count?: number }) {
	return (
		<View accessibilityLabel="Loading">
			{Array.from({ length: count }, (_, i) => (
				<View className="flex-row items-center gap-4 px-4 py-3" key={i}>
					<Skeleton className="rounded-[14px]" style={THUMB} />
					<View className="flex-1 gap-2">
						<Skeleton className="h-3 w-1/3 rounded" />
						<Skeleton className="h-4 w-11/12 rounded" />
						<Skeleton className="h-3 w-1/2 rounded" />
					</View>
				</View>
			))}
		</View>
	);
}
