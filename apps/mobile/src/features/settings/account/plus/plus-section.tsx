import { Platform, View } from "react-native";
import {
	Footnote,
	SectionTitle,
	SettingsCard,
} from "@/components/settings-kit/parts";
import { TileRow } from "@/components/settings-kit/tile-row";
import { useAccountScreen } from "@/features/settings/account/account-data";
import {
	ACCOUNT_COPY as C,
	ACCOUNT_ICONS as I,
} from "@/features/settings/account/copy";

const STORE = Platform.OS === "android" ? "android" : "ios";

export function PlusSection() {
	const { state, actions } = useAccountScreen();
	if (state.plus === undefined) {
		return null;
	}
	return (
		<View className="mt-7">
			<SectionTitle>{C.plus}</SectionTitle>
			<SettingsCard>
				{state.plus ? (
					<TileRow
						a11y={C.outside(C.manage)}
						icon={I.manage}
						label={C.manage}
						last
						onPress={actions.manageSubscription}
						trail="out"
					/>
				) : (
					<TileRow
						icon={I.restore}
						label={C.restore}
						last
						onPress={actions.restore}
						trail="none"
						value={state.restoring ? C.restoring : undefined}
					/>
				)}
			</SettingsCard>
			<Footnote>
				{state.plus ? C.manageNote[STORE] : C.restoreNote[STORE]}
			</Footnote>
		</View>
	);
}
