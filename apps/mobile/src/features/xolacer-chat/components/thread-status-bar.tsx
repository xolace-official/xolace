import { api } from "@xolace/backend/convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { Button, PressableFeedback, useToast } from "heroui-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import {
	acceptFailureLabel,
	chatLimitError,
} from "@/features/xolacer-chat/utils";
import { playSoftPress } from "@/lib/haptics";
import type { ThreadConversation } from "./thread-screen";

/** Takes the composer's place when a conversation cannot take a message and says what tapping
 * will do. */
export function ThreadStatusBar({
	conversation,
}: {
	conversation: ThreadConversation;
}) {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { toast } = useToast();
	const acceptRequest = useAction(api.xolacerChat.acceptRequest);
	const declineRequest = useMutation(api.xolacerChat.declineRequest);
	const resumeConversation = useMutation(api.xolacerChat.resumeConversation);

	const padBottom = Math.max(insets.bottom, 14);

	// Open and requested read nothing the list didn't already carry. The rest
	// hold an empty bar until the row lands — see `ThreadConversation.seeded`.
	if (conversation.seeded && conversation.status !== "requested") {
		return <Bar padBottom={padBottom} />;
	}

	const handleAccept = () => {
		playSoftPress();
		acceptRequest({ conversationId: conversation.id }).catch((error: unknown) =>
			toast.show({ label: acceptFailureLabel(error) })
		);
	};

	const handleDecline = () => {
		playSoftPress();
		declineRequest({ conversationId: conversation.id })
			.then(() => router.back())
			.catch(() => toast.show({ label: "Couldn't decline. Try again." }));
	};

	const handleResume = () => {
		playSoftPress();
		resumeConversation({ conversationId: conversation.id })
			.then((result) => {
				if (!result.resumed) {
					toast.show({ label: "This one has gone quiet on their end too." });
				}
			})
			.catch((error: unknown) => {
				const limit = chatLimitError(error);
				toast.show({
					label:
						limit?.code === "open_conversation_limit"
							? `You've got ${limit.max ?? 3} conversations open. Let one rest before picking this back up.`
							: "Couldn't pick this back up. Try again.",
				});
			});
	};

	const goToRoster = () => {
		playSoftPress();
		// The tab surface is a sibling stack entry, so replace rather than stack.
		router.replace("/connect");
	};

	if (conversation.status === "requested") {
		return (
			<Bar padBottom={padBottom}>
				{conversation.role === "xolacer" ? (
					<>
						<Copy>
							<Bold>{conversation.counterpartName}</Bold> asked to talk.{" "}
							{conversation.counterpartPresent ? (
								<>
									<Bold>They&apos;re still in the app right now</Bold> —
									accepting opens a conversation only the two of you can see.
								</>
							) : (
								<>Accepting opens a conversation only the two of you can see.</>
							)}
						</Copy>
						<View className="flex-row gap-2">
							<Button className="flex-1" onPress={handleAccept}>
								Accept
							</Button>
							<Button
								className="flex-1"
								onPress={handleDecline}
								variant="secondary"
							>
								Not right now
							</Button>
						</View>
					</>
				) : (
					<Copy>
						{conversation.counterpartPresent ? (
							<>
								Request sent.{" "}
								<Bold>{conversation.counterpartName} is here right now</Bold> —
								they can accept it whenever they see it.
							</>
						) : (
							<>
								Request sent.{" "}
								<Bold>
									{conversation.counterpartName} has stepped away for now
								</Bold>{" "}
								— a notification will reach them, and they can accept when they
								have space.
							</>
						)}
					</Copy>
				)}
			</Bar>
		);
	}

	if (conversation.status === "resting" && conversation.resumable) {
		const manual = conversation.restingReason === "manual";
		return (
			<Bar padBottom={padBottom}>
				<Copy>
					{manual ? (
						conversation.role === "xolacer" ? (
							<>
								You wrapped this one up. <Bold>Nothing was deleted</Bold> —
								picking it back up doesn&apos;t need a new request.
							</>
						) : (
							<>
								<Bold>{conversation.counterpartName} wrapped this one up</Bold>{" "}
								— nothing to do with you. Everything you wrote is still here,
								and picking it back up doesn&apos;t need a new request.
							</>
						)
					) : (
						<>
							This one&apos;s gone quiet.{" "}
							<Bold>{conversation.counterpartName} is still here</Bold> —
							picking it up doesn&apos;t need a new request.
						</>
					)}
				</Copy>
				<Button onPress={handleResume}>Pick this back up</Button>
				<RatePrompt conversation={conversation} />
			</Bar>
		);
	}

	// Resting-but-not-resumable and closed share one screen, identical for every
	// reason: a blocked person is never told, and a declined seeker never learns
	// which. "Still here" is only promised where a channel ever opened.
	const hasHistory = Boolean(conversation.streamChannelId);

	if (conversation.role === "xolacer") {
		return (
			<Bar padBottom={padBottom}>
				<Copy>
					{hasHistory ? (
						<>
							This conversation is closed.{" "}
							<Bold>Everything you two wrote is still here</Bold>.
						</>
					) : (
						<>This request is closed. Nothing was sent either way.</>
					)}
				</Copy>
			</Bar>
		);
	}

	return (
		<Bar padBottom={padBottom}>
			<Copy>
				{hasHistory ? (
					<>
						{conversation.counterpartName} has stepped back for now. Nothing to
						do with you — <Bold>everything you two wrote is still here</Bold>.
					</>
				) : (
					<>
						{conversation.counterpartName} isn&apos;t able to pick this one up.{" "}
						<Bold>Nothing to do with you</Bold> — it happens, and there are
						others here.
					</>
				)}
			</Copy>
			<Button onPress={goToRoster} variant="secondary">
				Find another Xolacer
			</Button>
			<RatePrompt conversation={conversation} />
		</Bar>
	);
}

/** Wind-down entry to the rating prompt; the profile's rate card is the prominent one, so this
 * stays a link. */
function RatePrompt({ conversation }: { conversation: ThreadConversation }) {
	const router = useRouter();
	if (!conversation.canRate) {
		return null;
	}

	return (
		<PressableFeedback
			accessibilityLabel="Rate this conversation"
			accessibilityRole="button"
			onPress={() => {
				playSoftPress();
				router.push({
					params: { conversationId: conversation.id },
					pathname: "/rate/[conversationId]",
				});
			}}
		>
			<AppText className="pt-0.5 text-center text-muted text-xs underline">
				{conversation.myRating === undefined
					? "How was this conversation?"
					: "Change how you rated this"}
			</AppText>
		</PressableFeedback>
	);
}

function Bar({
	children,
	padBottom,
}: {
	children?: React.ReactNode;
	padBottom: number;
}) {
	return (
		<View
			className="gap-2.5 border-border/40 border-t bg-background px-4 pt-3"
			style={{ paddingBottom: padBottom }}
		>
			{children}
		</View>
	);
}

function Copy({ children }: { children: React.ReactNode }) {
	return (
		<AppText className="text-center text-muted text-xs leading-5">
			{children}
		</AppText>
	);
}

function Bold({ children }: { children: React.ReactNode }) {
	return (
		<AppText className="font-semibold text-foreground">{children}</AppText>
	);
}
