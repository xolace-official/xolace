import type { Ref } from "react";
import { ScrollView, type ScrollViewInstance } from "react-native";
import { FeedbackDialog } from "@/features/settings/follow/feedback/feedback-dialog";
import { SocialsSection } from "@/features/settings/follow/socials/socials-section";
import { SupportSections } from "@/features/settings/follow/support/support-sections";

export function FollowScreen({ ref }: { ref?: Ref<ScrollViewInstance> }) {
	return (
		<>
			<ScrollView
				className="bg-background"
				contentContainerClassName="pt-1 pb-10"
				contentInsetAdjustmentBehavior="automatic"
				ref={ref}
			>
				<SupportSections />
				<SocialsSection />
			</ScrollView>
			<FeedbackDialog />
		</>
	);
}
