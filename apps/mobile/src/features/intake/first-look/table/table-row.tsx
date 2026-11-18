// One row of the table: its title, the Free and Plus marks, and (for a Plus row) its preview,
// mounted on its first open. The Plus check lands on the arrival clock; the title brightens
// with it.
import { Pressable, View } from "react-native";
import Animated, {
	interpolateColor,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AnimatedAppText } from "@/components/shared/app-text";
import { useTokenColor } from "@/lib/use-token-color";
import type { FIRST_LOOK, RowId, VoiceId } from "../copy";
import { litAt } from "../first-look-model";
import {
	CHECK_EASE,
	CHECK_FADE_MS,
	CHECK_MS,
	TITLE_MS,
	unit,
} from "../first-look-motion";
import { RowBody } from "./row-body";
import { BODY_RIGHT, Check, FREE_COL, PLUS_COL } from "./table-marks";
import { useRowOpen } from "./use-row-open";

const TITLE_MAX_SCALE = 1.3;
const CHECK_FROM = 0.4;

export type RowProps = {
	clock: SharedValue<number>;
	/** Opened by the person, so VoiceOver moves into it. */
	focus: boolean;
	index: number;
	mounted: boolean;
	/** The open preview's laid-out height, for scrolling to it. */
	onHeight: (id: RowId, height: number) => void;
	onToggle: (id: RowId) => void;
	onVoice: (voice: VoiceId) => void;
	open: boolean;
	reduced: boolean;
	row: (typeof FIRST_LOOK.rows)[number];
	voice: VoiceId;
};

export function TableRow(props: RowProps) {
	const { clock, index, mounted, onHeight, onToggle, open, reduced, row } =
		props;
	const subtle = useTokenColor("subtle");
	const foreground = useTokenColor("foreground");
	const muted = useTokenColor("muted");
	const onEmber = useTokenColor("offer-ink");
	const at = litAt(index);

	const check = useAnimatedStyle(() => {
		const c = clock.get();
		return {
			opacity: unit((c - at) / CHECK_FADE_MS),
			transform: [
				{
					scale:
						CHECK_FROM +
						(1 - CHECK_FROM) * CHECK_EASE(unit((c - at) / CHECK_MS)),
				},
			],
		};
	});
	const title = useAnimatedStyle(() => ({
		color: row.free
			? foreground
			: interpolateColor(
					unit((clock.get() - at) / TITLE_MS),
					[0, 1],
					[subtle, foreground]
				),
	}));

	const { body, bodyRef, chevron, measured } = useRowOpen({
		focus: props.focus,
		free: row.free,
		height: row.height,
		open,
		reduced,
	});

	const head = (
		<>
			<View className="flex-1 flex-row items-center gap-1.5 pr-1">
				<AnimatedAppText
					className="shrink"
					maxFontSizeMultiplier={TITLE_MAX_SCALE}
					numberOfLines={2}
					style={title}
					variant="callout"
					weight="semibold"
				>
					{row.title}
				</AnimatedAppText>
				{row.free ? null : (
					<Animated.View
						className="ml-0.5 size-[7px] border-subtle border-r-[1.8px] border-b-[1.8px]"
						style={chevron}
					/>
				)}
			</View>
			<View className="items-center" style={{ width: FREE_COL }}>
				{row.free ? (
					<Check bg="bg-surface-secondary" color={muted} />
				) : (
					<View className="h-0.5 w-3 rounded-[1px] bg-subtle opacity-55" />
				)}
			</View>
			<View className="items-center" style={{ width: PLUS_COL }}>
				<Animated.View style={check}>
					<Check bg="bg-ember" color={onEmber} />
				</Animated.View>
			</View>
		</>
	);

	const a11y = `${row.title}. Free: ${row.free ? "yes" : "no"}. Plus: yes.`;
	return (
		<View>
			{index > 0 ? (
				<View
					className="absolute top-0 left-0 h-px bg-separator"
					style={{ right: BODY_RIGHT }}
				/>
			) : null}
			{row.free ? (
				<View
					accessibilityLabel={a11y}
					accessible
					className="min-h-10.5 flex-row items-center"
				>
					{head}
				</View>
			) : (
				<Pressable
					accessibilityLabel={a11y}
					accessibilityRole="button"
					accessibilityState={{ expanded: open }}
					className="min-h-10.5 flex-row items-center"
					onPress={() => onToggle(row.id)}
				>
					{head}
				</Pressable>
			)}
			{row.free ? null : (
				<Animated.View
					// A closed row's preview is out of the accessibility tree, not just clipped.
					accessibilityElementsHidden={!open}
					className="overflow-hidden"
					importantForAccessibility={open ? "auto" : "no-hide-descendants"}
					style={[{ marginRight: BODY_RIGHT }, body]}
				>
					{mounted ? (
						<RowBody
							{...props}
							onHeight={(height) => {
								measured(height);
								onHeight(row.id, height);
							}}
							ref={bodyRef}
						/>
					) : null}
				</Animated.View>
			)}
		</View>
	);
}
