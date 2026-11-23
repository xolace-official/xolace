import { ActivityIndicator } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GlassButton } from "@/components/shared/glass-button";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";

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
	busy?: boolean;
}) {
	const off = disabled || busy;
	return (
		<GlassButton
			accessibilityLabel={label}
			accessibilityState={{ busy, disabled: off }}
			className={cn(
				"h-12.5 items-center justify-center rounded-[14px] border-continuous",
				off && !busy ? "opacity-40" : "opacity-100"
			)}
			disabled={off}
			fill={primary ? "accent" : "secondary"}
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
		</GlassButton>
	);
}
