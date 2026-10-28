import { Button, Spinner, useThemeColor } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { FadeIn, LinearTransition } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { LegalBottomSheet } from "@/components/shared/legal-bottom-sheet";
import {
	type LegalDocument,
	PRIVACY_POLICY,
	TERMS_OF_SERVICE,
} from "@/components/shared/legal-content";

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
	const [activeDocument, setActiveDocument] = useState<LegalDocument | null>(
		null
	);
	const accentForeground = useThemeColor("accent-foreground") as string;

	return (
		<View className="gap-4">
			<Button
				accessibilityLabel={label}
				accessibilityRole="button"
				className={`rounded-2xl${isBusy ? "self-center" : "w-full"}`}
				isDisabled={isDisabled}
				isIconOnly={isBusy}
				layout={LinearTransition.springify()}
				onPress={onPress}
				size="lg"
				variant="primary"
			>
				{isBusy ? (
					<Spinner color={accentForeground} entering={SPINNER_ENTERING} />
				) : (
					<Button.Label className="font-medium text-base">{label}</Button.Label>
				)}
			</Button>

			<AppText className="text-center text-[11px] leading-4 dark:text-white">
				Renews automatically. Cancel anytime in your store settings.
			</AppText>

			<View className="flex-row items-center justify-center gap-5">
				<AppText
					className="text-[12px] underline dark:text-white"
					onPress={() => setActiveDocument(TERMS_OF_SERVICE)}
				>
					Terms of Service
				</AppText>
				<AppText
					className="text-[12px] underline dark:text-white"
					onPress={() => setActiveDocument(PRIVACY_POLICY)}
				>
					Privacy Policy
				</AppText>
			</View>

			<LegalBottomSheet
				document={activeDocument}
				onClose={() => setActiveDocument(null)}
			/>
		</View>
	);
}
