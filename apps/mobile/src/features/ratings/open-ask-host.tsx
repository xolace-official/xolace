import { type OpenAskProps, useOpenAsk } from "./use-open-ask";

export function OpenAskHost(props: OpenAskProps) {
	useOpenAsk(props);
	return null;
}
