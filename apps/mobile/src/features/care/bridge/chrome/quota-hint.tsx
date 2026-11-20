import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { useBridgeScreen } from "@/features/care/bridge/bridge-data";

const LINK_HIT_SLOP = 8;

export function QuotaHint() {
	const { state, actions } = useBridgeScreen();
	const hint = state.quota;
	if (!hint) {
		return null;
	}
	return (
		<View className="flex-row flex-wrap items-center justify-center gap-x-1 pt-1">
			<AppText color="subtle" variant="footnote">
				{hint.text}
			</AppText>
			{hint.plus ? (
				<PressScale
					accessibilityLabel={hint.plus.label}
					hitSlop={LINK_HIT_SLOP}
					onPress={actions.getPlus}
				>
					<AppText color="accentInk" variant="footnote" weight="medium">
						{hint.plus.text}
					</AppText>
				</PressScale>
			) : null}
		</View>
	);
}
