import { View } from "react-native";
import { useTypingContext } from "stream-chat-expo";
import { EASING, EaseView } from "@/design/ease";
import { loopProps } from "@/design/ease-loops";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { resolveMessageIdentity } from "../../chat-rules";
import { useConversationIdentity } from "./message-identity";

/** The dots pulse 150 ms apart: .3 ↔ 1, 300 ms each way (an Ease loop). Reduced: still at .3. */
const DOT_HALF_MS = 300;
const DOT_STAGGER_MS = 150;
const DOTS = [0, 1, 2];

function Dot({ index, reduced }: { index: number; reduced: boolean }) {
	return (
		<EaseView
			className="size-1.75 rounded-[4px] bg-foreground"
			{...loopProps({
				delay: index * DOT_STAGGER_MS,
				easing: EASING.inOutQuad,
				from: { opacity: 0.3 },
				periodMs: DOT_HALF_MS * 2,
				reduced,
				to: { opacity: 1 },
			})}
		/>
	);
}

/**
 * Replaces Stream's `TypingIndicator` (raw Stream avatar, no override slot) with the prototype's
 * three dots in a bubble. Shown only for the counterpart (`resolveMessageIdentity`); Stream
 * already filters the local user out.
 */
export function ConversationTypingIndicator() {
	const { typing } = useTypingContext();
	const identity = useConversationIdentity();
	const reduced = useEffectiveReducedMotion();
	if (!identity) {
		return null;
	}
	const counterpart = Object.values(typing)
		.map((event) =>
			resolveMessageIdentity(event.user?.id, identity.conversation)
		)
		.find((resolved) => resolved !== null);
	if (!counterpart) {
		return null;
	}
	return (
		<View
			accessibilityLabel={`${counterpart.name} is typing`}
			accessible
			className="mx-3.5 my-1 flex-row gap-1.25 self-start rounded-[20px] bg-surface-secondary px-4 py-3.5"
		>
			{DOTS.map((i) => (
				// Keyed on `reduced`: an Ease loop restarts only on remount.
				<Dot index={i} key={`${i}-${reduced}`} reduced={reduced} />
			))}
		</View>
	);
}
