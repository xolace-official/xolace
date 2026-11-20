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
	"flex-row items-center gap-3 border-separator border-b bg-background px-1 py-3";
const VERIFIED = { android: "verified", ios: "checkmark.seal.fill" } as const;

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
		</PressScale>
	);
}
