import { SymbolView } from "expo-symbols";
import { Accordion, PressableFeedback, useThemeColor } from "heroui-native";
import { Linking, Platform, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { SettingsSection } from "@/components/shared/settings-section";

const IOS_STORE_URL =
	"https://apps.apple.com/app/apple-store/id6761601429?action=write-review";
const ANDROID_STORE_URL =
	"https://play.google.com/store/apps/details?id=com.xolaceincorg.xolace&showAllReviews=true";
const FEEDBACK_EMAIL = "feedback@xolaceinc.com";

type SymbolName = React.ComponentProps<typeof SymbolView>["name"];
type SymbolPlatformMap = Exclude<SymbolName, string>;
type MobileIconName = {
	ios: NonNullable<SymbolPlatformMap["ios"]>;
	android: NonNullable<SymbolPlatformMap["android"]>;
};

const RATE_ICON: MobileIconName = { android: "star", ios: "star.fill" };
const FEEDBACK_ICON: MobileIconName = {
	android: "email",
	ios: "envelope.fill",
};

const handleRateApp = async () => {
	try {
		const url = Platform.OS === "ios" ? IOS_STORE_URL : ANDROID_STORE_URL;
		await Linking.openURL(url);
	} catch (e) {
		console.error("Error opening store:", e);
	}
};

const handleSendFeedback = async () => {
	try {
		const subject = encodeURIComponent("Xolace Feedback");
		const body = encodeURIComponent(
			"Hi Xolace team,\n\nI have some feedback:\n\n[Your feedback here]\n\nThanks!"
		);
		await Linking.openURL(
			`mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
		);
	} catch (e) {
		console.error("Error opening mail:", e);
	}
};

type ActionRowProps = {
	label: string;
	icon: MobileIconName;
	onPress: () => void;
	isLast?: boolean;
};

const ActionRow = ({ label, icon, onPress }: ActionRowProps) => {
	const mutedColor = useThemeColor("muted") as string;
	return (
		<PressableFeedback
			className="flex-row items-center justify-between px-5 py-4"
			onPress={onPress}
		>
			<AppText className="text-base text-foreground">{label}</AppText>
			<SymbolView name={icon} size={16} tintColor={mutedColor} />
		</PressableFeedback>
	);
};

export const EnjoyingXolaceSection = () => (
	<SettingsSection title="Is Xolace helping?">
		<Accordion selectionMode="single">
			<Accordion.Item value="helping">
				<Accordion.Trigger className="px-5 py-4">
					<AppText className="flex-1 text-base text-foreground">
						🎁 Leave us a review
					</AppText>
					<Accordion.Indicator />
				</Accordion.Trigger>
				<Accordion.Content>
					<View className="pb-2">
						<AppText className="px-5 pb-4 font-light text-foreground/55 text-sm leading-5">
							If Xolace has helped you sit with something heavy, a review helps
							others find it when they need it most. You can also reach us
							directly, we read everything.
						</AppText>
						<ActionRow
							icon={RATE_ICON}
							label={Platform.select({
								android: "Rate on Play Store",
								default: "Rate on Store",
								ios: "Rate on App Store",
							})}
							onPress={handleRateApp}
						/>
						<ActionRow
							icon={FEEDBACK_ICON}
							isLast
							label="Send Feedback"
							onPress={handleSendFeedback}
						/>
					</View>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion>
	</SettingsSection>
);
