import { useRouter } from "expo-router";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CantLoad } from "@/components/shared/loading";
import { PressScale } from "@/components/shared/press-scale";
import { playSoftPress } from "@/lib/haptics";
import { LAUNCH_COPY } from "./copy";
import { CANT_REACH_HELP_PATH } from "./launch-model";
import { useLaunchHold } from "./launch-store";

/**
 * The launch gate once Xolace can't be reached (an offline cold start): the shared "Can't load
 * this right now." in place of the spinner, with a way to the bundled crisis resources. It still
 * holds the cover like the spinner did; the root gate moves on by itself when Xolace is back.
 */
export function CantReachHold() {
	useLaunchHold(true, "gate");
	const router = useRouter();
	return (
		<View className="flex-1 items-center justify-center bg-background">
			<CantLoad className="items-center">
				<PressScale
					accessibilityHint={LAUNCH_COPY.needHelpHint}
					accessibilityLabel={LAUNCH_COPY.needHelp}
					accessibilityRole="link"
					className="min-h-11 justify-center px-4"
					haptic={playSoftPress}
					onPress={() =>
						router.push({
							params: { from: "launch_gate" },
							pathname: CANT_REACH_HELP_PATH,
						})
					}
				>
					<AppText color="accent" variant="callout" weight="semibold">
						{LAUNCH_COPY.needHelp}
					</AppText>
				</PressScale>
			</CantLoad>
		</View>
	);
}
