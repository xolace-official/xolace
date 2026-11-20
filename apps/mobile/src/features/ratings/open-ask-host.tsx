import { type OpenAskProps, useOpenAsk } from "./use-open-ask";

/**
 * The plain-open ask, kept above the stack while signed in (`ROOT_HOSTS`): it draws nothing and
 * navigates to What's New or the rating screen when an open calls for one.
 */
export function OpenAskHost(props: OpenAskProps) {
	useOpenAsk(props);
	return null;
}
