import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
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
		<PressScale
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityState={{ busy, disabled }}
			className={cn(
				"items-center justify-center overflow-hidden bg-foreground",
				disabled && dimWhenDisabled && "opacity-40"
			)}
			disabled={disabled}
			haptic={haptic}
			onPress={onPress}
			style={{
				borderCurve: "continuous",
				borderRadius: HEIGHT / 2,
				height: HEIGHT,
			}}
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
		</PressScale>
	);
}
