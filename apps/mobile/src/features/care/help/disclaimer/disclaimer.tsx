import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/care/help/copy";
import { useHelpScreen } from "@/features/care/help/help-data";

const LINK_HIT_SLOP = 8;

/** Production's small print: when the list was checked, what Xolace vouches for, and where to
 * report a wrong number. */
export function Disclaimer() {
	const { state, actions } = useHelpScreen();
	return (
		<View className="mt-5 gap-1 px-1">
			<AppText color="subtle" variant="caption">
				{COPY.lastUpdated(state.lastUpdated)}
			</AppText>
			<AppText color="subtle" variant="caption">
				{COPY.disclaimer}
			</AppText>
			<PressScale
				accessibilityLabel={COPY.reportErrorLabel}
				accessibilityRole="link"
				className="self-start"
				hitSlop={LINK_HIT_SLOP}
				onPress={actions.reportError}
			>
				<AppText color="muted" variant="caption" weight="medium">
					{COPY.reportError}
				</AppText>
			</PressScale>
		</View>
	);
}
