import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";

/** Board `.cta`: a 56 pt pill. */
const HEIGHT = 56;

type Props = {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	/** Drawn over the fill, under the label (Done's drain). */
	children?: ReactNode;
};

/**
 * Sit's call to action (board `.cta`): a 56 pt ink pill with the label in the
 * page's colour, 600 17. Begin, Done, Keep going; You're not alone's actions
 * use it too. A real button with its label.
 */
export function SitCta({ label, onPress, disabled = false, children }: Props) {
	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityState={{ disabled }}
			className="items-center justify-center overflow-hidden bg-foreground"
			disabled={disabled}
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
				variant="body"
				weight="semibold"
			>
				{label}
			</AppText>
		</PressScale>
	);
}
