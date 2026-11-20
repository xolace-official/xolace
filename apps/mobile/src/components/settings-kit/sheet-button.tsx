import { ActivityIndicator } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";

/**
 * The settings dialog's button (`SettingsDialog`: 14 pt corners, 16 / 21 semibold) at full width
 * and 50 pt, for a form sheet's actions: the main one on the accent, the other on the well.
 */
export function SheetButton({
	label,
	onPress,
	primary = false,
	disabled = false,
	busy = false,
}: {
	label: string;
	onPress: () => void;
	primary?: boolean;
	disabled?: boolean;
	/** A spinner in place of the label while the action runs. */
	busy?: boolean;
}) {
	const off = disabled || busy;
	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ busy, disabled: off }}
			className={cn(
				"h-12.5 items-center justify-center rounded-[14px] border-continuous",
				primary ? "bg-accent" : "bg-surface-secondary",
				off && !busy ? "opacity-40" : "opacity-100"
			)}
			disabled={off}
			haptic={playSoftPress}
			onPress={onPress}
		>
			{busy ? (
				<ActivityIndicator
					colorClassName={
						primary ? "accent-accent-foreground" : "accent-foreground"
					}
				/>
			) : (
				<AppText
					className="text-[16px] leading-[21px]"
					color={primary ? "accentForeground" : "foreground"}
					variant="body"
					weight="semibold"
				>
					{label}
				</AppText>
			)}
		</PressScale>
	);
}
