import { CheckInScreen } from "@/features/coming-back/check-in/check-in-screen";
import { CheckInData } from "@/features/coming-back/check-in-data";
import { TelegramOfferCard } from "@/features/reach-me-on/components/telegram-offer-card";

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
