import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { StatusChip, UnreadPill } from "../parts/chips";
import { XolaceMark, XolacerAvatar } from "../parts/xolacer-avatar";
import type { ChannelRowView, PairRowView } from "./chats-model";

export const ROW =
	"flex-row items-center gap-3 bg-background px-1 pt-3 pb-[13px]";
const VERIFIED = { android: "verified", ios: "checkmark.seal.fill" } as const;
/**
 * Where the name starts: the row's `px-1`, the 48 pt avatar, then `gap-3`. The row's extra
 * bottom point is the rule's height, so rows keep the height the old full-width border gave them.
 */
const RULE_INSET = 4 + 48 + 12;

/** The line under a row, from the name to the row's edge: it stops short of the avatar. */
function RowRule() {
	return (
		<View
			className="absolute right-0 bottom-0 h-px bg-separator"
			pointerEvents="none"
			style={{ left: RULE_INSET }}
		/>
	);
}

export function ChatRowBody({ row }: { row: PairRowView }) {
	return (
		<>
			<XolacerAvatar
				id={row.conversation.counterpartProfileId}
				muted={row.muted}
				name={row.name}
				online={row.present}
				photoUrl={row.photoUrl}
			/>
			<View className="min-w-0 flex-1 gap-0.75">
				<View className="flex-row items-center gap-1.75">
					<AppText
						className="shrink text-[16.5px]"
						color={row.muted ? "muted" : "foreground"}
						numberOfLines={1}
						variant="subhead"
						weight="semibold"
					>
						{row.name}
					</AppText>
					{row.chip ? <StatusChip {...row.chip} /> : null}
				</View>
				{row.line ? (
					<AppText color="muted" numberOfLines={1} variant="detail">
						{row.line}
					</AppText>
				) : null}
			</View>
			<View className="items-end gap-1.5">
				<AppText className="text-[12.5px]" color="muted" variant="caption">
					{row.when}
				</AppText>
				{row.unread ? <UnreadPill label={row.unread.label} /> : null}
				{row.requestDot ? (
					<View className="size-2 rounded-full bg-accent" />
				) : null}
			</View>
			<RowRule />
		</>
	);
}

export function ChannelRow({
	row,
	onPress,
}: {
	row: ChannelRowView;
	onPress: () => void;
}) {
	const accent = useTokenColor("accent");
	return (
		<PressScale accessibilityLabel={row.a11y} className={ROW} onPress={onPress}>
			<XolaceMark />
			<View className="min-w-0 flex-1 gap-0.75">
				<View className="flex-row items-center gap-1.25">
					<AppText
						className="text-[16.5px]"
						variant="subhead"
						weight="semibold"
					>
						{COPY.channel.name}
					</AppText>
					<Icon color={accent} name={VERIFIED} size={14} />
				</View>
				<AppText color="muted" numberOfLines={1} variant="detail">
					{row.line}
				</AppText>
			</View>
			<View className="items-end gap-1.5">
				{row.when ? (
					<AppText className="text-[12.5px]" color="muted" variant="caption">
						{row.when}
					</AppText>
				) : null}
				{row.unread ? <View className="size-2 rounded-full bg-accent" /> : null}
			</View>
			<RowRule />
		</PressScale>
	);
}
