import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CountryMenu } from "@/components/shared/country-menu";
import { COPY } from "@/features/care/help/copy";
import { useHelpScreen } from "@/features/care/help/help-data";
import { HELP_OPTIONS } from "@/features/care/help/help-model";

export function CountryLine() {
	const { state, actions } = useHelpScreen();
	return (
		<View className="flex-row flex-wrap items-center gap-1.5 px-1">
			<AppText variant="callout" weight="semibold">
				{COPY.showing}
			</AppText>
			<CountryMenu
				onChange={actions.choose}
				options={HELP_OPTIONS}
				value={state.choice}
			/>
		</View>
	);
}
