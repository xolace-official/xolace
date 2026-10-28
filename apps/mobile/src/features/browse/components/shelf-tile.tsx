import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import {
	type BrowseFrom,
	useOpenTrack,
} from "@/features/browse/use-open-track";
import { CoverImage } from "@/features/library/cover-image";

export type ShelfItem = FunctionReturnType<
	typeof api.browse.getNewShelf
>[number];

const TILE = 170;

/** One tile of the newest-4 shelf (§9.3, §9.5). Tap opens the player, or the paywall for a free
 * user (§9.4). */
export function ShelfTile({
	item,
	from,
	size = TILE,
}: {
	item: ShelfItem;
	from: BrowseFrom;
	size?: number;
}) {
	const { open, locked } = useOpenTrack(from);
	const lockTint = useCSSVariable("--color-foreground");

	return (
		<Pressable
			accessibilityLabel={`${item.title}${item.attribution ? `, ${item.attribution}` : ""}`}
			accessibilityRole="button"
			className="active:opacity-60"
			onPress={() => open(item)}
			style={{ width: size }}
		>
			<View
				className="overflow-hidden rounded-[10px] bg-surface-tertiary"
				style={{ height: size, width: size }}
			>
				<CoverImage
					style={{ height: size, width: size }}
					thumbhash={item.thumbhash}
					uri={item.thumbUrl}
				/>
				{locked && (
					<View className="absolute right-1.5 bottom-1.5 h-5 w-5 items-center justify-center rounded-full bg-background/85">
						<SymbolView
							accessibilityLabel="Xolace+"
							name={{ android: "lock", ios: "lock.fill", web: "lock" }}
							size={10}
							tintColor={String(lockTint)}
						/>
					</View>
				)}
			</View>
			<AppText className="mt-1.5 font-medium text-[13px]" numberOfLines={1}>
				{item.title}
			</AppText>
			{item.attribution && (
				<AppText className="text-muted text-xs" numberOfLines={1}>
					{item.attribution}
				</AppText>
			)}
		</Pressable>
	);
}
