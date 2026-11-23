import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GlassButton } from "@/components/shared/glass-button";
import { cn } from "@/lib/cn";

const HEIGHT = 56;

type Props = {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	busy?: boolean;
	dimWhenDisabled?: boolean;
	haptic?: () => void;
	accessibilityLabel?: string;
	children?: ReactNode;
};

/** The screen's one committing action: a full-width glass capsule. */
export function CtaButton({
	label,
	onPress,
	disabled = false,
	busy = false,
	dimWhenDisabled = true,
	haptic,
	accessibilityLabel,
	children,
}: Props) {
	return (
		<GlassButton
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityState={{ busy, disabled }}
			className={cn(
				"items-center justify-center overflow-hidden rounded-full border-continuous",
				disabled && dimWhenDisabled && "opacity-40"
			)}
			disabled={disabled}
			haptic={haptic}
			onPress={onPress}
			style={{ height: HEIGHT }}
		>
			{children ? <View className="absolute inset-0">{children}</View> : null}
			<AppText
				className="text-[17px]"
				color="background"
				numberOfLines={1}
				variant="body"
				weight="semibold"
			>
				{label}
			</AppText>
		</GlassButton>
	);
}
