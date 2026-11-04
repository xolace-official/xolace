import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { PressableFeedback } from "heroui-native";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useRecordDeferredAnswer } from "@/features/intake/use-record-deferred-answer";
import { BrowseSuggestion } from "@/features/session-end/components/browse-suggestion";
import { KindlingCloseSlot } from "@/features/session-end/components/kindling-close-slot";
import {
	type BrowseFamily,
	type CopingStyle,
	copingSuggestion,
} from "@/features/session-end/coping-suggestion";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useAccountFlag } from "@/store/use-account-flag";

// The intake's coping choices, shortened for one tap. "Outside things (substances,
// meds)" is left out of this quick ask; "Rather not say" still declines.
const OPTIONS: { label: string; value: CopingStyle }[] = [
	{ label: "Something calming", value: "calming_creative" },
	{ label: "A distraction", value: "distract" },
	{ label: "Letting it out", value: "let_it_out" },
	{ label: "Someone to talk to", value: "lean_on_people" },
	{ label: "I don't really know", value: "dont_know_how" },
	{ label: "Rather not say", value: "prefer_not_to_say" },
];

type Props = {
	sessionId?: Id<"sessions">;
	onOpenKindling: (ready: boolean) => void;
	onOpenBrowse: (family: BrowseFamily) => void;
};

/**
 * Session end's suggestion slot (#712). For a v2 user who hasn't said how they cope, it
 * asks "What usually helps after?" once per account, and the answer picks the Kindling or
 * Browse suggestion under it. Everyone else gets today's Kindling slot.
 */
export const CopingCloseSlot = ({
	sessionId,
	onOpenKindling,
	onOpenBrowse,
}: Props) => {
	const missing = useQuery(api.intake.deferred.missing);
	const [seen, markSeen] = useAccountFlag("copingAskSeen");
	// Read once: marking the ask seen below must not take it away mid-screen.
	const [unseen] = useState(!seen);
	const [asking, setAsking] = useState(false);
	const [skipped, setSkipped] = useState(false);
	const [answer, setAnswer] = useState<CopingStyle | null>(null);
	const recordAnswer = useRecordDeferredAnswer();

	// Latched: answering drops copingStyle from `missing`, and the card must stay.
	if (!asking && unseen && missing?.includes("copingStyle")) {
		setAsking(true);
	}

	useEffect(() => {
		if (asking) {
			markSeen();
		}
	}, [asking, markSeen]);

	const kindlingSlot = (fallback?: BrowseFamily) => (
		<KindlingCloseSlot
			fallback={
				fallback && (
					<BrowseSuggestion
						family={fallback}
						onPress={() => onOpenBrowse(fallback)}
					/>
				)
			}
			onOpenKindling={onOpenKindling}
			sessionId={sessionId}
		/>
	);

	if (!asking || skipped) {
		// Hold the slot while `missing` loads rather than swap a card in mid-fade.
		return unseen && missing === undefined ? null : kindlingSlot();
	}

	const suggestion = answer && copingSuggestion(answer);

	const choose = async (value: CopingStyle) => {
		playSoftPress();
		setAnswer(value);
		await recordAnswer({ copingStyle: [value], question: "copingStyle" });
	};

	return (
		<View className="w-full gap-3">
			<View className="w-full gap-3 rounded-2xl border border-border/60 bg-surface/40 px-5 py-4">
				<View className="flex-row items-center justify-between">
					<AppText className="font-medium text-base text-foreground">
						What usually helps after?
					</AppText>
					{answer === null && (
						<PressableFeedback
							accessibilityLabel="Skip this question"
							accessibilityRole="button"
							className="min-h-11 justify-center"
							hitSlop={8}
							onPress={() => setSkipped(true)}
						>
							<AppText className="text-foreground/55 text-sm">Skip</AppText>
						</PressableFeedback>
					)}
				</View>
				<View className="flex-row flex-wrap gap-2">
					{OPTIONS.map(({ label, value }) => {
						const picked = answer === value;
						return (
							<PressableFeedback
								accessibilityLabel={label}
								accessibilityRole="button"
								accessibilityState={{
									disabled: answer !== null,
									selected: picked,
								}}
								className={cn(
									"rounded-full border px-3.5 py-2",
									picked
										? "border-accent/50 bg-accent/15"
										: "border-border/70 bg-transparent"
								)}
								isDisabled={answer !== null}
								key={value}
								onPress={() => choose(value)}
							>
								<AppText
									className={cn(
										"text-sm",
										picked ? "text-accent" : "text-foreground/75"
									)}
								>
									{label}
								</AppText>
							</PressableFeedback>
						);
					})}
				</View>
			</View>

			{suggestion?.kind === "browse" && (
				<BrowseSuggestion
					family={suggestion.family}
					onPress={() => onOpenBrowse(suggestion.family)}
				/>
			)}
			{/* A session that doesn't qualify for Kindling still gets something under it. */}
			{suggestion?.kind === "kindling" && kindlingSlot("support")}
		</View>
	);
};
