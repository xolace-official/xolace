import { api } from "@xolace/backend/convex/_generated/api";
import type { Doc } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { PressableFeedback, Surface } from "heroui-native";
import { View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { AppText } from "@/components/shared/app-text";

const EASE: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];

// The user's response, as a readable label for resolved rows.
const RESPONSE_LABEL: Record<string, string> = {
	dismissed: "Closed",
	heavier: "Got heavier",
	lighter: "Feeling lighter",
	processed: "I worked through it",
	still_here: "Still sitting with it",
	vent: "Let it out",
};

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
	});
}

type RowProps = {
	card: Doc<"follow_up_cards">;
	onDismiss: (cardId: Doc<"follow_up_cards">["_id"]) => void;
};

function FollowUpRow({ card, onDismiss }: RowProps) {
	// Status chip + accessibility framing, per follow-up state.
	let chip: string;
	let chipClass: string;
	let muted = false;
	let tappable = false;

	switch (card.status) {
		case "resolved":
			chip = RESPONSE_LABEL[card.userResponse ?? "dismissed"] ?? "Answered";
			chipClass = "text-accent";
			break;
		case "expired":
			chip = formatDate(card.createdAt);
			chipClass = "text-foreground/40";
			muted = true;
			break;
		case "superseded":
			chip = "unresolved · no check-in coming";
			chipClass = "text-foreground/45";
			tappable = true;
			break;
		default: // pending | ready | shown
			chip = "check-in coming";
			chipClass = "text-foreground/45";
			muted = true;
	}

	const body = (
		<Surface className={`rounded-2xl px-4 py-3.5 ${muted ? "opacity-80" : ""}`}>
			<AppText
				className="text-[13px] text-foreground/75 leading-5"
				numberOfLines={2}
			>
				{card.cardText}
			</AppText>
			<View className="mt-2 flex-row items-center justify-between">
				<AppText className={`text-xs ${chipClass}`}>{chip}</AppText>
				{tappable && (
					<AppText className="text-foreground/35 text-xs">tap to close</AppText>
				)}
			</View>
		</Surface>
	);

	if (!tappable) {
		return body;
	}

	return (
		<PressableFeedback
			accessibilityLabel={`Dismiss unresolved follow-up: ${card.cardText}`}
			accessibilityRole="button"
			onPress={() => onDismiss(card._id)}
		>
			{body}
		</PressableFeedback>
	);
}

/**
 * Profile Follow-Ups section. Built from the profile card vocabulary
 * (rounded-2xl bg-surface rows). Only renders when the user has follow-up
 * history. Superseded rows stay visible/tappable until an explicit dismiss.
 */
export function FollowUpsSection({
	staggerDelay = 420,
}: {
	staggerDelay?: number;
}) {
	const cards = useQuery(api.followUps.listForProfile, {});
	const resolveCard = useMutation(api.followUps.resolveCard);

	if (!cards || cards.length === 0) {
		return null;
	}

	const handleDismiss = (cardId: Doc<"follow_up_cards">["_id"]) => {
		void resolveCard({ cardId, response: "dismissed" });
	};

	return (
		<EaseView
			animate={{ opacity: 1 }}
			initialAnimate={{ opacity: 0 }}
			transition={{
				delay: staggerDelay,
				duration: 280,
				easing: EASE,
				type: "timing",
			}}
		>
			<View className="mt-8 px-5">
				<AppText className="mb-3 text-foreground text-lg">Follow-Ups</AppText>
				<View className="gap-2.5">
					{cards.map((card) => (
						<FollowUpRow card={card} key={card._id} onDismiss={handleDismiss} />
					))}
				</View>
			</View>
		</EaseView>
	);
}
