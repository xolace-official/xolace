import { SymbolView } from "expo-symbols";
import { PressableFeedback, Spinner, useThemeColor } from "heroui-native";
import { useState } from "react";
import { AppText } from "@/components/shared/app-text";
import { PAYWALL } from "./copy";

const CLOSE_ICON_NAME = {
	android: "close",
	ios: "xmark",
	web: "close",
} as const;

type CloseProps = {
	onClose: () => void;
	isDisabled?: boolean;
};

export function PaywallCloseButton({
	onClose,
	isDisabled = false,
}: CloseProps) {
	const tintColor = useThemeColor("muted") as string;

	return (
		<PressableFeedback
			accessibilityLabel={PAYWALL.close}
			accessibilityRole="button"
			hitSlop={12}
			isDisabled={isDisabled}
			onPress={onClose}
		>
			<SymbolView name={CLOSE_ICON_NAME} size={16} tintColor={tintColor} />
		</PressableFeedback>
	);
}

type RestoreProps = {
	onRestore: () => Promise<unknown>;
};

export function PaywallRestoreButton({ onRestore }: RestoreProps) {
	const tintColor = useThemeColor("muted") as string;
	const [isRestoring, setIsRestoring] = useState(false);

	const handleRestore = () => {
		setIsRestoring(true);
		onRestore().finally(() => setIsRestoring(false));
	};

	return (
		<PressableFeedback
			accessibilityLabel={PAYWALL.restoreLabel}
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
					{PAYWALL.restore}
				</AppText>
			)}
		</PressableFeedback>
	);
}
