import { useState } from "react";
import { View } from "react-native";
import { FadeIn, LinearTransition } from "react-native-reanimated";
import { Button, Spinner, useThemeColor } from "heroui-native";
import { AppText } from "@/src/components/shared/app-text";
import {
  LegalBottomSheet,
} from "@/src/features/auth/components/legal-bottom-sheet";
import {
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  type LegalDocument,
} from "@/src/features/auth/components/legal-content";

const SPINNER_ENTERING = FadeIn.delay(50);

type Props = {
  label: string;
  onPress: () => void;
  isBusy: boolean;
  isDisabled: boolean;
};

/**
 * Sticky bottom CTA block — primary button, renewal legal line, and
 * Terms/Privacy links that reuse the existing LegalBottomSheet (same
 * pattern as the auth screen's LegalLinks) instead of duplicating copy.
 * While busy, the button shrinks to an icon-only spinner via the same
 * layout={LinearTransition.springify()} + isIconOnly pattern as AuthScreen.
 */
export function PaywallCta({ label, onPress, isBusy, isDisabled }: Props) {
  const [activeDocument, setActiveDocument] = useState<LegalDocument | null>(null);
  const accentForeground = useThemeColor("accent-foreground") as string;

  return (
    <View className="gap-4">
      <Button
        onPress={onPress}
        isDisabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        variant="primary"
        size="lg"
        isIconOnly={isBusy}
        layout={LinearTransition.springify()}
        className={`rounded-2xl${isBusy ? " self-center" : " w-full"}`}
      >
        {isBusy ? (
          <Spinner entering={SPINNER_ENTERING} color={accentForeground} />
        ) : (
          <Button.Label className="text-base font-medium">{label}</Button.Label>
        )}
      </Button>

      <AppText className="text-[11px] dark:text-white text-center leading-4">
        Renews automatically. Cancel anytime in your store settings.
      </AppText>

      <View className="flex-row items-center justify-center gap-5">
        <AppText
          className="text-[12px] dark:text-white underline"
          onPress={() => setActiveDocument(TERMS_OF_SERVICE)}
        >
          Terms of Service
        </AppText>
        <AppText
          className="text-[12px] dark:text-white underline"
          onPress={() => setActiveDocument(PRIVACY_POLICY)}
        >
          Privacy Policy
        </AppText>
      </View>

      <LegalBottomSheet document={activeDocument} onClose={() => setActiveDocument(null)} />
    </View>
  );
}
