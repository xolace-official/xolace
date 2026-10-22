import { View } from "react-native";
import { PlusOfferCard } from "@/src/features/purchases/components/plus-offer-card";
import { usePaywall } from "@/src/features/purchases/use-paywall";
import { usePlusOffer } from "@/src/features/purchases/use-plus-offer";

/**
 * Moment 3 (#221 §4): the week-pattern insight, offered where it lands.
 *
 * Fires only when the server found a real recurrence in this week's tags — the
 * observation line is the moment's whole reason to exist, so no observation
 * means no offer, never a fabricated one. Sits with the insight it is talking
 * about rather than at the foot of the screen, where it would read as a second
 * standing door next to PlusRow.
 */
export function PlusInsightOffer() {
  const openPaywall = usePaywall((s) => s.open);
  const offer = usePlusOffer("profile_insight");

  if (!offer) return null;

  return (
    <View className="mx-5 mt-6">
      <PlusOfferCard
        moment={offer.moment}
        variant={offer.variant}
        observation={offer.observation}
        sessionId={offer.sessionId}
        onOpen={() => openPaywall("profile_insight")}
      />
    </View>
  );
}
