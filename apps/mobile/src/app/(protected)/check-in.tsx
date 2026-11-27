import { CheckInScreen } from "@/features/coming-back/check-in/check-in-screen";
import { CheckInData } from "@/features/coming-back/check-in-data";
import { TelegramOfferCard } from "@/features/reach-me-on/components/telegram-offer-card";
import { TelegramOfferData } from "@/features/reach-me-on/telegram-offer-data";

export default function CheckInRoute() {
	return (
		<CheckInData>
			<CheckInScreen
				offer={(answer, card) => (
					<TelegramOfferData
						answer={answer}
						escalationDerived={card.escalationDerived}
						tier={card.tier}
					>
						<TelegramOfferCard />
					</TelegramOfferData>
				)}
			/>
		</CheckInData>
	);
}
