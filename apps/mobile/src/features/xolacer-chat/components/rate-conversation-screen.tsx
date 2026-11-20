import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { type ReactNode, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { CtaButton } from "@/components/shared/cta-button";
import { PressScale } from "@/components/shared/press-scale";
import { Bone, SkeletonBreath } from "@/components/shared/skeleton";
import { toast } from "@/components/shared/toast";
import { XolacerAvatar } from "@/features/xolacer-chat/components/xolacer-avatar";
import { playSoftPress } from "@/lib/haptics";
import { RatingPicker } from "./rating-stars";

/** The Peers report sheet's measures: 26 on top, 18 under, rows 22 in. */
const SHEET_BOTTOM = 18;

/** Where a rating is given, from the profile card, thread menu or status bar: a sheet sized to
 * its content. Rateable while live (`canRate`); only the seeker and Xolace see the number. */
export function RateConversationScreen({
	conversationId,
}: {
	conversationId: string;
}) {
	const router = useRouter();
	const conversation = useQuery(api.xolacerChat.getConversation, {
		conversationId: conversationId as Id<"xolacer_conversations">,
	});
	const rateConversation = useMutation(api.xolacerChat.rateConversation);
	const [choice, setChoice] = useState<number | undefined>(undefined);

	if (conversation === undefined) {
		return (
			<Sheet>
				<SkeletonBreath className="items-center gap-4 py-6" label="Loading">
					<Bone h={76} r={38} w={76} />
					<Bone h={24} w={224} />
					<Bone h={40} r={12} w={192} />
				</SkeletonBreath>
			</Sheet>
		);
	}

	// Gone, or not enough of it to judge: say so rather than show an empty prompt.
	if (conversation === null || !conversation.canRate) {
		return (
			<Sheet>
				<View className="gap-2 px-[22px] py-6">
					<AppText accessibilityRole="header" center variant="headline">
						Nothing to rate here
					</AppText>
					<AppText center color="muted" variant="footnote">
						Ratings only come from conversations where messages were actually
						exchanged.
					</AppText>
				</View>
			</Sheet>
		);
	}

	const rating = choice ?? conversation.myRating;

	const handleSend = () => {
		if (rating === undefined) {
			return;
		}
		rateConversation({ conversationId: conversation.id, rating })
			.then(() => {
				toast("Thanks — that stays between you and Xolace.");
				router.back();
			})
			.catch(() => toast("Couldn't send that. Try again."));
	};

	return (
		<Sheet>
			<View className="items-center px-[22px]">
				<XolacerAvatar
					name={conversation.counterpartName}
					photoUrl={conversation.counterpartPhotoUrl}
					size="lg"
				/>
				<AppText
					accessibilityRole="header"
					center
					className="pt-4"
					variant="headline"
				>
					How was this conversation?
				</AppText>
				<AppText center className="pt-2" color="muted" variant="footnote">
					Only you and Xolace see this. {conversation.counterpartName} sees an
					overall score, never which conversation it came from.
				</AppText>
				<View className="py-6">
					<RatingPicker onSelect={setChoice} value={rating} />
				</View>
			</View>
			<View className="px-[22px]">
				<CtaButton
					disabled={rating === undefined}
					haptic={playSoftPress}
					label={conversation.myRating === undefined ? "Send" : "Update"}
					onPress={handleSend}
				/>
			</View>
			<View className="mx-[22px] mt-3 mb-1.5 h-px bg-separator" />
			<PressScale
				accessibilityLabel="Skip rating"
				className="h-12 justify-center px-[22px]"
				haptic={playSoftPress}
				onPress={() => router.back()}
			>
				<AppText center color="subtle" variant="body">
					Skip
				</AppText>
			</PressScale>
		</Sheet>
	);
}

/** The report sheet's frame: content-sized, 26 on top, clear of the home indicator. */
function Sheet({ children }: { children: ReactNode }) {
	const insets = useSafeAreaInsets();
	return (
		<View
			className="pt-[26px]"
			style={{ paddingBottom: Math.max(insets.bottom, SHEET_BOTTOM) }}
		>
			{children}
		</View>
	);
}
