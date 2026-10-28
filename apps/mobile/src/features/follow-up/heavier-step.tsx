import { api } from "@xolace/backend/convex/_generated/api";
import type { Doc, Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { type Href, useRouter } from "expo-router";
import { PressableFeedback } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useRef } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { type IconKey, OptionCard } from "@/features/follow-up/stack-cards";
import { LINK } from "@/features/follow-up/still-here-step";
import {
	HEAVIER_MESSAGE,
	HEAVIER_OPTIONS,
	HEAVIER_SKIP,
} from "@/features/reflect/follow-up-copy";

// Keyed on the schema union, so a copy key the server would reject fails typecheck.
type Choice = NonNullable<Doc<"follow_up_responses">["heavierChoice"]>;

// The content doorways are the still-here ones — their screens open the
// first-time intro themselves when the flag is unset, from any entry point.
const DOORWAY: Record<Choice, { icon: IconKey; tint: string; href: Href }> = {
	crisis_resources: {
		href: "/crisis-resources",
		icon: "lifebuoy",
		tint: "bg-warning/20",
	},
	library: LINK.library,
	music: LINK.music,
	support_audio: LINK.support,
};

/**
 * The `heavier` next step (#452): support first, then three places to turn.
 * A tap records the choice (#447 table); leaving without one is fine — the
 * chip answer already stands. Never routes to sit-with-this.
 */
export function HeavierStep({
	cardId,
	onClose,
}: {
	cardId: Id<"follow_up_cards">;
	onClose: () => void;
}) {
	const router = useRouter();
	const posthog = usePostHog();
	const record = useMutation(api.followUpResponses.record);
	const leaving = useRef(false);

	const pick = (choice: Choice) => {
		// A double tap would run back() twice and pop past reflect.
		if (leaving.current) {
			return;
		}
		void record({ cardId, heavierChoice: choice, shareRequested: false });
		posthog.capture("follow_up_heavier_choice", { choice });
		if (choice === "crisis_resources") {
			// Pushed over the check-in, like the acute resources link — back returns here.
			router.push(DOORWAY.crisis_resources.href);
			return;
		}
		leaving.current = true;
		router.back();
		router.replace(DOORWAY[choice].href, { withAnchor: true });
	};

	return (
		<>
			<View className="-mb-8 overflow-hidden rounded-t-[36px] bg-surface">
				<View className="bg-accent/20 px-5 pt-5 pb-12">
					<AppText className="text-base text-foreground/80 leading-6">
						{HEAVIER_MESSAGE}
					</AppText>
				</View>
			</View>
			{HEAVIER_OPTIONS.map(({ key, title, sub }) => (
				<OptionCard
					icon={DOORWAY[key].icon}
					key={key}
					onPress={() => pick(key)}
					sub={sub}
					tint={DOORWAY[key].tint}
					title={title}
				/>
			))}
			<View className="items-center bg-surface pt-4">
				<PressableFeedback
					accessibilityRole="button"
					className="min-h-11 items-center justify-center"
					hitSlop={12}
					onPress={onClose}
				>
					<AppText className="text-foreground/55 text-sm">
						{HEAVIER_SKIP}
					</AppText>
				</PressableFeedback>
			</View>
		</>
	);
}
