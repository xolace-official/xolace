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
		message: { ...message, text: body },
		onLink: openLink,
		onLongPress,
		onPress,
		preventPress,
		semantics: theme.semantics,
	});
}
