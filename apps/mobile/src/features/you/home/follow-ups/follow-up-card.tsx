import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/you/copy";
import type {
	FollowUpCard,
	FollowUpLook,
} from "@/features/you/home/follow-ups-model";
import { useYouHome } from "@/features/you/home/you-data";
import { Surface } from "@/features/you/surface";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

/**
 * A card waiting on someone: the day of the moment and the card's own question. The answer
 * is given in the check-in (`/check-in`), which asks per tier and follows up per
 * answer; a card no check-in is coming for only closes.
 */
export function WaitingCard({
	card,
	look,
}: {
	card: FollowUpCard;
	look: Extract<FollowUpLook, { kind: "check-in" | "close" }>;
}) {
	const { actions } = useYouHome();
	const checkIn = look.kind === "check-in";
	return (
		<PressScale
			accessibilityHint={
				checkIn ? COPY.followUps.openHint : COPY.followUps.closeHint
			}
			accessibilityLabel={
				checkIn
					? COPY.followUps.openLabel(card.cardText)
					: COPY.followUps.closeLabel(card.cardText)
			}
			accessibilityRole="button"
			card
			haptic={playSoftPress}
			onPress={() =>
				checkIn ? actions.checkIn(card) : actions.closeFollowUp(card)
			}
		>
			<Surface className="p-4">
				<AppText
					className="text-[12.5px] leading-4"
					color="muted"
					variant="footnote"
				>
					{look.from}
				</AppText>
				{/* The card's own line is the question ("…how's it sitting now?"), written per
				    moment; the board's fixed ask over it read twice. */}
				<AppText
					className="mt-1 text-[17px] leading-[22px] tracking-[-0.17px]"
					numberOfLines={4}
					variant="body"
					weight="bold"
				>
					{card.cardText}
				</AppText>
				{checkIn ? null : (
					<AppText
						className="mt-2 text-[12.5px] leading-4"
						color="subtle"
						variant="footnote"
					>
						{COPY.followUps.superseded}
					</AppText>
				)}
				<View className="mt-3 h-8.5 justify-center self-start rounded-[17px] bg-surface-secondary px-3.25">
					<AppText
						className="text-[13.5px]"
						variant="footnote"
						weight="semibold"
					>
						{checkIn ? COPY.followUps.checkIn : COPY.followUps.close}
					</AppText>
				</View>
			</Surface>
		</PressScale>
	);
}

/** Coming up, or Earlier: the card's line, when, and (Earlier) the answer in accent. */
export function FollowUpRow({
	card,
	look,
}: {
	card: FollowUpCard;
	look: Extract<FollowUpLook, { kind: "coming" | "past" }>;
}) {
	const muted = useTokenColor("muted");
	const past = look.kind === "past";
	return (
		<Surface className="flex-row items-center gap-3 px-4 py-3.25" radius={20}>
			<View className="size-8.5 items-center justify-center rounded-[11px] border-continuous bg-surface-secondary">
				<Icon
					color={muted}
					name={
						past
							? { android: "check", ios: "checkmark" }
							: { android: "schedule", ios: "clock" }
					}
					size={15}
					weight="semibold"
				/>
			</View>
			<View accessible className="flex-1 gap-0.5">
				<AppText
					className="text-[14.5px] leading-[19px]"
					numberOfLines={2}
					variant="callout"
					weight="semibold"
				>
					{card.cardText}
				</AppText>
				<AppText
					className="text-[12.5px] leading-4"
					color="muted"
					variant="footnote"
					weight="medium"
				>
					{past ? look.when : COPY.followUps.comingUpWhen}
				</AppText>
			</View>
			{past ? (
				<AppText
					className="text-[12px]"
					color={look.answered ? "accent" : "subtle"}
					variant="caption"
					weight="semibold"
				>
					{look.answer}
				</AppText>
			) : null}
		</Surface>
	);
}
