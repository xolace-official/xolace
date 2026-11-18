/**
 * A post's body through Stream's own text renderer, as production's bubble drew it: links open,
 * and **bold**, _italic_, lists and quotes render, in the card's type and colours instead of a
 * bubble's. Stream's link press goes through the message's handlers, so a tap opens the link and
 * a hold on one opens the overlay.
 */
import type { ReactNode } from "react";
import { Linking } from "react-native";
import { renderText, useMessageContext, useTheme } from "stream-chat-expo";
import { useResolveClassNames } from "uniwind";
import { isOpenableLink } from "../post-text";

/** Stream's own tap (check, then open), for the links a post may open; others do nothing.
 * Stream doesn't catch what this returns, so a link the phone won't open stops here. */
async function openLink(url: string): Promise<void> {
	try {
		if (isOpenableLink(url) && (await Linking.canOpenURL(url))) {
			await Linking.openURL(url);
		}
	} catch (error) {
		if (__DEV__) {
			console.error("[connect] channel link failed", error);
		}
	}
}

export function usePostBody(body: string): ReactNode {
	const { message, onLongPress, onPress, preventPress } = useMessageContext();
	const { theme } = useTheme();
	const text = useResolveClassNames(
		"font-normal type-callout leading-[22px] text-muted"
	);
	const strong = useResolveClassNames("font-semibold text-foreground");
	const em = useResolveClassNames("font-italic");
	const link = useResolveClassNames("text-accent-ink underline");
	if (!body) {
		return null;
	}
	return renderText({
		markdownStyles: {
			autolink: { ...text, ...link },
			em,
			paragraph: text,
			strong,
			text,
		},
		// The body only: the title above it is the post's first paragraph.
		message: { ...message, text: body },
		onLink: openLink,
		onLongPress,
		onPress,
		preventPress,
		semantics: theme.semantics,
	});
}
