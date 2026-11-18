// Restore on intake's Xolace+ step: Restore where the subscription is sold (App Review 3.1.2).
import { PressableFeedback, Spinner, useThemeColor } from "heroui-native";
import { useState } from "react";
import { AppText } from "@/components/shared/app-text";
import { useRevenueCat } from "@/features/purchases/revenuecat-context";

type RestoreProps = {
	/** Told as a restore starts, before the store is called, and as it ends. */
	onRestoring?: (active: boolean) => void;
};

export function PaywallRestoreButton({ onRestoring }: RestoreProps) {
	const { restorePurchases } = useRevenueCat();
	const tintColor = useThemeColor("muted") as string;
	const [isRestoring, setIsRestoring] = useState(false);

	const handleRestore = () => {
		setIsRestoring(true);
		onRestoring?.(true);
		restorePurchases().finally(() => {
			setIsRestoring(false);
			onRestoring?.(false);
		});
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
