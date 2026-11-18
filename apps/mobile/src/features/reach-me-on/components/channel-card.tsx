import type { ReactNode } from "react";
import { View } from "react-native";
import { accentTile } from "@/components/settings-kit/settings-layout";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { useScheme } from "@/design/scheme";
import { CardTag, Pill } from "@/features/reach-me-on/components/pill";
import {
	CHANNEL_NAME,
	type Channel,
	type OrderMark,
} from "@/features/reach-me-on/reach-view";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const CHANNEL_ICON: Record<Channel, IconName> = {
	push: { android: "notifications", ios: "bell.fill" },
	telegram: { android: "send", ios: "paperplane.fill" },
};

type Props = {
	channel: Channel;
	statusLine?: string;
	/** From `orderMark`: the First tag and accent border, or a Try this first pill. */
	mark: OrderMark;
	onTryFirst: () => void;
	/** Telegram off Plus: the Xolace+ tag. */
	plusTag?: boolean;
	children: ReactNode;
	disabled?: boolean;
};

/**
 * One channel on "Reach me on…" (P/src/features/reach/reach-parts.tsx `ChannelCard`): a 22 pt
 * card with a 36 pt tile (Telegram's own blue on its tile only), name and status, the First or
 * Xolace+ tag, then its body. The First card carries an accent border.
 */
export const ChannelCard = ({
	channel,
	statusLine,
	mark,
	onTryFirst,
	plusTag = false,
	children,
	disabled = false,
}: Props) => {
	const dark = useScheme() === "dark";
	const accent = useTokenColor("accent");
	const onTelegram = useTokenColor("on-art");
	const first = mark === "first";
	const telegram = channel === "telegram";
	return (
		<View
			className={cn(
				"mx-4 gap-3.5 rounded-[22px] border-continuous bg-surface p-4",
				first && "border-[1.5px] border-accent/45"
			)}
		>
			<View className="flex-row items-center gap-3">
				<View
					className={cn(
						"size-9 items-center justify-center rounded-[11px] border-continuous",
						telegram ? "bg-telegram" : accentTile(dark)
					)}
				>
					<Icon
						color={telegram ? onTelegram : accent}
						name={CHANNEL_ICON[channel]}
						size={17}
					/>
				</View>
				<View className="flex-1 gap-px">
					<AppText
						className="text-[17px] leading-[22px]"
						variant="body"
						weight="semibold"
					>
						{CHANNEL_NAME[channel]}
					</AppText>
					{statusLine ? (
						<AppText
							className="text-[13.5px] text-foreground/55 leading-[18px]"
							variant="body"
						>
							{statusLine}
						</AppText>
					) : null}
				</View>
				{first ? <CardTag label="First" /> : null}
				{plusTag ? <CardTag label="Xolace+" /> : null}
			</View>
			{children}
			{mark === "try_first" ? (
				<View className="self-start">
					<Pill
						disabled={disabled}
						label="Try this first"
						onPress={onTryFirst}
					/>
				</View>
			) : null}
		</View>
	);
};
