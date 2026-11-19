import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { EXS, HOME_S } from "@/features/explore/explore-style";
import { type HomeFrom, useHome } from "@/features/explore/home/home-data";
import {
	type HomeItem,
	itemLabel,
	itemMeta,
	tileMeta,
} from "@/features/explore/home/home-model";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { ItemCover, MetaLine } from "./item-cover";
import { useHoldToHear } from "./use-hold-to-hear";

const ROW_SCALE = 0.98;

type RowProps = {
	it: HomeItem;
	from: HomeFrom;
	/** The section this row sits in, for the one preview heard at a time. */
	slot: string;
	/** For the hour: an audio cover can be held to hear. */
	hold?: boolean;
	padH?: number;
	padV?: number;
};

/**
 * A row (handoff §14): 52 pt art, title over meta. Presses to .98 whole; in a hold section the
 * cover settles to .97 instead, and only audio covers preview.
 */
export function ItemRow({
	it,
	from,
	slot,
	hold = false,
	padH = EXS.row.padH,
	padV = EXS.row.padV,
}: RowProps) {
	const { state, actions } = useHome();
	const reduced = useEffectiveReducedMotion();
	const h = useHoldToHear(
		`${slot}:${it.key}`,
		hold && it.kind === "track",
		() => actions.open(it, from)
	);
	const meta = itemMeta(it);
	const rowStyle = useAnimatedStyle(() => ({
		transform: [
			{
				scale: hold || reduced ? 1 : 1 - (1 - ROW_SCALE) * h.pressed.get(),
			},
		],
	}));
	return (
		<Animated.View style={rowStyle}>
			<Pressable
				{...h.press}
				{...h.a11y}
				accessibilityLabel={itemLabel(it, meta, state.locked)}
				accessibilityRole="button"
				className="flex-row items-center"
				style={{
					gap: EXS.row.gap,
					paddingHorizontal: padH,
					paddingVertical: padV,
				}}
			>
				<ItemCover
					hearing={h.hearing}
					it={it}
					pressed={hold ? h.pressed : undefined}
					radius={EXS.row.artR}
					size={EXS.row.art}
				/>
				<View className="min-w-0 flex-1 gap-0.5">
					<AppText
						className="text-[15.5px] leading-[19px]"
						numberOfLines={1}
						variant="callout"
						weight="semibold"
					>
						{it.kind === "track" ? it.track.title : it.entry.title}
					</AppText>
					<MetaLine hearing={h.hearing} meta={meta} size={13} />
				</View>
			</Pressable>
		</Animated.View>
	);
}

/** A tile (handoff §14): 148 pt art, the title on two lines, the short meta. Audio can be held. */
export function ItemTile({
	it,
	from,
	slot,
}: {
	it: HomeItem;
	from: HomeFrom;
	slot: string;
}) {
	const { state, actions } = useHome();
	const T = HOME_S.tile;
	const h = useHoldToHear(`${slot}:${it.key}`, it.kind === "track", () =>
		actions.open(it, from)
	);
	const meta = tileMeta(it);
	return (
		<Pressable
			{...h.press}
			{...h.a11y}
			accessibilityLabel={itemLabel(it, meta, state.locked)}
			accessibilityRole="button"
			style={{ gap: T.gap, width: T.art }}
		>
			<ItemCover
				hearing={h.hearing}
				it={it}
				pressed={h.pressed}
				radius={T.artR}
				size={T.art}
			/>
			<View className="gap-0.75">
				<AppText
					className="text-[14.5px] leading-[18px]"
					numberOfLines={2}
					variant="callout"
					weight="semibold"
				>
					{it.kind === "track" ? it.track.title : it.entry.title}
				</AppText>
				<MetaLine hearing={h.hearing} meta={meta} size={12.5} />
			</View>
		</Pressable>
	);
}
