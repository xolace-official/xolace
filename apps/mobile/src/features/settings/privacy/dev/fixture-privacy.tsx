import { View } from "react-native";
import { DeleteSheetScreen } from "@/features/settings/privacy/delete/delete-sheet";
import {
	type DeleteSheet,
	DeleteSheetProvider,
} from "@/features/settings/privacy/delete/delete-sheet-data";
import {
	DELETE_ACTIONS,
	PRIVACY_ACTIONS,
} from "@/features/settings/privacy/dev/fixtures";
import {
	type Privacy,
	PrivacyProvider,
} from "@/features/settings/privacy/privacy-data";
import { PrivacyScreen } from "@/features/settings/privacy/privacy-screen";

export function FixturePrivacy({
	state,
	scrolledToEnd = false,
}: {
	state: Privacy["state"];
	scrolledToEnd?: boolean;
}) {
	return (
		<PrivacyProvider value={{ actions: PRIVACY_ACTIONS, state }}>
			<PrivacyScreen scrolledToEnd={scrolledToEnd} />
		</PrivacyProvider>
	);
}

export function FixtureDeleteSheet({ state }: { state: DeleteSheet["state"] }) {
	return (
		<DeleteSheetProvider value={{ actions: DELETE_ACTIONS, state }}>
			<View className="flex-1 justify-end bg-background">
				<View className="overflow-hidden rounded-t-[38px] border-continuous">
					<DeleteSheetScreen />
				</View>
			</View>
		</DeleteSheetProvider>
	);
}
