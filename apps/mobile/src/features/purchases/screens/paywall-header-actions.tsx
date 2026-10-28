import { SymbolView } from "expo-symbols";
import { PressableFeedback, Spinner, useThemeColor } from "heroui-native";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { AppText } from "@/components/shared/app-text";
import { useRevenueCat } from "@/features/purchases/revenuecat-context";
import {
	type PaywallSurface,
	usePaywall,
} from "@/features/purchases/use-paywall";

const CLOSE_ICON_NAME = {
	android: "close",
	ios: "xmark",
	web: "close",
} as const;

type CloseProps = {
	surface?: PaywallSurface;
	/** Paired with `paywall_opened`'s. `null` while loading, never 0 (a real cohort: intake). */
	sessionCount?: number | null;
	/** Overrides the route close; see PaywallScreen's `onExit`. */
	onClose?: () => void;
	/** Set once an exit is in flight, so a second tap cannot fire a second `paywall_dismissed`. */
	isDisabled?: boolean;
};

export function PaywallCloseButton({
	surface,
	sessionCount = null,
	onClose,
	isDisabled = false,
}: CloseProps) {
	const posthog = usePostHog();
	const defaultClose = usePaywall((s) => s.close);
	const closePaywall = onClose ?? defaultClose;
	const tintColor = useThemeColor("muted") as string;

	return (
		<PressableFeedback
			accessibilityLabel="Close"
			accessibilityRole="button"
			hitSlop={12}
			isDisabled={isDisabled}
			onPress={() => {
				posthog.capture("paywall_dismissed", {
					session_count: sessionCount,
					surface: surface ?? null,
				});
				closePaywall();
			}}
		>
			<SymbolView name={CLOSE_ICON_NAME} size={16} tintColor={tintColor} />
		</PressableFeedback>
	);
}

export function PaywallRestoreButton() {
	const { restorePurchases } = useRevenueCat();
	const tintColor = useThemeColor("muted") as string;
	const [isRestoring, setIsRestoring] = useState(false);

	const handleRestore = () => {
		setIsRestoring(true);
		restorePurchases().finally(() => setIsRestoring(false));
	};

	// Android's native header truncates the label ("Restor") without a fixed width; iOS
	// must stay intrinsic or its glass capsule inflates. The spinner keeps the width
	// constant so the header never re-measures.
	return (
		<PressableFeedback
			accessibilityLabel="Restore purchases"
			accessibilityRole="button"
			className="android:w-24 flex-row items-center android:justify-end justify-center ios:px-3 android:pr-1"
			hitSlop={12}
			isDisabled={isRestoring}
			onPress={handleRestore}
		>
			{isRestoring ? (
				<Spinner color={tintColor} size="sm" />
			) : (
				<AppText
					className="android:pr-1 text-[13px] text-muted"
					numberOfLines={1}
				>
					Restore
				</AppText>
			)}
		</PressableFeedback>
	);
}
