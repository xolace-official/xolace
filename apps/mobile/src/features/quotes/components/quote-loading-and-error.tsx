import { PressableFeedback, SkeletonGroup } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	PLATE_GAP,
	PLATE_HEIGHT,
	usePosterBoxHeight,
} from "@/features/quotes/components/poster/poster-body";

/** Cold start and error render as the poster box (#294), so nothing reflows when the quote
 * arrives. */
export function QuoteLoadingAndError({
	coldStartError,
	onRetry,
}: {
	coldStartError: boolean;
	onRetry: () => void;
}) {
	const boxStyle = { height: usePosterBoxHeight() };

	if (coldStartError) {
		return (
			<View className="items-center justify-center gap-4" style={boxStyle}>
				<AppText className="font-poster-body text-poster-ink-faint">
					Something went wrong.
				</AppText>
				{/* Not a themed `Button`: on the fixed paper a themed foreground goes
			    white-on-white. */}
				<PressableFeedback
					accessibilityLabel="Retry"
					accessibilityRole="button"
					hitSlop={12}
					onPress={onRetry}
				>
					<AppText className="rounded-full bg-poster-plate px-4 py-2 font-poster-body text-poster-ink">
						Retry
					</AppText>
				</PressableFeedback>
			</View>
		);
	}

	return (
		<SkeletonGroup isLoading isSkeletonOnly>
			{/* The source line's row, or the card jumps when the quote lands. */}
			<SkeletonGroup.Item className="mb-2 h-3 w-2/3 self-center rounded-full" />
			{/* The title plate's row, reserved unconditionally: every curated quote carries a title
		    (#310). */}
			<SkeletonGroup.Item
				className="rounded-xl"
				style={{ height: PLATE_HEIGHT, marginBottom: PLATE_GAP }}
			/>
			<View className="justify-center" style={boxStyle}>
				<View className="gap-4">
					<SkeletonGroup.Item className="h-9 rounded-xl" />
					<SkeletonGroup.Item className="h-9 w-4/5 rounded-xl" />
					<SkeletonGroup.Item className="h-9 w-2/3 rounded-xl" />
				</View>
			</View>
		</SkeletonGroup>
	);
}
