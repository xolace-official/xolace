import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { EnjoyingXolaceSection } from "@/features/settings/components/enjoying-xolace-section";
import { FeedbackDialog } from "@/features/settings/components/feedback-dialog";
import { FollowUsSection } from "@/features/settings/components/follow-us-section";
import { FEEDBACK_ICON } from "@/features/settings/components/settings-icons";
import { SettingsRow } from "@/features/settings/components/settings-row";
import { SettingsSection } from "@/features/settings/components/settings-section";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

const styles = StyleSheet.create({
	contentContainer: { paddingBottom: 48, paddingTop: 20 },
});

export const FollowScreen = () => {
	const [feedbackOpen, setFeedbackOpen] = useState(false);
	const mutedColor = useThemeColor("muted") as string;

	const settingIcon = (
		icon: React.ComponentProps<typeof SymbolView>["name"]
	) => <SymbolView name={icon} size={17} tintColor={mutedColor} />;

	return (
		<>
			<ScrollView
				className="flex-1 bg-background"
				contentContainerStyle={styles.contentContainer}
				contentInsetAdjustmentBehavior="automatic"
				showsVerticalScrollIndicator={false}
			>
				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{ duration: 280, easing: EASE, type: "timing" }}
				>
					<EnjoyingXolaceSection />
				</EaseView>

				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{
						delay: 60,
						duration: 280,
						easing: EASE,
						type: "timing",
					}}
				>
					<FollowUsSection />
				</EaseView>

				<EaseView
					animate={{ opacity: 1, translateY: 0 }}
					initialAnimate={{ opacity: 0, translateY: 16 }}
					transition={{
						delay: 120,
						duration: 280,
						easing: EASE,
						type: "timing",
					}}
				>
					<SettingsSection title="Support">
						<SettingsRow
							icon={settingIcon(FEEDBACK_ICON)}
							isLast
							label="Send feedback"
							onPress={() => setFeedbackOpen(true)}
							variant="chevron"
						/>
					</SettingsSection>
				</EaseView>
			</ScrollView>

			<FeedbackDialog isOpen={feedbackOpen} onOpenChange={setFeedbackOpen} />
		</>
	);
};
