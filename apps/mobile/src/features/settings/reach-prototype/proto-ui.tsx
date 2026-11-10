/** PROTOTYPE (#733) — throwaway. Tiny shared bits for the "Reach me on…" variants. */
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { ChannelId } from "@/features/settings/reach-prototype/fake-channels";
import { cn } from "@/lib/utils";

type BtnProps = {
	label: string;
	onPress: () => void;
	kind?: "primary" | "secondary" | "text" | "danger";
	className?: string;
};

export const Btn = ({
	label,
	onPress,
	kind = "primary",
	className,
}: BtnProps) => (
	<Pressable
		accessibilityRole="button"
		className={cn(
			"items-center rounded-full px-5 py-3",
			kind === "primary" && "bg-accent",
			kind === "secondary" && "bg-surface",
			kind === "text" && "px-2 py-2",
			kind === "danger" && "px-2 py-2",
			className
		)}
		onPress={onPress}
	>
		<AppText
			className={cn(
				"font-medium text-base",
				kind === "primary" && "text-accent-foreground",
				kind === "secondary" && "text-foreground",
				kind === "text" && "text-accent",
				kind === "danger" && "text-danger"
			)}
		>
			{label}
		</AppText>
	</Pressable>
);

export const ChannelGlyph = ({
	id,
	size = 18,
	boxed = false,
}: {
	id: ChannelId;
	size?: number;
	boxed?: boolean;
}) => {
	const accent = useThemeColor("accent") as string;
	const glyph = (
		<SymbolView
			name={id === "telegram" ? "paperplane.fill" : "bell.fill"}
			size={size}
			tintColor={accent}
		/>
	);
	if (!boxed) {
		return glyph;
	}
	return (
		<View className="h-11 w-11 items-center justify-center rounded-2xl bg-accent/15">
			{glyph}
		</View>
	);
};

export const CHANNEL_NAME: Record<ChannelId, string> = {
	push: "Notifications",
	telegram: "Telegram",
};

export const Notice = ({ text }: { text: string | null }) =>
	text ? (
		<View className="absolute top-2 right-4 left-4 z-10 rounded-2xl bg-foreground px-4 py-3">
			<AppText className="text-background text-sm">{text}</AppText>
		</View>
	) : null;

export const Pill = ({
	label,
	tone = "muted",
}: {
	label: string;
	tone?: "muted" | "success" | "warning" | "accent";
}) => (
	<View
		className={cn(
			"self-start rounded-full px-2.5 py-1",
			tone === "muted" && "bg-surface",
			tone === "success" && "bg-success/15",
			tone === "warning" && "bg-warning/15",
			tone === "accent" && "bg-accent/15"
		)}
	>
		<AppText
			className={cn(
				"font-medium text-xs",
				tone === "muted" && "text-foreground/60",
				tone === "success" && "text-success",
				tone === "warning" && "text-warning",
				tone === "accent" && "text-accent"
			)}
		>
			{label}
		</AppText>
	</View>
);
