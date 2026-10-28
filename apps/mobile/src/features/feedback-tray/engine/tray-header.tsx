import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { use } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { TrayContext } from "./tray-context";

type CrossPlatformSymbol = React.ComponentProps<typeof SymbolView>["name"];

const BACK_ICON: CrossPlatformSymbol = {
	android: "arrow_back",
	ios: "chevron.left",
};
const CLOSE_ICON: CrossPlatformSymbol = {
	android: "close",
	ios: "xmark",
};

/** Tray chrome: a back chevron when there is somewhere to go back to, and a
 * close button. Screens render their own headings, so no center title. */
export const TrayHeader = () => {
	const { state, actions } = use(TrayContext);
	const accentColor = useThemeColor("accent") as string;
	const mutedColor = useThemeColor("muted") as string;

	const hasBack = state.screenHistory.length > 1;

	return (
		<View className="flex-row items-center justify-between pb-2">
			<View className="h-10 w-10 items-start justify-center">
				{hasBack ? (
					<Animated.View entering={FadeIn} exiting={FadeOut}>
						<PressableFeedback
							accessibilityLabel="Go back"
							className="h-10 w-10 items-center justify-center"
							onPress={actions.goBack}
						>
							<SymbolView name={BACK_ICON} size={20} tintColor={accentColor} />
						</PressableFeedback>
					</Animated.View>
				) : null}
			</View>

			<PressableFeedback
				accessibilityLabel="Close"
				className="h-10 w-10 items-center justify-center"
				onPress={actions.dismiss}
			>
				<SymbolView name={CLOSE_ICON} size={18} tintColor={mutedColor} />
			</PressableFeedback>
		</View>
	);
};
