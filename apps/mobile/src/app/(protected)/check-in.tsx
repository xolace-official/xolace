import { CheckInScreen } from "@/features/coming-back/check-in/check-in-screen";
import { CheckInData } from "@/features/coming-back/check-in-data";
import { TelegramOfferCard } from "@/features/reach-me-on/components/telegram-offer-card";

/**
 * The check-in, over the greeting (or on its own, from You's Follow-ups), with Reach me on's
 * one-time Telegram offer composed into its next step.
 */
export default function CheckInRoute() {
	return (
		<CheckInData>
			<CheckInScreen
				offer={(answer, card) => (
					<TelegramOfferCard
						answer={answer}
						escalationDerived={card.escalationDerived}
						tier={card.tier}
					/>
				)}
			/>
		</CheckInData>
	);
}
