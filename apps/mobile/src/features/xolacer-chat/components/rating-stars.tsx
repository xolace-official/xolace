import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { playSoftPress } from "@/lib/haptics";

// Empty stars are the same glyph washed out, not an outline — an outlined
// star next to filled ones reads as a rating scale, which is what it is.
const FILLED = { android: "star", ios: "star.fill", web: "star" } as const;
const VALUES = [1, 2, 3, 4, 5];

/**
 * Stars use the `warning` token rather than a new `--star` one: it's already
 * the amber every theme defines, and adding a token to eleven theme files for
 * one component is not worth the drift risk.
 */
function useStarColors() {
	// useThemeColor resolves oklch tokens to 6-digit hex, so appending an alpha
	// pair is a valid colour — that's how the empty star gets its wash.
	const muted = useThemeColor("muted") as string;
	return { off: `${muted}30`, on: useThemeColor("warning") as string };
}

/**
 * Read-only rating for roster rows. Renders nothing without an average — the
 * 5-rating display threshold is enforced server-side, so an absent `rating`
 * means "not enough yet" and the caller shows a "New xolacer" chip instead.
 * A row of grey stars would read as a bad score, which is the opposite of true.
 */
export function RatingStars({
	rating,
	ratingCount,
}: {
	rating?: number;
	ratingCount: number;
}) {
	const { on, off } = useStarColors();
	if (rating === undefined) {
		return null;
	}

	return (
		<View
			accessibilityLabel={`Rated ${rating.toFixed(1)} out of 5 across ${ratingCount} conversations`}
			accessibilityRole="text"
			className="flex-row items-center gap-1"
		>
			<View className="flex-row gap-px">
				{VALUES.map((star) => (
					<SymbolView
						key={star}
						name={FILLED}
						size={10}
						tintColor={star <= Math.round(rating) ? on : off}
					/>
				))}
			</View>
			<AppText className="font-semibold text-[11px] text-foreground tabular-nums">
				{rating.toFixed(1)}
			</AppText>
		</View>
	);
}

/** The five-star picker on the rating prompt. */
export function RatingPicker({
	value,
	onSelect,
}: {
	value?: number;
	onSelect: (rating: number) => void;
}) {
	const { on, off } = useStarColors();

	return (
		<View className="flex-row justify-center gap-2.5">
			{VALUES.map((star) => {
				const filled = value !== undefined && star <= value;
				return (
					<PressableFeedback
						accessibilityLabel={`Rate ${star} out of 5`}
						accessibilityRole="button"
						accessibilityState={{ selected: filled }}
						hitSlop={8}
						key={star}
						onPress={() => {
							playSoftPress();
							onSelect(star);
						}}
					>
						<SymbolView name={FILLED} size={32} tintColor={filled ? on : off} />
					</PressableFeedback>
				);
			})}
		</View>
	);
}

/** Placeholder where the stars go before a xolacer has five ratings. */
export function NewXolacerChip() {
	return (
		<View className="rounded-full bg-surface-tertiary px-2 py-0.5">
			<AppText className="font-semibold text-[10px] text-muted uppercase tracking-wide">
				New Xolacer
			</AppText>
		</View>
	);
}
