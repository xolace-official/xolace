import { Button, Spinner, Surface, useThemeColor } from "heroui-native";
import { StyleSheet, View } from "react-native";
import { FadeIn, LinearTransition } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/utils";

const SPINNER_ENTERING = FadeIn.delay(50);

type Props = {
	isRetrying: boolean;
	onRetry: () => void;
};

/** Replaces the picker and CTA when the store returned no packages; a dead purchase button
 * fails App Review 2.1. */
export function PaywallPlansUnavailable({ isRetrying, onRetry }: Props) {
	const accentForeground = useThemeColor("accent-foreground") as string;

	return (
		<View className="gap-4">
			<Surface
				className="items-center gap-1 rounded-2xl px-4 py-4"
				style={styles.borderCurve}
			>
				<AppText className="font-semibold text-[15px] text-foreground">
					Plans are temporarily unavailable
				</AppText>
				<AppText className="text-center text-[12px] text-muted leading-4">
					We couldn&apos;t reach the App Store. Check your connection and try
					again.
				</AppText>
			</Surface>

			<Button
				accessibilityLabel="Try again"
				accessibilityRole="button"
				className={cn("rounded-2xl", isRetrying ? "self-center" : "w-full")}
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
