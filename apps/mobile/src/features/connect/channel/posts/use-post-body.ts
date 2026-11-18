/**
 * A post's body through Stream's own text renderer, as production's bubble drew it: links open,
 * and **bold**, _italic_, lists and quotes render, in the card's type and colours instead of a
 * bubble's. Stream's link press goes through the message's handlers, so a tap opens the link and
 * a hold on one opens the overlay.
 */
import { createElement, Fragment, type ReactNode } from "react";
import { Linking, type TextStyle } from "react-native";
import {
	type RenderTextParams,
	renderText,
	useMessageContext,
	useTheme,
} from "stream-chat-expo";
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

type Rules = NonNullable<RenderTextParams["markdownRules"]>;
type Mark = "em" | "strong";
type Face = TextStyle;

/** Bold and italic each set the face, so under both one would replace the other. Stream's text
 * takes its style from the marks around it (`state.style`), so these marks only set that:
 * bold, italic, or under both the heaviest italic the app loads (no pair ships a semibold
 * italic). */
function emphasis(em: Face, strong: Face, both: Face): Rules {
	const mark =
		(own: Mark, face: Face): NonNullable<Rules["em"]>["react"] =>
		(node, output, state) =>
			createElement(
				Fragment,
				{ key: state.key },
				output(node.content, {
					...state,
					[own]: true,
					style: {
						...state.style,
						...(state[own === "em" ? "strong" : "em"] ? both : face),
					},
					withinText: true,
				})
			);
	// Only `react`: Stream's markdown merges these over its own rules, which match and parse.
	return {
		em: { react: mark("em", em) },
		strong: { react: mark("strong", strong) },
	} as Rules;
}

export function usePostBody(body: string): ReactNode {
	const { message, onLongPress, onPress, preventPress } = useMessageContext();
	const { theme } = useTheme();
	const text = useResolveClassNames(
		"font-normal type-callout leading-[22px] text-muted"
	);
	const strong = useResolveClassNames("font-semibold text-foreground");
	const em = useResolveClassNames("font-italic");
	const both = useResolveClassNames("font-italic-medium text-foreground");
	const link = useResolveClassNames("text-accent-ink underline");
	if (!body) {
		return null;
	}
	return renderText({
		markdownRules: emphasis(em, strong, both),
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
