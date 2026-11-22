import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { TextColor } from "@/components/shared/app-text-face";
import { cn } from "@/lib/cn";
import type { ChipTone } from "../list/chats-model";

const TONE: Record<ChipTone | "accent", { bg: string; fg: TextColor }> = {
	accent: { bg: "bg-accent-wash", fg: "accentInk" },
	neutral: { bg: "bg-surface-secondary", fg: "muted" },
	talking: { bg: "bg-success-wash", fg: "successInk" },
	waiting: { bg: "bg-ember-wash", fg: "emberInk" },
};

export function StatusChip({
	label,
	tone,
}: {
	label: string;
	tone: ChipTone | "accent";
}) {
	const { bg, fg } = TONE[tone];
	return (
		<View
			className={cn(
				"min-h-5.5 shrink-0 justify-center rounded-[11px] px-2",
				bg
			)}
		>
			<AppText
				className="text-[11.5px]"
				color={fg}
				numberOfLines={1}
				variant="caption"
				weight="semibold"
			>
				{label}
			</AppText>
		</View>
	);
}

export function Tag({ label }: { label: string }) {
	return (
		<View className="min-h-7 justify-center rounded-[14px] bg-surface-secondary px-2.75">
			<AppText className="text-[12.5px]" variant="caption" weight="semibold">
				{label}
			</AppText>
		</View>
	);
}

export function UnreadPill({ label }: { label: string }) {
	return (
		<View
			accessibilityElementsHidden
			className="min-h-5.5 min-w-8.5 items-center justify-center rounded-[11px] bg-accent px-1.5"
			importantForAccessibility="no-hide-descendants"
		>
			<AppText color="accentForeground" variant="caption" weight="bold">
				{label}
			</AppText>
		</View>
	);
}
