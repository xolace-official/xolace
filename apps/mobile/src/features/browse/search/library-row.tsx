import { api } from "@xolace/backend/api";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Link } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import {
	Bone,
	Line,
	SKELETON,
	SkeletonBreath,
} from "@/components/shared/skeleton";
import { META_W, TITLE_W, widthAt } from "@/components/shared/skeleton-shapes";
import {
	capitalise,
	facetLabel,
	readTimeLine,
	shareEntry,
} from "@/features/browse/search/library-row-copy";
import { useTokenColors } from "@/lib/use-token-color";

type EntryItem = FunctionReturnType<
	typeof api.library.entries.listEntries
>[number];

const THUMB = { height: 78, width: 104 };
const SAVE = { android: "bookmark_border", ios: "bookmark" } as const;
const SAVED = { android: "bookmark_added", ios: "bookmark.fill" } as const;
const SHARE = "square.and.arrow.up";

export function EntryRow({
	entry,
	onOpen,
}: {
	entry: EntryItem;
	onOpen?: () => void;
}) {
	const record = useMutation(api.library.reads.record);
	const posthog = usePostHog();
	const [accent, foreground] = useTokenColors(["accent", "foreground"]);
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
		<View className="mx-gutter flex-row items-center border-separator border-b">
			<Link
				asChild
				href={{
					params: { from: "search", slug: entry.slug },
					pathname: "/library/[slug]",
				}}
				onPress={onOpen}
			>
				<Link.Trigger>
					<PressScale
						accessibilityRole="link"
						card
						className="flex-1 flex-row items-center gap-3.5 py-3"
					>
						<View
							className="overflow-hidden rounded-[14px] border-continuous bg-surface-secondary"
							style={THUMB}
						>
							<CoverImage
								style={THUMB}
								thumbhash={entry.coverThumbhash}
								transition={200}
								uri={entry.coverThumbUrl ?? entry.coverUrl}
							/>
						</View>
						<View className="flex-1 gap-0.5">
							<AppText color="muted" variant="caption">
								{capitalise(entry.kind)} · {facetLabel(entry.primarySubject)}
							</AppText>
							<AppText numberOfLines={2} variant="subhead" weight="semibold">
								{entry.title}
							</AppText>
							<AppText color="muted" variant="footnote">
								{readTimeLine(entry.readMin, entry.views, entry.listenMin)}
							</AppText>
						</View>
					</PressScale>
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
			<PressScale
				accessibilityLabel="Save"
				accessibilityState={{ selected: saved }}
				className="size-11 items-center justify-center"
				disabled={pending !== null}
				hitSlop={8}
				onPress={toggle}
			>
				<Icon
					color={saved ? accent : foreground}
					name={saved ? SAVED : SAVE}
					size={17}
					weight="semibold"
				/>
			</PressScale>
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

export function RowsSkeleton({ count = 6 }: { count?: number }) {
	return (
		<SkeletonBreath label="Loading">
			{Array.from({ length: count }, (_, i) => (
				<View className="flex-row items-center gap-4 px-4 py-3" key={i}>
					<Bone h={THUMB.height} r={14} w={THUMB.width} />
					<View className="flex-1">
						<Line h={SKELETON.meta} lh={18} w="33%" />
						<Line lh={21} w={widthAt(TITLE_W, i)} />
						<Line h={SKELETON.meta} lh={18} w={widthAt(META_W, i)} />
					</View>
				</View>
			))}
		</SkeletonBreath>
	);
}
