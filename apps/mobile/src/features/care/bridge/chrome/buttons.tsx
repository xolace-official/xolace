import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";

/** The step's one action: a 56 pt ink pill. Disabled, it dims and doesn't press. */
export function PrimaryButton({
	label,
	onPress,
	disabled = false,
	accessibilityLabel,
}: {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	accessibilityLabel?: string;
}) {
	return (
		<PressScale
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityState={{ disabled }}
			className={cn(
				"h-14 items-center justify-center rounded-[28px] bg-foreground px-6",
				disabled && "opacity-40"
			)}
			disabled={disabled}
			haptic={playSoftPress}
			onPress={onPress}
		>
			<AppText
				color="background"
				numberOfLines={1}
				variant="body"
				weight="semibold"
			>
				{label}
			</AppText>
		</PressScale>
	);
}

/** The way out under it: text only, the selection tick. */
export function QuietButton({
	label,
	onPress,
}: {
	label: string;
	onPress: () => void;
}) {
	return (
		<PressScale
			className="h-11 items-center justify-center"
			haptic={Presets.System.selection}
			onPress={onPress}
		>
			<AppText color="muted" variant="callout" weight="medium">
				{label}
			</AppText>
		</PressScale>
	);
}
