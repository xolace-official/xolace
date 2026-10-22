import { Button, Spinner, useThemeColor } from "heroui-native";
import { StyleSheet, View } from "react-native";
import { FadeIn, LinearTransition } from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";

const SPINNER_ENTERING = FadeIn.delay(50);

type Props = {
	isRetrying: boolean;
	onRetry: () => void;
};

/**
 * Shown in place of the period picker + purchase CTA when payments are live
 * but the store returned no packages (offerings fetch failed or products
 * unresolvable). Never present a purchasable-looking button that does
 * nothing — that reads as a bug (App Review Guideline 2.1) and strands real
 * users on transient App Store / network failures.
 */
export function PaywallPlansUnavailable({ isRetrying, onRetry }: Props) {
	const accentForeground = useThemeColor("accent-foreground") as string;

	return (
		<View className="gap-4">
			<View
				className="items-center gap-1 rounded-2xl border border-border bg-surface px-4 py-4"
				style={styles.borderCurve}
			>
				<AppText className="font-semibold text-[15px] text-foreground">
					Plans are temporarily unavailable
				</AppText>
				<AppText className="text-center text-[12px] text-muted leading-4">
					We couldn&apos;t reach the App Store. Check your connection and try
					again.
				</AppText>
			</View>

			<Button
				accessibilityLabel="Try again"
				accessibilityRole="button"
				className={`rounded-2xl${isRetrying ? "self-center" : "w-full"}`}
				isDisabled={isRetrying}
				isIconOnly={isRetrying}
				layout={LinearTransition.springify()}
				onPress={onRetry}
				size="lg"
				variant="primary"
			>
				{isRetrying ? (
					<Spinner color={accentForeground} entering={SPINNER_ENTERING} />
				) : (
					<Button.Label className="font-medium text-base">
						Try again
					</Button.Label>
				)}
			</Button>
		</View>
	);
}

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
});
