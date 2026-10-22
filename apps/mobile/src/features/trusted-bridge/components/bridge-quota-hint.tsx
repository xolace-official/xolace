import { View } from "react-native";
import { PressableFeedback } from "heroui-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppText } from "@/src/components/shared/app-text";
import { usePaywall } from "@/src/features/purchases/use-paywall";

/**
 * The quiet line under "Write this together" telling the user how many drafts
 * they have left, and — for free users — what Xolace+ would give them.
 *
 * This is UI only. The cap is enforced in `ai.bridge.requestBridgeDraft`, which
 * refuses the model call regardless of what this component believes; a stale or
 * tampered quota buys nothing.
 *
 * Deliberately silent for a Plus user with drafts to spare: they've paid, and a
 * permanent "4 of 5 left" counter would turn a message to someone they love
 * into a metered resource.
 */
export function BridgeQuotaHint() {
  const quota = useQuery(api.ai.bridge.getQuota);
  const openPaywall = usePaywall((s) => s.open);

  if (!quota) return null;

  const { isPremium, draftsRemaining, plusDrafts } = quota;
  const isOut = draftsRemaining === 0;

  if (isPremium && !isOut) return null;

  if (isPremium) {
    return (
      <HintRow>
        <AppText className="text-xs font-light text-foreground/30">
          That&apos;s every draft today. They come back tomorrow.
        </AppText>
      </HintRow>
    );
  }

  return (
    <HintRow>
      <AppText className="text-xs font-light text-foreground/30">
        {isOut
          ? "That's today's draft. It comes back tomorrow."
          : `${draftsRemaining} draft today.`}{" "}
      </AppText>
      <PressableFeedback
        onPress={() => openPaywall("bridge_draft")}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Xolace Plus gives you ${plusDrafts} drafts a day`}
      >
        <AppText className="text-xs font-light text-accent/70">
          Xolace+ gives you {plusDrafts} a day
        </AppText>
      </PressableFeedback>
    </HintRow>
  );
}

function HintRow({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row flex-wrap items-center justify-center gap-x-1 pt-3">
      {children}
    </View>
  );
}
