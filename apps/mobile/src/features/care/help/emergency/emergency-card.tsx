import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/care/help/copy";
import { useHelpScreen } from "@/features/care/help/help-data";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const PHONE: IconName = { android: "call", ios: "phone.fill" };
const PHONE_GLYPH = 14;

/**
 * The emergency number: the largest thing on the screen, one tap from the dialer. On the theme's
 * danger fill with its own ink, so it reads in light and dark alike.
 */
export function EmergencyCard() {
	const { state, actions } = useHelpScreen();
	const danger = useTokenColor("danger");
	const number = state.view.emergency;

	if (!number) {
		return (
			<AppText className="px-1" color="muted" variant="callout">
				{COPY.elsewhereNote}
			</AppText>
		);
	}

	return (
		<PressScale
			accessibilityHint={COPY.emergencyHint}
			accessibilityLabel={COPY.emergencyLabel(number)}
			card
			className="flex-row items-center gap-3.5 rounded-[26px] border-continuous bg-danger p-4.5"
			haptic={playSoftPress}
			onPress={actions.callEmergency}
		>
			<View className="flex-1 gap-0.5">
				<AppText
					className="text-danger-foreground opacity-90"
					variant="overline"
				>
					{COPY.emergency}
				</AppText>
				<AppText className="text-danger-foreground" variant="greeting">
					{number}
				</AppText>
			</View>
			<View className="h-12 flex-row items-center gap-1.5 rounded-[24px] bg-danger-foreground px-5">
				<Icon color={danger} name={PHONE} size={PHONE_GLYPH} />
				<AppText className="text-danger" variant="body" weight="bold">
					{COPY.actions.call}
				</AppText>
			</View>
		</PressScale>
	);
}
