// Model call for the follow-up check-in card (#534: model calls live under
// convex/ai/). Throws on API failure; the caller owns the fallback card.

import {
	extractTextFromResponse,
	FOLLOW_UP_CARD_MODEL,
	getAnthropicClient,
	thinkingOff,
} from "./providers/anthropic";

export async function writeFollowUpCard(prompt: {
	system: string;
	user: string;
}): Promise<string> {
	const response = await getAnthropicClient().messages.create({
		max_tokens: 120,
		messages: [{ content: prompt.user, role: "user" }],
		model: FOLLOW_UP_CARD_MODEL,
		system: prompt.system,
		thinking: thinkingOff(FOLLOW_UP_CARD_MODEL),
	});
	return extractTextFromResponse(response);
}
