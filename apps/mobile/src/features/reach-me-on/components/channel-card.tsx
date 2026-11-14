import { SymbolView } from "expo-symbols";
import { Button, useThemeColor } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	CHANNEL_NAME,
	type Channel,
	type OrderMark,
} from "@/features/reach-me-on/reach-view";
import type { CrossPlatformSymbol } from "@/lib/cross-platform-symbol";
import { playSoftPress } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const CHANNEL_ICON: Record<Channel, CrossPlatformSymbol> = {
	push: { android: "notifications", ios: "bell.fill", web: "notifications" },
	telegram: { android: "send", ios: "paperplane.fill", web: "send" },
};

/** A small accent tag on a card: First, Xolace+. */
export const CardTag = ({ label }: { label: string }) => (
	<View className="self-start rounded-full bg-accent/15 px-2.5 py-1">
		<AppText className="font-medium text-accent text-xs">{label}</AppText>
	</View>
);

type Props = {
	channel: Channel;
	statusLine?: string;
	/** From `orderMark`: the First badge, or the Try this first button. */
	mark: OrderMark;
	onTryFirst: () => void;
	badges?: ReactNode;
	children: ReactNode;
	disabled?: boolean;
};

/** One channel on "Reach me on…": icon, name, status, its order mark and body. */
export const ChannelCard = ({
	channel,
	statusLine,
	mark,
	onTryFirst,
	badges,
	children,
	disabled,
}: Props) => {
	const accent = useThemeColor("accent") as string;
	const first = mark === "first";
	return (
		<View
			className={cn(
				"gap-4 rounded-3xl p-5",
				first ? "bg-accent/10" : "bg-surface/60"
			)}
		>
			<View className="flex-row items-center gap-3">
				<View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent/15">
					<SymbolView
						name={CHANNEL_ICON[channel]}
						size={22}
						tintColor={accent}
					/>
				</View>
				<View className="flex-1 gap-1">
					<AppText className="font-semibold text-foreground text-lg">
						{CHANNEL_NAME[channel]}
					</AppText>
					{statusLine && (
						<AppText className="text-foreground/55 text-sm">
							{statusLine}
						</AppText>
					)}
				</View>
				{first && <CardTag label="First" />}
				{badges}
			</View>
			{children}
			{mark === "try_first" && (
				<Button
					className="self-start"
					isDisabled={disabled}
					onPress={() => {
						playSoftPress();
						onTryFirst();
					}}
					size="sm"
					variant="ghost"
				>
					<Button.Label>Try this first</Button.Label>
				</Button>
			)}
		</View>
	);
};
