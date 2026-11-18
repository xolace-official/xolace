import type { Ref } from "react";
import { ScrollView, type ScrollViewInstance } from "react-native";
import { FeedbackDialog } from "@/features/settings/follow/feedback/feedback-dialog";
import { SocialsSection } from "@/features/settings/follow/socials/socials-section";
import { SupportSections } from "@/features/settings/follow/support/support-sections";

/**
 * Follow & Support (board "Follow & Support v2", P/design/handoff/settings-sections.md): how to
 * reach us, a review (the 🎁 is the owner's), and where Xolace lives, in production's order and
 * links. Production's feedback dialog, kept. Nothing animates in.
 */
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
