import { View } from "react-native";
import { Footnote, SettingsCard } from "@/components/settings-kit/parts";
import { TileRow } from "@/components/settings-kit/tile-row";
import { AppText } from "@/components/shared/app-text";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { useAccountScreen } from "@/features/settings/account/account-data";
import { ACCOUNT_COPY as C } from "@/features/settings/account/copy";
import { playSoftPress } from "@/lib/haptics";

export function LogOutSection() {
	const { state, actions } = useAccountScreen();
	return (
		<View className="mt-7">
			<SettingsCard>
				<TileRow
					danger
					label={C.logOut}
					last
					onPress={actions.askLogOut}
					trail="none"
				/>
			</SettingsCard>
			<Footnote>
				{C.logOutNote}
				<AppText
					accessibilityRole="link"
					className="text-[13px]"
					color="accent"
					onPress={() => {
						playSoftPress();
						actions.openPrivacy();
					}}
					variant="body"
					weight="medium"
				>
					{C.logOutLink}
				</AppText>
				.
			</Footnote>
			<ConfirmationDialog
				confirmLabel={C.alert.ok}
				description={C.alert.body}
				isDestructive
				isOpen={state.logOutOpen}
				onConfirm={actions.logOut}
				onOpenChange={(open) => {
					if (!open) {
						actions.closeLogOut();
					}
				}}
				title={C.alert.title}
			/>
		</View>
	);
}
