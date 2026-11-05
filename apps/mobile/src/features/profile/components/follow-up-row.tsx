import { api } from "@xolace/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { PressableFeedback, Surface } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { FollowUpParams } from "@/features/follow-up/follow-up-screen";
import type { ProfileFollowUp } from "@/features/profile/hooks/use-profile-follow-ups";
import { cn } from "@/lib/utils";

// The user's response, as a readable label for resolved rows.
const RESPONSE_LABEL: Record<string, string> = {
	dismissed: "Closed",
	heavier: "Got heavier",
	lighter: "Feeling lighter",
	processed: "I worked through it",
	still_here: "Still sitting with it",
	vent: "Let it out",
};

const formatDate = (ts: number) =>
	new Date(ts).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
	});

type Look = {
	chip: string;
	chipClass: string;
	muted?: boolean;
	action?: { hint: string; a11y: string };
};

function lookFor(card: ProfileFollowUp): Look {
	switch (card.status) {
		case "ready":
		case "shown":
			return {
				action: { a11y: "Open check-in", hint: "check in" },
				chip: "ready for you",
				chipClass: "text-ember",
			};
		case "superseded":
			return {
				action: { a11y: "Dismiss unresolved follow-up", hint: "tap to close" },
				chip: "unresolved · no check-in coming",
				chipClass: "text-foreground/45",
			};
		case "pending":
			return {
				chip: "check-in coming",
				chipClass: "text-foreground/45",
				muted: true,
			};
		case "resolved":
			return {
				chip: RESPONSE_LABEL[card.userResponse ?? "dismissed"] ?? "Answered",
				chipClass: "text-accent",
			};
		default: // expired
			return {
				chip: `${formatDate(card.createdAt)} · no answer`,
				chipClass: "text-foreground/40",
				muted: true,
			};
	}
}

/** One follow-up on the profile. Ready cards open the check-in; superseded
 * ones close on tap; the rest are a record. */
export function FollowUpRow({ card }: { card: ProfileFollowUp }) {
	const router = useRouter();
	const posthog = usePostHog();
	const markShown = useMutation(api.followUps.markShown);
	const resolveCard = useMutation(api.followUps.resolveCard);
	const look = lookFor(card);

	const onPress = () => {
		if (card.status === "superseded") {
			void resolveCard({ cardId: card._id, response: "dismissed" });
			return;
		}
		void markShown({ cardId: card._id });
		posthog.capture("follow_up_shown", {
			escalation_derived: card.escalationDerived,
			source: "profile",
			tier: card.tier,
		});
		const params: FollowUpParams = {
			cardId: card._id,
			cardText: card.cardText,
			escalation: card.escalationDerived ? "1" : undefined,
			tier: card.tier,
		};
		router.push({ params, pathname: "/follow-up" });
	};

	const body = (
		<Surface
			className={cn(
				"rounded-2xl px-4 py-3.5",
				look.muted && "opacity-80",
				card.status === "ready" || card.status === "shown"
					? "border border-ember/35"
					: undefined
			)}
		>
			<AppText
				className="text-[13px] text-foreground/75 leading-5"
				numberOfLines={2}
			>
				{card.cardText}
			</AppText>
			<View className="mt-2 flex-row items-center justify-between">
				<AppText className={cn("text-xs", look.chipClass)}>{look.chip}</AppText>
				{look.action && (
					<AppText className="text-foreground/35 text-xs">
						{look.action.hint}
					</AppText>
				)}
			</View>
		</Surface>
	);

	if (!look.action) {
		return body;
	}
	return (
		<PressableFeedback
			accessibilityLabel={`${look.action.a11y}: ${card.cardText}`}
			accessibilityRole="button"
			onPress={onPress}
		>
			{body}
		</PressableFeedback>
	);
}
