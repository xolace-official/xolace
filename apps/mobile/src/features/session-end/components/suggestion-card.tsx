import { specialtyListensTo } from "@xolace/backend/convex/lib/specialties";
import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	NewXolacerChip,
	RatingStars,
} from "@/features/xolacer-chat/components/rating-stars";
import { XolacerAvatar } from "@/features/xolacer-chat/components/xolacer-avatar";

type Props = {
	displayName: string;
	photoUrl?: string;
	specialty: string;
	rating?: number;
	ratingCount: number;
	onPress: () => void;
};

/**
 * The close-phase offer when a session is suggestion-eligible: one named
 * xolacer, in the slot the Bridge card holds otherwise.
 *
 * Copy is deliberately a fact about what this person declared, never a claim
 * that they fit *this* user — at the current roster size a named suggestion is
 * close to "whoever declared this specialty", and the card must not overclaim.
 * It also avoids the Bridge card's "Suggested for you" sparkle chip: this must
 * not read as an algorithmic assignment of a human being.
 */
export const SuggestionCard = ({
	displayName,
	photoUrl,
	specialty,
	rating,
	ratingCount,
	onPress,
}: Props) => {
	const accentColor = useThemeColor("accent") as string;

	return (
		<PressableFeedback
			// Carries the disclosure, not just the name: PressableFeedback groups its
			// children into one node, so the "trained peer, not a therapist" line
			// below is never read otherwise — and that line is the whole basis for
			// what someone is agreeing to walk into.
			accessibilityLabel={`${displayName} listens to ${specialtyListensTo(specialty)}. A trained peer, not a therapist. Opens their profile — nothing is sent.`}
			accessibilityRole="button"
			className="w-full overflow-hidden rounded-3xl border border-accent/30 bg-accent/[0.07] p-5"
			onPress={onPress}
		>
			<PressableFeedback.Highlight
				animation={{
					backgroundColor: { value: accentColor },
					opacity: { value: [0, 0.08] },
				}}
			/>

			{/* Face first — the card offers a person, not a category. */}
			<View className="mb-4 flex-row items-center justify-between">
				<XolacerAvatar name={displayName} photoUrl={photoUrl} />
				{rating === undefined ? (
					<NewXolacerChip />
				) : (
					<RatingStars rating={rating} ratingCount={ratingCount} />
				)}
			</View>

			<AppText className="mb-1.5 font-serif text-foreground text-xl leading-7">
				{displayName} listens to {specialtyListensTo(specialty)}.
			</AppText>
			<AppText className="font-light text-foreground/55 text-sm leading-5">
				A trained peer, not a therapist. Nothing is sent — this only opens their
				profile.
			</AppText>

			<View className="mt-4 mb-3 h-px bg-accent/15" />
			<View className="flex-row items-center justify-between">
				<AppText className="font-medium text-accent text-sm">
					Read their profile
				</AppText>
				<SymbolView
					name={{
						android: "arrow_forward",
						ios: "arrow.right",
						web: "arrow_forward",
					}}
					size={14}
					tintColor={accentColor}
				/>
			</View>
		</PressableFeedback>
	);
};
