import { View } from "react-native";
import { PlusOfferCard } from "@/features/purchases/components/plus-offer-card";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusOffer } from "@/features/purchases/use-plus-offer";

/** Moment 3 (#221 §4): the week-pattern insight, offered where it lands. No
 * server-found recurrence means no offer, never a fabricated one. */
export function PlusInsightOffer() {
	const openPaywall = usePaywall((s) => s.open);
	const offer = usePlusOffer("profile_insight");

	if (!offer) {
		return null;
	}

	return (
		<View className="mx-5 mt-6">
			<PlusOfferCard
				moment={offer.moment}
				observation={offer.observation}
				onOpen={() => openPaywall("profile_insight")}
				sessionId={offer.sessionId}
				variant={offer.variant}
			/>
		</View>
	);
}
