import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";

/**
 * "Reach me on…"'s pieces in Settings v2's language (P/src/features/reach/reach-parts.tsx): pill
 * buttons and the small accent tag. The strings stay inline while reach-me-on is an old folder;
 * S4 moves them into a copy file with the rest.
 */

export type PillTone = "primary" | "secondary" | "danger";

const PILL: Record<PillTone, { bg: string; text: string }> = {
	danger: { bg: "bg-danger-wash", text: "text-danger-ink" },
	primary: { bg: "bg-foreground", text: "text-background" },
	secondary: { bg: "bg-surface-secondary", text: "text-foreground" },
};

/** A 44 pt pill. One haptic, from PressScale; disabled, it dims to 45% and says so. */
export function Pill({
	label,
	tone = "secondary",
	disabled = false,
	onPress,
}: {
	label: string;
	tone?: PillTone;
	disabled?: boolean;
	onPress: () => void;
}) {
	const p = PILL[tone];
	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ disabled }}
			className={cn(
				"h-11 items-center justify-center rounded-full px-4.5",
				p.bg,
				disabled && "opacity-45"
			)}
			disabled={disabled}
			haptic={playSoftPress}
			onPress={onPress}
		>
			<AppText
				className={cn("text-[15px] leading-5", p.text)}
				variant="body"
				weight="semibold"
			>
				{label}
			</AppText>
		</PressScale>
	);
}

/** A small accent tag on a card: First, Xolace+. */
export function CardTag({ label }: { label: string }) {
	return (
		<View className="rounded-full bg-accent/14 px-2.5 py-1">
			<AppText
				className="text-[12px] text-accent leading-4"
				variant="body"
				weight="semibold"
			>
				{label}
			</AppText>
		</View>
	);
}
