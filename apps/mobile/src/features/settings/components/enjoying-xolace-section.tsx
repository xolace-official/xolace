import { Linking, Platform, View } from "react-native";
import { Accordion, PressableFeedback, useThemeColor } from "heroui-native";
import { SymbolView } from "expo-symbols";
import { AppText } from "@/src/components/shared/app-text";
import { SettingsSection } from "@/src/features/settings/components/settings-section";

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

const RATE_ICON: MobileIconName = { ios: "star.fill", android: "star" };
const FEEDBACK_ICON: MobileIconName = {
  ios: "envelope.fill",
  android: "email",
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
      "Hi Xolace team,\n\nI have some feedback:\n\n[Your feedback here]\n\nThanks!",
    );
    await Linking.openURL(
      `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`,
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
      onPress={onPress}
      className="flex-row items-center justify-between px-5 py-4"
    >
      <AppText className="text-base text-foreground">{label}</AppText>
      <SymbolView name={icon} size={16} tintColor={mutedColor} />
    </PressableFeedback>
  );
};

export const EnjoyingXolaceSection = () => {
  return (
    <SettingsSection title="Is Xolace helping?">
      <Accordion selectionMode="single">
        <Accordion.Item value="helping">
          <Accordion.Trigger className="px-5 py-4">
            <AppText className="text-base text-foreground flex-1">
              🎁 Leave us a review
            </AppText>
            <Accordion.Indicator />
          </Accordion.Trigger>
          <Accordion.Content>
            <View className="pb-2">
              <AppText className="text-sm font-light leading-5 text-foreground/55 px-5 pb-4">
                If Xolace has helped you sit with something heavy, a review
                helps others find it when they need it most. You can also reach
                us directly, we read everything.
              </AppText>
              <ActionRow
                label={Platform.select({ ios: "Rate on App Store", android: "Rate on Play Store", default: "Rate on Store" })}
                icon={RATE_ICON}
                onPress={handleRateApp}
              />
              <ActionRow
                label="Send Feedback"
                icon={FEEDBACK_ICON}
                onPress={handleSendFeedback}
                isLast
              />
            </View>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </SettingsSection>
  );
};
