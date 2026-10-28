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
	/**
	 * Paired with `paywall_opened`'s, so a dismissal can be attributed to where
	 * in the life of the account it happened. `null` while the summary is still
	 * loading — never silently 0, which is a real cohort (intake).
	 */
	sessionCount?: number | null;
	/** Overrides the route close — see PaywallScreen's `onExit`. */
	onClose?: () => void;
	/**
	 * Set once an exit is already in flight. Blocks the press *here* rather than
	 * in the handler, so a second tap can't fire a second `paywall_dismissed`.
	 */
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

	// The width slack is Android-only. Android's native header sizes this view to
	// the label's measured width with no slack, which truncates the trailing glyph
	// ("Restor"), so there it gets a fixed width plus trailing padding to keep the
	// text box wider than the glyphs. iOS must stay intrinsically sized — its
	// toolbar renders a glass capsule around the child, and a fixed width there
	// inflates the capsule and strands the label against its edge. Swapping to a
	// spinner rather than a longer label keeps the width constant across states on
	// both platforms, so the header never re-measures.
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
