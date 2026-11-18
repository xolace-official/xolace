import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";

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
