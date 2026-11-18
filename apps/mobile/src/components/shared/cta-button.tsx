import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";

/** Board `.cta`: a 56 pt pill. */
const HEIGHT = 56;

type Props = {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	/** Disabled, it dims to 40%; off where the fill itself shows the wait (Done's drain). */
	dimWhenDisabled?: boolean;
	/** Plays on press: a named haptic from `@/lib/haptics`. */
	haptic?: () => void;
	/** Read instead of the label (a name in it). */
	accessibilityLabel?: string;
	/** Drawn over the fill, under the label (Done's drain). */
	children?: ReactNode;
};

/**
 * The redesign's call to action (board `.cta`): a 56 pt ink pill with the
 * label in the page's colour, 600 17. Sit with this's Begin, Done and Keep
 * going; You're not alone's Done. A real button with its label.
 */
export function CtaButton({
	label,
	onPress,
	disabled = false,
	dimWhenDisabled = true,
	haptic,
	accessibilityLabel,
	children,
}: Props) {
	return (
		<PressScale
			accessibilityLabel={accessibilityLabel ?? label}
			accessibilityState={{ disabled }}
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
