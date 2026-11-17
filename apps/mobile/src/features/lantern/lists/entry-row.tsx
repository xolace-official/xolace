import { Link } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/lantern/copy";
import { type ReaderFrom, readerHref } from "@/features/lantern/lantern-links";
import {
	type CardItem,
	kickerLine,
	readMarkOf,
	readTimeLine,
	rowLabel,
} from "@/features/lantern/lantern-model";
import { LS } from "@/features/lantern/lantern-style";
import { DimPress } from "@/features/lantern/lists/dim-press";
import { ReadMark } from "@/features/lantern/lists/read-mark";
import type { EntryActions } from "@/features/lantern/use-entry-actions";
import { useTokenColors } from "@/lib/use-token-color";

const R = LS.row;
const THUMB = { borderRadius: R.thumbR, height: R.thumbH, width: R.thumbW };
const SAVE_PRESS = 0.88;
const SAVE = { android: "bookmark_border", ios: "bookmark" } as const;
const SAVED = { android: "bookmark", ios: "bookmark.fill" } as const;
const SHARE = "square.and.arrow.up";

type Props = {
	entry: CardItem;
	from: ReaderFrom;
	actions: EntryActions;
	/** A hub numbers its items: reads and listens share one count. */
	index?: number;
	hub?: string;
};

/**
 * Production's `EntryRow` (handoff §3.1): the photo, kicker, title, production's meta line (it may
 * wrap), and Save at the end. v2 moves the read mark onto the photo. The tapped Save holds until
 * the server answers: lists miss the reader's optimistic update (production's `useSaveToggle`).
 */
export function EntryRow({ entry, from, actions, index, hub }: Props) {
	const [accent, foreground] = useTokenColors(["accent", "foreground"]);
	const [pending, setPending] = useState<boolean | null>(null);
	const saved = pending ?? entry.saved;
	const toggleSave = () => {
		if (pending !== null) {
			return;
		}
		setPending(!saved);
		actions.setSaved(entry, !saved).finally(() => setPending(null));
	};
	return (
		<View className="flex-row items-center pr-1.5">
			<Link asChild href={readerHref(entry.slug, from, hub)}>
				{/* No zoom: the thumb is too small to grow from. */}
				<Link.Trigger>
					<DimPress
						accessibilityLabel={rowLabel(entry)}
						accessibilityRole="link"
						className="flex-1 flex-row items-center"
						style={{
							gap: R.gap,
							paddingLeft: LS.gutter,
							paddingVertical: R.padV,
						}}
					>
						{index === undefined ? null : (
							<AppText
								className="text-[13px] leading-[17px]"
								color="subtle"
								style={{ width: R.ix }}
								variant="footnote"
							>
								{index + 1}
							</AppText>
						)}
						<View
							className="overflow-hidden bg-surface-secondary"
							style={THUMB}
						>
							<CoverImage
								style={THUMB}
								thumbhash={entry.coverThumbhash}
								transition={200}
								uri={entry.coverThumbUrl ?? entry.coverUrl}
							/>
							<ReadMark mark={readMarkOf(entry)} />
						</View>
						<View className="flex-1 gap-[3px]">
							<AppText
								className="text-[12px] leading-[15px]"
								color="muted"
								variant="caption"
							>
								{kickerLine(entry)}
							</AppText>
							<AppText
								className="text-[16px] leading-[21px]"
								numberOfLines={2}
								variant="subhead"
								weight="semibold"
							>
								{entry.title}
							</AppText>
							<AppText
								className="text-[13px] leading-[17.5px]"
								color="muted"
								numberOfLines={2}
								variant="footnote"
							>
								{readTimeLine(entry.readMin, entry.views, entry.listenMin)}
							</AppText>
						</View>
					</DimPress>
				</Link.Trigger>
				<Link.Preview />
				<Link.Menu>
					<Link.MenuAction
						icon={saved ? SAVED.ios : SAVE.ios}
						onPress={toggleSave}
					>
						{saved ? COPY.row.unsave : COPY.row.save}
					</Link.MenuAction>
					<Link.MenuAction icon={SHARE} onPress={() => actions.share(entry)}>
						{COPY.row.share}
					</Link.MenuAction>
				</Link.Menu>
			</Link>
			<PressScale
				accessibilityLabel={COPY.row.save}
				accessibilityState={{ selected: saved }}
				className="items-center justify-center"
				onPress={toggleSave}
				scaleTo={SAVE_PRESS}
				style={{ height: R.save, width: R.save }}
			>
				<Icon
					color={saved ? accent : foreground}
					name={saved ? SAVED : SAVE}
					size={19}
				/>
			</PressScale>
		</View>
	);
}
