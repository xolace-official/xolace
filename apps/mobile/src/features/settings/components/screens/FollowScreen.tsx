import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { EnjoyingXolaceSection } from "@/src/features/settings/components/enjoying-xolace-section";
import { FollowUsSection } from "@/src/features/settings/components/follow-us-section";
import { SettingsSection } from "@/src/features/settings/components/settings-section";
import { SettingsRow } from "@/src/features/settings/components/settings-row";
import { FeedbackDialog } from "@/src/features/settings/components/feedback-dialog";
import { FEEDBACK_ICON } from "@/src/features/settings/components/settings-icons";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

const styles = StyleSheet.create({
  contentContainer: { paddingTop: 20, paddingBottom: 48 },
});

export const FollowScreen = () => {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const mutedColor = useThemeColor("muted") as string;

  const settingIcon = (icon: React.ComponentProps<typeof SymbolView>["name"]) => (
    <SymbolView name={icon} size={17} tintColor={mutedColor} />
  );

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, easing: EASE }}
        >
          <EnjoyingXolaceSection />
        </EaseView>

        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 60, easing: EASE }}
        >
          <FollowUsSection />
        </EaseView>

        <EaseView
          initialAnimate={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 280, delay: 120, easing: EASE }}
        >
          <SettingsSection title="Support">
            <SettingsRow
              variant="chevron"
              icon={settingIcon(FEEDBACK_ICON)}
              label="Send feedback"
              onPress={() => setFeedbackOpen(true)}
              isLast
            />
          </SettingsSection>
        </EaseView>
      </ScrollView>

      <FeedbackDialog isOpen={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
};
