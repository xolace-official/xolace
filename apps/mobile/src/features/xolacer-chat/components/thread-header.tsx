import { useRouter } from "expo-router";
import { PressableFeedback } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { XolacerAvatar } from "@/features/xolacer-chat/components/xolacer-avatar";
import { playSoftPress } from "@/lib/haptics";
import { formatLongAgo } from "../format-time";
import type { ThreadConversation } from "./thread-screen";
import {
	type CounterpartPresence,
	useCounterpartActivity,
} from "./use-counterpart-activity";

/** Once a thread is `open` the socket is live, so a real presence signal replaces the
 * response-norm copy. */
function openSubtitle(
	role: ThreadConversation["role"],
	activity: {
		typing: boolean;
		presence: CounterpartPresence | null;
	}
): string {
	const who = role === "user" ? "Xolacer" : null;
	if (activity.typing) {
		return who ? `${who} · typing…` : "typing…";
	}
	if (!activity.presence) {
		return who
			? `${who} · usually replies within a day`
			: "Usually replies within a day";
	}
	if (activity.presence.online) {
		return who ? `${who} · online` : "Online";
	}
	const lastActive = activity.presence.lastActive;
	const suffix = lastActive
		? `last here ${formatLongAgo(lastActive)}`
		: "offline";
	return who ? `${who} · ${suffix}` : suffix;
}

function subtitleFor(conversation: ThreadConversation): string {
	if (conversation.status === "requested") {
		if (conversation.role !== "xolacer") {
			return "Request sent, no reply yet";
		}

		return conversation.origin === "suggestion"
			? "Waiting on you · just after a session"
			: "Waiting on you";
	}
	if (conversation.status === "resting") {
		return conversation.lastMessageAt
			? `Resting · last spoke ${formatLongAgo(conversation.lastMessageAt)}`
			: "Resting";
	}
	if (conversation.status === "closed") {
		return conversation.role === "xolacer"
			? "This request is closed"
			: "Not taking conversations right now";
	}
	return "";
}

/** Rendered into the native header's title slot; a sibling of `<Channel>`, so
 * `useCounterpartActivity` reads the channel directly. */
export function ThreadHeader({
	conversation,
}: {
	conversation: ThreadConversation;
}) {
	const router = useRouter();
	const activity = useCounterpartActivity(
		conversation.status === "open" ? conversation.streamChannelId : undefined,
		conversation.counterpartProfileId
	);
	const dim = conversation.status !== "open";
	const subtitle =
		conversation.status === "open"
			? openSubtitle(conversation.role, activity)
			: subtitleFor(conversation);

	const identity = (
		<View className="flex-row items-center gap-2.5">
			<XolacerAvatar
				muted={dim}
				name={conversation.counterpartName}
				photoUrl={conversation.counterpartPhotoUrl}
				size="sm"
			/>
			<View className="min-w-0 shrink">
				<AppText
					className="font-semibold text-foreground text-sm"
					numberOfLines={1}
				>
					{conversation.counterpartName}
				</AppText>
				<AppText className="mt-px text-[11px] text-muted" numberOfLines={1}>
					{subtitle}
				</AppText>
			</View>
		</View>
	);

	// Only the seeker's side is tappable: the counterpart there is a Xolacer with
	// a public profile. A Xolacer looking at a seeker has nowhere to go.
	if (conversation.role !== "user") {
		return identity;
	}

	return (
		<PressableFeedback
			accessibilityLabel={`View ${conversation.counterpartName}'s profile`}
			accessibilityRole="button"
			onPress={() => {
				playSoftPress();
				router.push({
					params: { profileId: conversation.counterpartProfileId },
					pathname: "/xolacer/[profileId]",
				});
			}}
		>
			{identity}
		</PressableFeedback>
	);
}
