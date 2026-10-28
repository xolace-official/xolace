import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Stack, useRouter } from "expo-router";
import { Button, PressableFeedback, Skeleton, useToast } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { XolacerAvatar } from "@/features/xolacer-chat/components/xolacer-avatar";
import { playSoftPress } from "@/lib/haptics";
import { RatingPicker } from "./rating-stars";

const HEADER_OPTIONS = {
	headerBackButtonDisplayMode: "minimal",
	headerShadowVisible: false,
	headerShown: true,
	headerTitle: "",
	headerTransparent: true,
} as const;

/** Where a rating is given, from the profile card, thread menu or status bar. Rateable while
 * live (`canRate`); only the seeker and Xolace see the number. */
export function RateConversationScreen({
	conversationId,
}: {
	conversationId: string;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { toast } = useToast();
	const conversation = useQuery(api.xolacerChat.getConversation, {
		conversationId: conversationId as Id<"xolacer_conversations">,
	});
	const rateConversation = useMutation(api.xolacerChat.rateConversation);
	const [choice, setChoice] = useState<number | undefined>(undefined);

	if (conversation === undefined) {
		return (
			<View className="flex-1 items-center justify-center gap-4 bg-background px-10">
				<Stack.Screen options={HEADER_OPTIONS} />
				<Skeleton className="h-14.5 w-14.5 rounded-full" />
				<Skeleton className="h-6 w-56 rounded-lg" />
				<Skeleton className="h-10 w-48 rounded-lg" />
			</View>
		);
	}

	// Gone, or not enough of it to judge: say so rather than show an empty prompt.
	if (conversation === null || !conversation.canRate) {
		return (
			<View className="flex-1 items-center justify-center gap-2 bg-background px-10">
				<Stack.Screen options={HEADER_OPTIONS} />
				<AppText className="font-semibold text-[15px] text-foreground">
					Nothing to rate here
				</AppText>
				<AppText className="text-center text-[13px] text-muted leading-5">
					Ratings only come from conversations where messages were actually
					exchanged.
				</AppText>
			</View>
		);
	}

	const rating = choice ?? conversation.myRating;

	const handleSend = () => {
		if (rating === undefined) {
			return;
		}
		playSoftPress();
		rateConversation({ conversationId: conversation.id, rating })
			.then(() => {
				toast.show({ label: "Thanks — that stays between you and Xolace." });
				router.back();
			})
			.catch(() => toast.show({ label: "Couldn't send that. Try again." }));
	};

	return (
		<View
			className="flex-1 items-center justify-center gap-4 bg-background px-8"
			style={{
				paddingBottom: Math.max(insets.bottom, 24),
				paddingTop: insets.top,
			}}
		>
			<Stack.Screen options={HEADER_OPTIONS} />

			<XolacerAvatar
				name={conversation.counterpartName}
				photoUrl={conversation.counterpartPhotoUrl}
				size="lg"
			/>

			<AppText className="text-center font-serif text-[21px] text-foreground leading-7">
				How was this conversation?
			</AppText>

			<AppText className="max-w-65 text-center text-[13px] text-muted leading-5">
				Only you and Xolace see this. {conversation.counterpartName} sees an
				overall score, never which conversation it came from.
			</AppText>

			<View className="py-2">
				<RatingPicker onSelect={setChoice} value={rating} />
			</View>

			<View className="w-full gap-3 pt-2">
				<Button isDisabled={rating === undefined} onPress={handleSend}>
					{conversation.myRating === undefined ? "Send" : "Update"}
				</Button>
				<PressableFeedback
					accessibilityLabel="Skip rating"
					accessibilityRole="button"
					onPress={() => {
						playSoftPress();
						router.back();
					}}
				>
					<AppText className="text-center text-[13px] text-muted underline">
						Skip
					</AppText>
				</PressableFeedback>
			</View>
		</View>
	);
}
